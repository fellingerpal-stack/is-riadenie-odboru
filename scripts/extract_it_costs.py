#!/usr/bin/env python3
"""Extract a conservative IT-cost slice from the exported economic-classification dashboard.

The source dashboard embeds a JSON object in `const DATA=...`. This script classifies
only records that are either in explicitly IT-related KPD/PPD buckets or contain a
strong, explainable IT/DC VaV signal in the note. Scientific-content database
subscriptions are intentionally excluded from the IT operating-cost view.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any


def normalize(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", (value or "").lower())
    return "".join(char for char in text if not unicodedata.combining(char))


def contains(text: str, terms: list[str]) -> bool:
    return any(normalize(term) in text for term in terms)


SCIENTIFIC_DATABASES = [
    "web of science", "web od science", "springer", "sciencedirect", "scopus",
    "proquest", "wiley", "ieee", "knovel", "scifinder", "reaxys", "acm digital",
    "uptodate", "nejm", "elek.kniznica", "library access", "databaza k fotografiam",
    "databaza k fogtografi",
]

ENTITY_RULES: list[tuple[str, list[str]]] = [
    ("KOMIS", ["komis"]),
    ("CRZP/APS", ["crzp", "is aps", "antiplag"]),
    ("CREPČ/CREUČ", ["crepc", "creuc"]),
    ("DMS / Fabasoft", ["fabasoft", "dms"]),
    ("VEMA", ["vema"]),
    ("MUVV", ["muvv", "mvl"]),
    ("KIS DAWINCI", ["dawinci"]),
    ("ERAPORTÁL", ["eraportal"]),
    ("Mitel", ["mitel"]),
    ("DC VaV", ["dcvav", "dc vav"]),
    ("ESET", ["eset"]),
    ("Zoho", ["zoho"]),
    ("Adobe", ["adobe"]),
    ("Mailchimp", ["mailchimp"]),
    ("Canva", ["canva"]),
    ("Microsoft", ["microsoft", "office 365", "m365"]),
    ("Webex", ["webex"]),
    ("OpenAI", ["openai", "chatgpt"]),
]


def entity_for(text: str) -> str:
    for entity, terms in ENTITY_RULES:
        if contains(text, terms):
            return entity
    return ""


def classify(row: dict[str, Any]) -> tuple[str, str, str, str, str] | None:
    text = f" {normalize(row.get('label'))} "
    kpd = str(row.get("kpd", ""))
    ppd = str(row.get("ppd", ""))
    entity = entity_for(text)

    if contains(text, SCIENTIFIC_DATABASES):
        return None

    if contains(text, ["dcvav", "dc vav"]):
        return ("Dátové centrum DC VaV", "Prevádzka", "DC VaV", "vysoká", "explicitná väzba na DC VaV")

    if kpd == "632" and ppd == "004":
        return ("Konektivita a hosting", "Prevádzka", "Internet / hosting", "stredná", "KPD 632 / PPD 004 Internet, hosting a domény")
    if kpd == "632" and ppd == "005":
        return ("Telekomunikácie", "Prevádzka", "Telefónne služby", "stredná", "KPD 632 / PPD 005 Telefónne služby")
    if kpd == "633" and ppd == "002":
        return ("HW a koncové zariadenia", "Rozvoj", "Výpočtová technika", "stredná", "KPD 633 / PPD 002 Výpočtová technika")
    if kpd == "633" and ppd == "003":
        return ("Sieť a telekomunikačná technika", "Rozvoj", "Telekomunikačná technika", "stredná", "KPD 633 / PPD 003 Telekomunikačná technika")
    if kpd == "633" and ppd == "013":
        return ("Licencie, softvér a cloud", "Prevádzka", entity or "Softvér / licencie", "stredná", "KPD 633 / PPD 013 Softvér a licencie")
    if kpd == "635" and ppd == "002":
        return ("Servis a údržba IT", "Prevádzka", "Výpočtová technika", "stredná", "KPD 635 / PPD 002 Údržba výpočtovej techniky")
    if kpd == "635" and ppd == "003":
        return ("Servis a údržba IT", "Prevádzka", "Telekomunikačná technika", "stredná", "KPD 635 / PPD 003 Údržba telekomunikačnej techniky")

    if kpd == "635" and ppd == "009":
        change_terms = ["integrac", "doplnenie", "implement", "upgrade", "migrac", "rozvoj", "modul xml"]
        run_terms = ["technicka podpora", "tech.podpora", "udrzba", "pravo pouzivat", "prevadzk"]
        mode = "Rozvoj" if contains(text, change_terms) and not contains(text, run_terms) else "Prevádzka"
        return (
            "Prevádzka a rozvoj IS", mode, entity or "Aplikačná podpora",
            "vysoká" if entity else "stredná", "KPD 635 / PPD 009 – aplikačná/technická podpora",
        )

    if kpd == "635" and ppd == "011":
        category = "Bezpečnosť a sieť" if contains(text, ["ids/ips", "acs", "mitel"]) else "Prevádzka a rozvoj IS"
        return (category, "Prevádzka", entity or "Softvérová / technická podpora", "stredná", "KPD 635 / PPD 011 – softvérová alebo technická podpora")

    if contains(text, ["eset protect", "firewall", "fortinet", "vpn", "antivirus", "ids/ips", "kyber", "cybersecurity"]):
        return ("Bezpečnosť a sieť", "Prevádzka", entity or "Bezpečnosť", "vysoká", "explicitná bezpečnostná technológia")

    if contains(text, ["licenc", "softver", "software", "mailchimp", "zoho", "adobe", "canva", "openai", "chatgpt", "webex", "microsoft 365", "office 365", "m365"]):
        return ("Licencie, softvér a cloud", "Prevádzka", entity or "Softvér / cloud", "vysoká", "explicitná licencia, softvér alebo SaaS")

    hardware_terms = [
        "notebook", "pocitac", "server", "servra", "tlaciaren", "tlaciarne", "kopirovac",
        "ipad", "tablet", "switch", "router", "wifi router", "wi-fi router", "ups",
        "zalozny zdroj", "ssd", "hard disk", "diskove pole", "monitor ", "skener",
        "3d tlac", "3d sken", "vypoctova technika",
    ]
    if contains(text, hardware_terms):
        return ("HW a koncové zariadenia", "Rozvoj", entity or "IT technika", "vysoká", "explicitné IT zariadenie")

    if contains(text, ["hosting", "webhosting", "domena", "domain"]):
        return ("Konektivita a hosting", "Prevádzka", "Hosting / domény", "vysoká", "explicitný hosting alebo doména")

    return None


def read_source(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const\s+DATA\s*=\s*", text)
    if not match:
        raise RuntimeError("V zdrojovom HTML nebol nájdený objekt const DATA = ...")
    decoder = json.JSONDecoder()
    payload, _ = decoder.raw_decode(text[match.end():])
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--validation", type=Path, help="Voliteľný druhý dashboard na kontrolu ročných súčtov a obdobia.")
    args = parser.parse_args()

    source = read_source(args.source)
    validation = read_source(args.validation) if args.validation else None
    validation_match = None
    if validation is not None:
        source_series = [round(float(item.get("amount", 0)), 2) for item in source.get("totals", [])]
        validation_series = [round(float(value), 2) for value in validation.get("totalSeries", [])]
        validation_match = source.get("years", []) == validation.get("years", []) and source_series == validation_series
    items: list[dict[str, Any]] = []

    for kpd, ppds in source["noteRowsByCodePpd"].items():
        for ppd, rows in ppds.items():
            for row in rows:
                result = classify(row)
                if not result:
                    continue
                category, mode, entity, confidence, reason = result
                key = f"{kpd}|{ppd}|{row.get('label', '')}"
                identifier = hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]
                items.append({
                    "id": f"ITC-{identifier}",
                    "kpd": kpd,
                    "ppd": ppd,
                    "label": row.get("label", ""),
                    "category": category,
                    "mode": mode,
                    "entity": entity,
                    "confidence": confidence,
                    "reason": reason,
                    "values": [
                        {
                            "year": value["year"],
                            "amount": value["amount"],
                            "rowCount": value.get("rowCount", 0),
                        }
                        for value in row.get("values", [])
                    ],
                    "totalAmount": row.get("totalAmount", 0),
                    "topDocument": row.get("topDocument", "—"),
                    "latestDocumentCount": row.get("latestDocumentCount", 0),
                    "latestZakCount": row.get("latestZakCount", 0),
                })

    output = {
        "meta": {
            "title": "Finančný pohľad IT – klasifikovaný výrez z ekonomického dashboardu",
            "sourceTitle": "Dashboard ekonomickej klasifikácie 632–642",
            "sourceGeneratedAt": source.get("generatedAt", ""),
            "periodLabel": source.get("periodLabel", ""),
            "years": source.get("years", []),
            "comparedMonths": source.get("comparedMonths", []),
            "classificationVersion": "1.1",
            "validationSourceTitle": "Dashboard vývoja nákladov 2022–2026" if validation else "",
            "validationPeriod": validation.get("period", "") if validation else "",
            "validationTotalsMatch": validation_match,
            "method": "Konzervatívna pravidlová klasifikácia podľa KPD/PPD a explicitných IT/DC VaV výrazov. Druhý dashboard sa používa ako kontrolný zdroj celkových ročných súm a porovnateľného obdobia; položky sa z neho nepripočítavajú, aby nevzniklo dvojité započítanie.",
            "exclusions": [
                "vedecké a publikačné databázové predplatné (Web of Science, Springer, Scopus, ProQuest, IEEE a pod.)",
                "bežné všeobecné služby bez explicitnej IT väzby",
                "kapitálové výdavky mimo rozsahu zdrojového dashboardu 632–642",
            ],
        },
        "sourceTotals": source.get("totals", []),
        "items": sorted(items, key=lambda item: (item["category"], item["entity"], item["label"])),
    }
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Zapísané: {args.output} ({len(items)} klasifikovaných položiek)")


if __name__ == "__main__":
    main()
