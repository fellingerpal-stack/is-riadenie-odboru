# CVTI Asset Collector 0.31

Lokálny discovery collector pre modul **Asset Management → Network Discovery**.

## Bezpečnostné hranice

- skenuje iba explicitne uvedené RFC1918 IPv4 siete (`10/8`, `172.16/12`, `192.168/16`),
- jeden CIDR je obmedzený na 4096 hostov a jeden run na 10 000 hostov,
- používa iba TCP connect na nakonfigurované porty a voliteľné read-only SNMP dotazy,
- nerobí vulnerability scan, exploit, credential guessing ani internetové skenovanie,
- collector komunikuje do Supabase iba outbound HTTPS,
- collector token ani SNMP community sa neposielajú v discovery payload-e.

## 1. Vytvor collector

V aplikácii otvor `Asset management → Network Discovery → Collectory → Nový collector`.
Token sa zobrazí iba raz.

## 2. Config

Skopíruj `config.example.json` na `config.json` a nastav:

- `supabase_url`,
- `collector_id`,
- interné `cidrs`.

Do environment premenných daj:

```text
CVTI_SUPABASE_ANON_KEY=<Supabase publishable/anon key>
CVTI_DISCOVERY_TOKEN=<token collectora>
```

Pre Print Fleet môžeš voliteľne zapnúť SNMP. Collector používa lokálne CLI `snmpget`/`snmpwalk` z Net-SNMP. Community drž iba v env:

```text
CVTI_SNMP_COMMUNITY=<read-only community>
```

Odporúčanie: na produkcii preferuj oddelenú read-only SNMP konfiguráciu a sieťovo povoľ SNMP len z IP collectora.

## 3. Test bez zápisu

```bash
python cvti_asset_collector.py --config config.json --dry-run --output discovery-preview.json
```

## 4. Reálny run

```bash
python cvti_asset_collector.py --config config.json
```

## 5. Plánovanie

Collector je stateless. Spúšťaj ho napr. každú hodinu alebo raz denne cez Windows Task Scheduler / cron/systemd timer podľa veľkosti siete.

Pre veľké siete je lepšie mať viac collectorov podľa lokality/VLAN než jeden obrovský rozsah.
