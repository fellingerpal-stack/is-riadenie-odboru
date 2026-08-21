#!/usr/bin/env python3
"""CVTI Asset Collector v0.31.2

Defensive asset discovery for explicitly configured RFC1918 IPv4 ranges.
- TCP connect discovery on a small allow-list of ports.
- Optional unauthenticated enrichment: reverse DNS, HTTP/HTTPS metadata, TLS fingerprint,
  SSH banner, local neighbor MAC and evidence-based device classification.
- Optional SNMP Printer-MIB enrichment through local Net-SNMP CLI tools.
- No vulnerability testing, exploitation, credential guessing or internet-wide scanning.
- Uploads observations only to the configured Supabase discovery RPC.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html
import ipaddress
import json
import os
import platform
import re
import shutil
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

VERSION = "0.31.2"
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

BRAND_ALIASES = {
    "HPE": ["hewlett packard enterprise", "hpe", "proliant", "integrated lights-out", " ilo "],
    "HP": ["hewlett-packard", "hp laserjet", "hp color laserjet", "hp officejet"],
    "Dell": ["dell", "poweredge", "idrac"],
    "Lenovo": ["lenovo", "thinksystem", "thinkcentre", "thinkpad"],
    "Fujitsu": ["fujitsu", "primergy"],
    "Cisco": ["cisco", "catalyst"],
    "Aruba": ["aruba", "procurve"],
    "Juniper": ["juniper"],
    "Fortinet": ["fortigate", "fortinet"],
    "Palo Alto": ["palo alto", "pan-os"],
    "Synology": ["synology", "diskstation"],
    "QNAP": ["qnap"],
    "APC": ["apc", "smart-ups"],
    "Canon": ["canon", "imagerunner", "imageclass"],
    "Xerox": ["xerox"],
    "Ricoh": ["ricoh"],
    "Kyocera": ["kyocera", "ecosys", "taskalfa"],
    "Brother": ["brother"],
    "Epson": ["epson"],
    "Lexmark": ["lexmark"],
    "Konica Minolta": ["konica minolta", "bizhub"],
}


@dataclass
class Device:
    ip_address: str
    mac_address: str = ""
    hostname: str = ""
    device_type: str = "Nez\u00e1me zariadenie"
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
        raise ValueError("Config must be a JSON object.")
    return config


def allowed_network(value: str, max_hosts: int) -> ipaddress.IPv4Network:
    network = ipaddress.ip_network(value, strict=False)
    if not isinstance(network, ipaddress.IPv4Network):
        raise ValueError(f"v0.31 supports IPv4 CIDR only: {value}")
    if not any(network.subnet_of(parent) for parent in PRIVATE_RANGES):
        raise ValueError(f"CIDR {value} is not an RFC1918 private network; collector refused it.")
    if network.num_addresses > max_hosts + 2:
        raise ValueError(f"CIDR {value} has {network.num_addresses} addresses; collector limit is {max_hosts} hosts per range.")
    return network


def tcp_probe(ip: str, port: int, timeout: float) -> bool:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        return sock.connect_ex((ip, port)) == 0
    except OSError:
        return False
    finally:
        sock.close()


def reverse_dns_record(ip: str) -> dict[str, str]:
    try:
        fqdn = socket.gethostbyaddr(ip)[0].strip().rstrip(".")
        return {"ptr": fqdn, "short_hostname": fqdn.split(".")[0] if fqdn else ""}
    except (socket.herror, socket.gaierror, TimeoutError, OSError):
        return {"ptr": "", "short_hostname": ""}


def neighbor_mac(ip: str) -> str:
    system = platform.system().lower()
    commands: list[list[str]] = []
    if system == "windows":
        commands.append(["arp", "-a", ip])
    else:
        if shutil.which("ip"):
            commands.append(["ip", "neigh", "show", ip])
        if shutil.which("arp"):
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


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req: urllib.request.Request, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        return None


def _http_title(body: bytes) -> str:
    if not body:
        return ""
    text = body.decode("utf-8", errors="replace")
    match = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    value = re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()
    return value[:240]


def http_fingerprint(ip: str, port: int, timeout: float, max_bytes: int, use_tls: bool) -> dict[str, Any]:
    scheme = "https" if use_tls else "http"
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    handlers: list[Any] = [NoRedirect()]
    if use_tls:
        handlers.append(urllib.request.HTTPSHandler(context=context))
    opener = urllib.request.build_opener(*handlers)
    request = urllib.request.Request(
        f"{scheme}://{ip}:{port}/",
        method="GET",
        headers={
            "User-Agent": f"CVTI-Asset-Collector/{VERSION}",
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.2",
            "Connection": "close",
        },
    )
    response: Any = None
    try:
        response = opener.open(request, timeout=timeout)
    except urllib.error.HTTPError as exc:
        response = exc
    except (urllib.error.URLError, TimeoutError, OSError, ssl.SSLError):
        return {}
    try:
        body = response.read(max_bytes) if response is not None else b""
        headers = response.headers if response is not None else {}
        return {
            "port": port,
            "scheme": scheme,
            "status": int(getattr(response, "status", getattr(response, "code", 0)) or 0),
            "title": _http_title(body),
            "server": str(headers.get("Server", ""))[:240],
            "content_type": str(headers.get("Content-Type", ""))[:160],
            "location": str(headers.get("Location", ""))[:300],
            "www_authenticate": str(headers.get("WWW-Authenticate", ""))[:240],
        }
    except (OSError, ValueError):
        return {}
    finally:
        try:
            if response is not None:
                response.close()
        except Exception:
            pass


def tls_fingerprint(ip: str, port: int, timeout: float) -> dict[str, str]:
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    try:
        with socket.create_connection((ip, port), timeout=timeout) as raw:
            with context.wrap_socket(raw, server_hostname=None) as tls_socket:
                cert = tls_socket.getpeercert(binary_form=True) or b""
                cipher = tls_socket.cipher()
                return {
                    "port": str(port),
                    "protocol": str(tls_socket.version() or ""),
                    "cipher": str(cipher[0] if cipher else ""),
                    "certificate_sha256": hashlib.sha256(cert).hexdigest() if cert else "",
                }
    except (OSError, TimeoutError, ssl.SSLError):
        return {}


def ssh_fingerprint(ip: str, port: int, timeout: float, max_bytes: int) -> dict[str, Any]:
    try:
        with socket.create_connection((ip, port), timeout=timeout) as sock:
            sock.settimeout(timeout)
            data = sock.recv(max(64, min(max_bytes, 4096)))
    except (OSError, TimeoutError):
        return {}
    banner = data.decode("utf-8", errors="replace").strip().splitlines()[0] if data else ""
    return {"port": port, "banner": banner[:300]} if banner else {}


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


def infer_brand(*values: str) -> str:
    low = " ".join(value for value in values if value).lower()
    padded = f" {low} "
    for brand, aliases in BRAND_ALIASES.items():
        if any(alias in padded for alias in aliases):
            return brand
    return ""


def base_device_type(open_ports: list[int], signal_text: str, printer_name: str, printer_serial: str) -> str:
    low = signal_text.lower()
    if printer_name or printer_serial or 9100 in open_ports or 631 in open_ports or 515 in open_ports:
        if any(word in low for word in ["mfp", "multifunction", "multifunk", "imageclass", "imagerunner", "bizhub", "taskalfa"]):
            return "MFP"
        return "Tla\u010diare\u0148"
    if any(word in low for word in ["fortigate", "fortinet", "palo alto", "pan-os", "firewall"]):
        return "Firewall"
    if any(word in low for word in ["catalyst", "procurve", "switch"]):
        return "Switch"
    if "router" in low:
        return "Router"
    if any(word in low for word in ["access point", "wireless", "aruba ap"]):
        return "Wi-Fi AP"
    if any(word in low for word in ["smart-ups", " ups "]):
        return "UPS"
    if any(word in low for word in ["synology", "qnap", "storage", "diskstation"]):
        return "Storage"
    if any(word in low for word in ["vmware esxi", "proxmox"]):
        return "Hypervisor"
    if any(word in low for word in ["idrac", "integrated lights-out"]):
        return "Server management"
    if 3389 in open_ports or 445 in open_ports:
        return "Windows endpoint / server"
    if 22 in open_ports:
        return "Server / appliance"
    if 80 in open_ports or 443 in open_ports:
        return "Sie\u0165ov\u00e9 / embedded zariadenie"
    return "Nez\u00e1me zariadenie"


def build_classification(
    open_ports: list[int],
    hostname: str,
    signal_text: str,
    base_type: str,
) -> dict[str, Any]:
    low = signal_text.lower()
    host = hostname.lower()
    evidence: list[str] = []
    family = base_type
    role = ""
    os_hint = ""
    confidence = 45

    if 445 in open_ports:
        evidence.append("SMB/445")
    if 3389 in open_ports:
        evidence.append("RDP/3389")
    if 22 in open_ports:
        evidence.append("SSH/22")
    if 80 in open_ports:
        evidence.append("HTTP/80")
    if 443 in open_ports:
        evidence.append("HTTPS/443")
    if any(port in open_ports for port in (515, 631, 9100)):
        evidence.append("print service")

    if base_type in {"Tla\u010diare\u0148", "MFP"}:
        family = base_type
        role = "Print device"
        confidence = 92
    elif base_type in {"Firewall", "Switch", "Router", "Wi-Fi AP", "UPS", "Storage", "Hypervisor", "Server management"}:
        family = base_type
        role = base_type
        confidence = 92
    elif 445 in open_ports or 3389 in open_ports:
        family = "Windows endpoint / server"
        os_hint = "Windows candidate"
        confidence = 78 if 445 in open_ports and 3389 in open_ports else 68
    elif 22 in open_ports:
        family = "Server / appliance"
        os_hint = "Unix/Linux or appliance candidate"
        confidence = 62
    elif 80 in open_ports or 443 in open_ports:
        family = "Network / embedded device"
        confidence = 58

    role_rules: list[tuple[str, str, int]] = [
        (r"(?:^|[-_.])(?:db|dbsql|sql)[a-z0-9]*", "Database server candidate", 92),
        (r"(?:^|[-_.])(?:web|www|iis)[a-z0-9]*", "Web server candidate", 84),
        (r"(?:^|[-_.])(?:fs|file)[a-z0-9]*", "File server candidate", 84),
        (r"(?:^|[-_.])(?:print|prt)[a-z0-9]*", "Print server candidate", 84),
        (r"(?:^|[-_.])(?:backup|bkp|veeam)[a-z0-9]*", "Backup server candidate", 88),
        (r"(?:^|[-_.])(?:clu|cluster)[a-z0-9]*", "Cluster node candidate", 86),
    ]
    for pattern, label, score in role_rules:
        if re.search(pattern, host, flags=re.IGNORECASE) or (label.startswith("Database") and "dbsql" in host):
            role = label
            confidence = max(confidence, score)
            evidence.append(f"hostname:{hostname}")
            break

    if "microsoft-iis" in low:
        os_hint = "Windows / Microsoft IIS candidate"
        role = role or "Web server candidate"
        confidence = max(confidence, 88)
        evidence.append("HTTP Server: Microsoft-IIS")
    if "vmware esxi" in low:
        family = "Hypervisor"
        role = "VMware ESXi host"
        confidence = max(confidence, 98)
        evidence.append("VMware ESXi fingerprint")
    elif "proxmox" in low:
        family = "Hypervisor"
        role = "Proxmox host"
        confidence = max(confidence, 98)
        evidence.append("Proxmox fingerprint")
    if "idrac" in low:
        family = "Server management"
        role = "Dell iDRAC management"
        confidence = max(confidence, 98)
        evidence.append("iDRAC fingerprint")
    if "integrated lights-out" in low or " hpe ilo" in f" {low}":
        family = "Server management"
        role = "HPE iLO management"
        confidence = max(confidence, 98)
        evidence.append("iLO fingerprint")
    if "fortigate" in low or "fortinet" in low:
        family = "Firewall"
        role = "Fortinet firewall"
        confidence = max(confidence, 98)
        evidence.append("Fortinet fingerprint")
    if "openssh" in low and not os_hint:
        os_hint = "Unix/Linux or network appliance candidate"
        confidence = max(confidence, 68)
        evidence.append("OpenSSH banner")

    return {
        "family": family,
        "role": role,
        "confidence": min(99, confidence),
        "os_hint": os_hint,
        "evidence": evidence[:12],
    }


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


def enrich_network(ip: str, config: dict[str, Any], open_ports: list[int]) -> dict[str, Any]:
    cfg = config.get("enrichment") if isinstance(config.get("enrichment"), dict) else {}
    if not cfg or not bool(cfg.get("enabled", False)):
        return {}
    timeout = max(0.2, min(3.0, float(cfg.get("timeout_ms", 800)) / 1000.0))
    max_bytes = max(512, min(int(cfg.get("max_banner_bytes", 4096)), 16384))
    result: dict[str, Any] = {"version": VERSION}

    if bool(cfg.get("reverse_dns", True)):
        result["dns"] = reverse_dns_record(ip)

    http_items: list[dict[str, Any]] = []
    if 80 in open_ports and bool(cfg.get("http", True)):
        value = http_fingerprint(ip, 80, timeout, max_bytes, False)
        if value:
            http_items.append(value)
    if 443 in open_ports and bool(cfg.get("https", True)):
        value = http_fingerprint(ip, 443, timeout, max_bytes, True)
        if value:
            http_items.append(value)
    if http_items:
        result["http"] = http_items

    if 443 in open_ports and bool(cfg.get("tls", True)):
        value = tls_fingerprint(ip, 443, timeout)
        if value:
            result["tls"] = value

    if 22 in open_ports and bool(cfg.get("ssh_banner", True)):
        value = ssh_fingerprint(ip, 22, timeout, max_bytes)
        if value:
            result["ssh"] = value

    if bool(cfg.get("local_neighbor_mac", True)):
        mac = neighbor_mac(ip)
        if mac:
            result["neighbor_mac"] = mac
    return result


def scan_host(ip: str, config: dict[str, Any]) -> Device | None:
    timeout = max(0.1, min(3.0, float(config.get("timeout_ms", 350)) / 1000.0))
    ports = [int(port) for port in config.get("tcp_ports", DEFAULT_PORTS) if 1 <= int(port) <= 65535]
    open_ports = [port for port in ports if tcp_probe(ip, port, timeout)]
    snmp, snmp_details, identity = enrich_snmp(ip, config, open_ports)
    if not open_ports and not snmp:
        return None

    enrichment = enrich_network(ip, config, open_ports)
    dns = enrichment.get("dns") if isinstance(enrichment.get("dns"), dict) else {}
    hostname = str(identity.get("hostname") or dns.get("short_hostname") or "")
    http_items = enrichment.get("http") if isinstance(enrichment.get("http"), list) else []
    http_text = " ".join(
        f"{item.get('title', '')} {item.get('server', '')} {item.get('www_authenticate', '')}"
        for item in http_items if isinstance(item, dict)
    )
    ssh = enrichment.get("ssh") if isinstance(enrichment.get("ssh"), dict) else {}
    ssh_text = str(ssh.get("banner") or "")
    sys_descr = str(identity.get("sys_descr") or "")
    signal_text = " ".join([sys_descr, hostname, http_text, ssh_text])
    device_type = base_device_type(open_ports, signal_text, str(identity.get("model") or ""), str(identity.get("serial_number") or ""))
    enrichment_cfg = config.get("enrichment") if isinstance(config.get("enrichment"), dict) else {}
    classification = build_classification(open_ports, hostname, signal_text, device_type) if bool(enrichment_cfg.get("classification", True)) else {"family": device_type, "role": "", "confidence": 0, "os_hint": "", "evidence": []}
    manufacturer = str(identity.get("manufacturer") or infer_brand(signal_text))
    mac = str(enrichment.get("neighbor_mac") or "")

    details: dict[str, Any] = {
        **snmp_details,
        "services": [PORT_NAMES.get(port, str(port)) for port in open_ports],
        "classification": classification,
        "enrichment": {"version": VERSION, "mode": "unauthenticated-network-fingerprint"},
    }
    for key in ("dns", "http", "tls", "ssh"):
        if key in enrichment:
            details[key] = enrichment[key]

    return Device(
        ip_address=ip,
        mac_address=mac,
        hostname=hostname,
        device_type=device_type,
        manufacturer=manufacturer,
        model=str(identity.get("model") or ""),
        serial_number=str(identity.get("serial_number") or ""),
        firmware=str(identity.get("firmware") or ""),
        open_ports=open_ports,
        snmp=snmp,
        details=details,
    )


def post_discovery(config: dict[str, Any], devices: list[Device], cidrs: list[str], hosts_scanned: int) -> dict[str, Any]:
    url = str(config.get("supabase_url") or "").rstrip("/")
    collector_id = str(config.get("collector_id") or "")
    token_env = str(config.get("collector_token_env") or "CVTI_DISCOVERY_TOKEN")
    anon_env = str(config.get("supabase_anon_key_env") or "CVTI_SUPABASE_ANON_KEY")
    token = os.environ.get(token_env, "")
    anon_key = os.environ.get(anon_env, "")
    if not url or not collector_id or not token or not anon_key:
        raise RuntimeError(f"Missing supabase_url, collector_id or environment secrets {token_env}/{anon_env}.")
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
    parser.add_argument("--config", default="config.json", help="Path to collector JSON config")
    parser.add_argument("--dry-run", action="store_true", help="Do not upload to Supabase; print/write JSON")
    parser.add_argument("--output", help="Optional JSON output file for dry-run")
    args = parser.parse_args()

    config = load_config(Path(args.config))
    max_hosts = max(1, min(int(config.get("max_hosts_per_cidr", 4096)), 4096))
    networks = [allowed_network(str(value), max_hosts) for value in config.get("cidrs", [])]
    if not networks:
        raise ValueError("Config does not contain a CIDR range.")
    all_ips = [str(ip) for network in networks for ip in network.hosts()]
    if len(all_ips) > 10000:
        raise ValueError("One run can contain at most 10,000 hosts. Split discovery into multiple collectors/ranges.")

    workers = max(1, min(int(config.get("workers", 48)), 128))
    started = time.time()
    print(f"CVTI Asset Collector {VERSION}: scanning {len(all_ips)} hosts in {len(networks)} CIDR range(s), workers={workers}")
    devices: list[Device] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_map = {executor.submit(scan_host, ip, config): ip for ip in all_ips}
        for index, future in enumerate(concurrent.futures.as_completed(future_map), start=1):
            ip = future_map[future]
            try:
                device = future.result()
                if device:
                    devices.append(device)
                    classification = device.details.get("classification", {}) if isinstance(device.details, dict) else {}
                    role = str(classification.get("role") or "") if isinstance(classification, dict) else ""
                    suffix = role or device.hostname or device.model
                    print(f"  + {ip:15} {device.device_type:28} {suffix}")
            except Exception as exc:
                print(f"  ! {ip}: {exc}", file=sys.stderr)
            if index % 250 == 0:
                print(f"  ... {index}/{len(all_ips)}")

    devices.sort(key=lambda item: tuple(int(part) for part in item.ip_address.split(".")))
    result = {
        "version": VERSION,
        "cidrs": [str(n) for n in networks],
        "hosts_scanned": len(all_ips),
        "hosts_found": len(devices),
        "duration_s": round(time.time() - started, 2),
        "devices": [d.payload() for d in devices],
    }
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
        print("Interrupted by user.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
