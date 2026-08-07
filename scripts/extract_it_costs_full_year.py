#!/usr/bin/env python3
"""Build a conservative full-year IT-cost dataset from Dashboard vývoja nákladov.

The full-year dashboard contains normalized recurring/irregular note families and exact
annual KPD/PPD totals. We classify the note families with the same rules as the H1
extractor and reconcile the unconditional IT KPD/PPD buckets with residual rows so
that those direct-code categories match the source exactly. Generic-code IT items
remain conservative: only rows with an explicit IT/DC signal are included.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from extract_it_costs import classify

DIRECT_CODES = {
    ("632", "004"),
    ("632", "005"),
    ("633", "002"),
    ("633", "003"),
    ("633", "013"),
    ("635", "002"),
    ("635", "003"),
}

DIRECT_DEFAULTS: dict[tuple[str, str], tuple[str, str, str, str, str]] = {
    ("632", "004"): ("Konektivita a hosting", "Prevádzka", "Internet / hosting", "stredná", "KPD 632 / PPD 004 Internet, hosting a domény"),
    ("632", "005"): ("Telekomunikácie", "Prevádzka", "Telefónne služby", "stredná", "KPD 632 / PPD 005 Telefónne služby"),
    ("633", "002"): ("HW a koncové zariadenia", "Rozvoj", "Výpočtová technika", "stredná", "KPD 633 / PPD 002 Výpočtová technika"),
    ("633", "003"): ("Sieť a telekomunikačná technika", "Rozvoj", "Telekomunikačná technika", "stredná", "KPD 633 / PPD 003 Telekomunikačná technika"),
    ("633", "013"): ("Licencie, softvér a cloud", "Prevádzka", "Softvér / licencie", "stredná", "KPD 633 / PPD 013 Softvér a licencie"),
    ("635", "002"): ("Servis a údržba IT", "Prevádzka", "Výpočtová technika", "stredná", "KPD 635 / PPD 002 Údržba výpočtovej techniky"),
    ("635", "003"): ("Servis a údržba IT", "Prevádzka", "Telekomunikačná technika", "stredná", "KPD 635 / PPD 003 Údržba telekomunikačnej techniky"),
}


def read_source(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const\s+DATA\s*=\s*", text)
    if not match:
        raise RuntimeError("V zdrojovom HTML nebol nájdený objekt const DATA = ...")
    payload, _ = json.JSONDecoder().raw_decode(text[match.end():])
    return payload


def norm_ppd(value: Any) -> str:
    text = str(value or "").strip()
    if not text or text.lower() == "bez ppd":
        return ""
    return text.zfill(3) if text.isdigit() else text


def make_values(raw_values: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "year": int(value.get("year", 0)),
            "amount": round(float(value.get("amount", 0) or 0), 2),
            "rowCount": int(value.get("rowCount", 0) or 0),
        }
        for value in raw_values
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = read_source(args.source)
    years = [int(year) for year in source.get("years", [])]
    recurring = source.get("recurring", {}).get("items", [])
    items: list[dict[str, Any]] = []
    classified_direct: dict[tuple[str, str, int], float] = {}

    for raw in recurring:
        kpd = str(raw.get("kpd", "")).strip()
        ppd = norm_ppd(raw.get("ppd"))
        label = str(raw.get("label", "")).strip()
        detail = str(raw.get("detail", "")).strip()
        group_name = str(raw.get("groupName", "")).strip()
        row = {"kpd": kpd, "ppd": ppd, "label": f"{label} {detail} {group_name}".strip()}
        result = classify(row)
        if not result:
            continue
        category, mode, entity, confidence, reason = result
        values = make_values(raw.get("values", []))
        if not any(abs(value["amount"]) > 0.004 for value in values):
            continue
        key = f"fy|{kpd}|{ppd}|{raw.get('key', label)}"
        identifier = hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]
        item = {
            "id": f"ITFY-{identifier}",
            "kpd": kpd,
            "ppd": ppd,
            "label": label or group_name or detail,
            "category": category,
            "mode": mode,
            "entity": entity,
            "confidence": confidence,
            "reason": f"{reason}; full-year normalizovaná položka",
            "values": values,
            "totalAmount": round(sum(value["amount"] for value in values), 2),
            "topDocument": "—",
            "latestDocumentCount": 0,
            "latestZakCount": 0,
        }
        items.append(item)
        if (kpd, ppd) in DIRECT_CODES:
            for value in values:
                idx = (kpd, ppd, int(value["year"]))
                classified_direct[idx] = classified_direct.get(idx, 0.0) + float(value["amount"])

    # Exact annual source totals for KPD/PPD pairs. Add only the residual of unconditional
    # IT buckets so recurring/named rows are not double-counted.
    pair_by_year: dict[tuple[int, str, str], tuple[float, int]] = {}
    for year_block in source.get("pareto", {}).get("byScope", {}).get("pairs", []):
        year = int(year_block.get("year", 0))
        for row in year_block.get("rows", []):
            key = str(row.get("key", ""))
            parts = key.split("|", 1)
            if len(parts) != 2:
                continue
            kpd, ppd_raw = parts
            ppd = norm_ppd(ppd_raw)
            pair_by_year[(year, kpd, ppd)] = (float(row.get("amount", 0) or 0), int(row.get("rowCount", 0) or 0))

    for kpd, ppd in sorted(DIRECT_CODES):
        category, mode, entity, confidence, reason = DIRECT_DEFAULTS[(kpd, ppd)]
        values = []
        for year in years:
            total, row_count = pair_by_year.get((year, kpd, ppd), (0.0, 0))
            named = classified_direct.get((kpd, ppd, year), 0.0)
            residual = round(total - named, 2)
            values.append({"year": year, "amount": residual, "rowCount": row_count if abs(residual) > 0.004 else 0})
        if not any(abs(value["amount"]) > 0.004 for value in values):
            continue
        identifier = hashlib.sha1(f"fy-residual|{kpd}|{ppd}".encode("utf-8")).hexdigest()[:12]
        items.append({
            "id": f"ITFY-{identifier}",
            "kpd": kpd,
            "ppd": ppd,
            "label": f"Ostatné položky {kpd} / {ppd} – full-year rezíduum priameho IT kódu",
            "category": category,
            "mode": mode,
            "entity": entity,
            "confidence": confidence,
            "reason": f"{reason}; rezíduum do presného ročného súčtu KPD/PPD",
            "values": values,
            "totalAmount": round(sum(value["amount"] for value in values), 2),
            "topDocument": "—",
            "latestDocumentCount": 0,
            "latestZakCount": 0,
        })

    output = {
        "meta": {
            "title": "Finančný pohľad IT – celý rok",
            "sourceTitle": "Dashboard vývoja nákladov – január až december 2023–2025",
            "sourceGeneratedAt": "20. júla 2026 o 17:16",
            "periodLabel": "január až december",
            "years": years,
            "comparedMonths": list(range(1, 13)),
            "classificationVersion": "1.2-full-year",
            "validationSourceTitle": "",
            "validationPeriod": "január až december",
            "validationTotalsMatch": None,
            "method": "Konzervatívny full-year IT výrez: explicitné IT/DC VaV normalizované položky + presne dorekoncilované priame IT KPD/PPD kódy. Generické účtovné kódy bez explicitnej IT väzby sa nedopočítavajú.",
            "exclusions": [
                "generické služby bez explicitnej IT väzby",
                "vedecké a publikačné databázové predplatné",
                "položky, ktoré sa z full-year agregátu nedajú bezpečne priradiť k IT bez detailného riadkového zdroja",
            ],
            "coverageNote": "Celý rok je dostupný pre 2023–2025. Rok 2026 má v zdrojovej bráne zatiaľ pokrytie iba január–jún a preto sa pre 2026 celý rok nezobrazuje ako skutočnosť.",
        },
        "sourceTotals": [
            {"year": int(year), "amount": round(float(amount), 2), "rowCount": 0}
            for year, amount in zip(years, source.get("totalSeries", []))
        ],
        "items": sorted(items, key=lambda item: (item["category"], item["entity"], item["label"])),
    }
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    for year in years:
        total = sum(next((v["amount"] for v in item["values"] if v["year"] == year), 0.0) for item in items)
        print(f"{year}: IT full-year = {total:,.2f} EUR")
    print(f"Zapísané: {args.output} ({len(items)} klasifikovaných položiek)")


if __name__ == "__main__":
    main()
