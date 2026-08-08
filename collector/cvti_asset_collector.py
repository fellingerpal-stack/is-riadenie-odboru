#!/usr/bin/env python3
"""CVTI Asset Collector v0.31.0

Defensive asset discovery for explicitly configured RFC1918 IPv4 ranges.
- TCP connect discovery on a small allow-list of ports.
- Optional SNMP Printer-MIB enrichment through local Net-SNMP CLI tools.
- No vulnerability testing, exploitation, credential guessing or internet-wide scanning.
- Uploads observations only to the configured Supabase discovery RPC.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import ipaddress
import json
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

VERSION = "0.31.0"
PRIVATE_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
]
DEFAULT_PORTS = [22, 80, 443, 445, 515, 631, 9100, 3389]
PORT_NAMES = {22: "SSH", 80: "HTTP", 443: "HTTPS", 445: "SMB", 515: "LPD", 631: "IPP", 9100: "RAW-PRINT", 3389: "RDP"}

SYS_DESCR = "1.3.6.1.2.1.1.1.0"
SYS_NAME = "1.3.6.1.2.1.1.5.0"
PRINTER_NAME = "1.3.6.1.2.1.43.5.1.1.16.1"
PRINTER_SERIAL = "1.3.6.1.2.1.43.5.1.1.17.1"
PRINTER_PAGE_COUNT = "1.3.6.1.2.1.43.10.2.1.4.1.1"
SUPPLY_DESC = "1.3.6.1.2.1.43.11.1.1.6"
SUPPLY_MAX = "1.3.6.1.2.1.43.11.1.1.8"
SUPPLY_LEVEL = "1.3.6.1.2.1.43.11.1.1.9"

BRANDS = [
    "Hewlett-Packard", "HP", "Canon", "Xerox", "Ricoh", "Kyocera", "Brother", "Epson", "Lexmark",
    "Konica Minolta", "Cisco", "Aruba", "Juniper", "Dell", "Lenovo", "Fujitsu", "APC", "Synology", "QNAP",
]

@dataclass
class Device:
    ip_address: str
    mac_address: str = ""
    hostname: str = ""
    device_type: str = "Neznáme zariadenie"
    manufacturer: str = ""
    model: str = ""
    serial_number: str = ""
    firmware: str = ""
    open_ports: list[int] | None = None
    snmp: dict[str, Any] | None = None
    details: dict[str, Any] | None = None

    def payload(self) -> dict[str, Any]:
        data = asdict(self)
        data["open_ports"] = self.open_ports or []
        data["snmp"] = self.snmp or {}
        data["details"] = self.details or {}
        return data


def load_config(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        config = json.load(handle)
    if not isinstance(config, dict):
        raise ValueError("Config musí byť JSON objekt.")
    return config


def allowed_network(value: str, max_hosts: int) -> ipaddress.IPv4Network:
    network = ipaddress.ip_network(value, strict=False)
    if not isinstance(network, ipaddress.IPv4Network):
        raise ValueError(f"v0.31 podporuje iba IPv4 CIDR: {value}")
    if not any(network.subnet_of(parent) for parent in PRIVATE_RANGES):
        raise ValueError(f"CIDR {value} nie je RFC1918 privátna sieť; collector ho odmietol.")
    if network.num_addresses > max_hosts + 2:
        raise ValueError(f"CIDR {value} má {network.num_addresses} adries; limit collectora je {max_hosts} hostov na rozsah.")
    return network


def tcp_probe(ip: str, port: int, timeout: float) -> bool:
    family = socket.AF_INET
    sock = socket.socket(family, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        return sock.connect_ex((ip, port)) == 0
    except OSError:
        return False
    finally:
        sock.close()


def reverse_dns(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0].split(".")[0]
    except (socket.herror, socket.gaierror, TimeoutError, OSError):
        return ""


def neighbor_mac(ip: str) -> str:
    system = platform.system().lower()
    commands: list[list[str]] = []
    if system == "windows":
        commands.append(["arp", "-a", ip])
    else:
        if shutil.which("ip"):
            commands.append(["ip", "neigh", "show", ip])
        commands.append(["arp", "-n", ip])
    for command in commands:
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=1.5, check=False)
        except (OSError, subprocess.TimeoutExpired):
            continue
        match = re.search(r"(?:lladdr\s+)?([0-9a-fA-F]{2}(?::|-)){5}[0-9a-fA-F]{2}", result.stdout)
        if match:
            return match.group(0).replace("-", ":").lower()
    return ""


def clean_snmp_value(value: str) -> str:
    text = value.strip().strip('"')
    if text in {"No Such Object available on this agent at this OID", "No Such Instance currently exists at this OID", "NULL"}:
        return ""
    return text


def snmp_get(ip: str, community: str, binary: str, timeout: float, oids: list[str]) -> list[str]:
    if not community or not shutil.which(binary):
        return []
    command = [binary, "-v2c", "-c", community, "-Oqv", "-t", str(max(0.2, timeout)), "-r", "0", ip, *oids]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=max(2.5, timeout * 4), check=False)
    except (OSError, subprocess.TimeoutExpired):
        return []
    if result.returncode != 0:
        return []
    return [clean_snmp_value(line) for line in result.stdout.splitlines()]


def snmp_walk(ip: str, community: str, binary: str, timeout: float, oid: str) -> list[str]:
    walk_binary = "snmpwalk" if binary == "snmpget" else binary.replace("snmpget", "snmpwalk")
    if not community or not shutil.which(walk_binary):
        return []
    command = [walk_binary, "-v2c", "-c", community, "-Oqv", "-t", str(max(0.2, timeout)), "-r", "0", ip, oid]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=max(4.0, timeout * 8), check=False)
    except (OSError, subprocess.TimeoutExpired):
        return []
    if result.returncode != 0:
        return []
    return [clean_snmp_value(line) for line in result.stdout.splitlines() if clean_snmp_value(line)]


def infer_brand(sys_descr: str) -> str:
    low = sys_descr.lower()
    for brand in BRANDS:
        if brand.lower() in low:
            return "HP" if brand == "Hewlett-Packard" else brand
    return ""


def classify_device(open_ports: list[int], sys_descr: str, printer_name: str, printer_serial: str) -> str:
    low = sys_descr.lower()
    if printer_name or printer_serial or 9100 in open_ports or 631 in open_ports or 515 in open_ports:
        if any(word in low for word in ["mfp", "multifunction", "multifunk", "imageclass", "imagerunner", "bizhub"]):
            return "MFP"
        return "Tlačiareň"
    if "firewall" in low or "fortigate" in low or "palo alto" in low:
        return "Firewall"
    if "switch" in low or "catalyst" in low:
        return "Switch"
    if "router" in low:
        return "Router"
    if "access point" in low or "wireless" in low or "aruba ap" in low:
        return "Wi-Fi AP"
    if "ups" in low or "smart-ups" in low:
        return "UPS"
    if "storage" in low or "synology" in low or "qnap" in low:
        return "Storage"
    if 3389 in open_ports or 445 in open_ports:
        return "Windows endpoint / server"
    if 22 in open_ports:
        return "Server / appliance"
    if 80 in open_ports or 443 in open_ports:
        return "Sieťové / embedded zariadenie"
    return "Neznáme zariadenie"


def enrich_snmp(ip: str, config: dict[str, Any], open_ports: list[int]) -> tuple[dict[str, Any], dict[str, Any], dict[str, str]]:
    snmp_cfg = config.get("snmp") if isinstance(config.get("snmp"), dict) else {}
    if not snmp_cfg or not snmp_cfg.get("enabled"):
        return {}, {}, {}
    community = os.environ.get(str(snmp_cfg.get("community_env") or "CVTI_SNMP_COMMUNITY"), "")
    binary = str(snmp_cfg.get("binary") or "snmpget")
    timeout = max(0.2, float(config.get("timeout_ms", 350)) / 1000.0)
    probe_all = bool(snmp_cfg.get("probe_all", False))
    likely_printer = any(port in open_ports for port in (515, 631, 9100))
    if not likely_printer and not probe_all:
        return {}, {}, {}

    values = snmp_get(ip, community, binary, timeout, [SYS_DESCR, SYS_NAME, PRINTER_NAME, PRINTER_SERIAL, PRINTER_PAGE_COUNT])
    if not values:
        return {}, {}, {}
    values += [""] * (5 - len(values))
    sys_descr, sys_name, printer_name, serial, page_count_raw = values[:5]
    page_count = int(page_count_raw) if page_count_raw.isdigit() else 0
    printer = bool(printer_name or serial or likely_printer)
    supplies: list[dict[str, Any]] = []
    if printer and bool(snmp_cfg.get("collect_supplies", True)):
        descriptions = snmp_walk(ip, community, binary, timeout, SUPPLY_DESC)
        maxima = snmp_walk(ip, community, binary, timeout, SUPPLY_MAX)
        levels = snmp_walk(ip, community, binary, timeout, SUPPLY_LEVEL)
        for index, name in enumerate(descriptions[:12]):
            try:
                maximum = int(maxima[index]) if index < len(maxima) else 0
                level = int(levels[index]) if index < len(levels) else 0
            except ValueError:
                maximum, level = 0, 0
            percent = round(level / maximum * 100) if maximum > 0 and level >= 0 else 0
            supplies.append({"name": name[:100], "level": level, "max": maximum, "percent": max(0, min(100, percent))})

    snmp = {"sys_descr": sys_descr, "sys_name": sys_name, "printer_name": printer_name}
    details = {"printer": printer, "page_count": page_count, "supplies": supplies}
    identity = {
        "hostname": sys_name.split(".")[0] if sys_name else "",
        "manufacturer": infer_brand(sys_descr),
        "model": printer_name or (sys_descr[:160] if sys_descr else ""),
        "serial_number": serial,
        "firmware": "",
        "sys_descr": sys_descr,
    }
    return snmp, details, identity


def scan_host(ip: str, config: dict[str, Any]) -> Device | None:
    timeout = max(0.1, min(3.0, float(config.get("timeout_ms", 350)) / 1000.0))
    ports = [int(port) for port in config.get("tcp_ports", DEFAULT_PORTS) if 1 <= int(port) <= 65535]
    open_ports = [port for port in ports if tcp_probe(ip, port, timeout)]
    snmp, details, identity = enrich_snmp(ip, config, open_ports)
    if not open_ports and not snmp:
        return None
    hostname = identity.get("hostname") or reverse_dns(ip)
    sys_descr = identity.get("sys_descr", "")
    device_type = classify_device(open_ports, sys_descr, identity.get("model", ""), identity.get("serial_number", ""))
    return Device(
        ip_address=ip,
        mac_address=neighbor_mac(ip),
        hostname=hostname,
        device_type=device_type,
        manufacturer=identity.get("manufacturer", ""),
        model=identity.get("model", ""),
        serial_number=identity.get("serial_number", ""),
        firmware=identity.get("firmware", ""),
        open_ports=open_ports,
        snmp=snmp,
        details={**details, "services": [PORT_NAMES.get(port, str(port)) for port in open_ports]},
    )


def post_discovery(config: dict[str, Any], devices: list[Device], cidrs: list[str], hosts_scanned: int) -> dict[str, Any]:
    url = str(config.get("supabase_url") or "").rstrip("/")
    collector_id = str(config.get("collector_id") or "")
    token_env = str(config.get("collector_token_env") or "CVTI_DISCOVERY_TOKEN")
    anon_env = str(config.get("supabase_anon_key_env") or "CVTI_SUPABASE_ANON_KEY")
    token = os.environ.get(token_env, "")
    anon_key = os.environ.get(anon_env, "")
    if not url or not collector_id or not token or not anon_key:
        raise RuntimeError(f"Chýba supabase_url, collector_id alebo environment secrets {token_env}/{anon_env}.")
    endpoint = f"{url}/rest/v1/rpc/ingest_discovery_batch"
    body = json.dumps({
        "p_collector_id": collector_id,
        "p_token": token,
        "p_run": {"cidrs": cidrs, "hosts_scanned": hosts_scanned, "hosts_found": len(devices), "status": "completed", "error": ""},
        "p_devices": [device.payload() for device in devices],
    }).encode("utf-8")
    request = urllib.request.Request(endpoint, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "apikey": anon_key,
        "User-Agent": f"CVTI-Asset-Collector/{VERSION}",
    })
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            text = response.read().decode("utf-8")
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase HTTP {exc.code}: {detail[:1000]}") from exc


def main() -> int:
    parser = argparse.ArgumentParser(description="CVTI Network Discovery / Asset Collector")
    parser.add_argument("--config", default="config.json", help="Cesta ku collector JSON configu")
    parser.add_argument("--dry-run", action="store_true", help="Nesielať do Supabase; vypísať JSON")
    parser.add_argument("--output", help="Voliteľný JSON súbor pre výsledok dry-run")
    args = parser.parse_args()

    config = load_config(Path(args.config))
    max_hosts = max(1, min(int(config.get("max_hosts_per_cidr", 4096)), 4096))
    networks = [allowed_network(str(value), max_hosts) for value in config.get("cidrs", [])]
    if not networks:
        raise ValueError("Config neobsahuje žiadny CIDR rozsah.")
    all_ips = [str(ip) for network in networks for ip in network.hosts()]
    if len(all_ips) > 10000:
        raise ValueError("Jeden run môže obsahovať maximálne 10 000 hostov. Rozdeľ discovery do viacerých collectorov/rozsahov.")

    workers = max(1, min(int(config.get("workers", 48)), 128))
    started = time.time()
    print(f"CVTI Asset Collector {VERSION}: skenujem {len(all_ips)} hostov v {len(networks)} CIDR rozsahoch, workers={workers}")
    devices: list[Device] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {executor.submit(scan_host, ip, config): ip for ip in all_ips}
        for index, future in enumerate(concurrent.futures.as_completed(future_map), start=1):
            ip = future_map[future]
            try:
                device = future.result()
                if device:
                    devices.append(device)
                    print(f"  + {ip:15} {device.device_type:28} {device.hostname or device.model}")
            except Exception as exc:  # collector pokračuje aj pri chybe jedného hosta
                print(f"  ! {ip}: {exc}", file=sys.stderr)
            if index % 250 == 0:
                print(f"  ... {index}/{len(all_ips)}")

    devices.sort(key=lambda item: tuple(int(part) for part in item.ip_address.split(".")))
    result = {"version": VERSION, "cidrs": [str(n) for n in networks], "hosts_scanned": len(all_ips), "hosts_found": len(devices), "duration_s": round(time.time()-started, 2), "devices": [d.payload() for d in devices]}
    if args.output:
        Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.dry_run:
        if not args.output:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    response = post_discovery(config, devices, [str(n) for n in networks], len(all_ips))
    print(f"Upload OK: {json.dumps(response, ensure_ascii=False)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Prerušené používateľom.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
