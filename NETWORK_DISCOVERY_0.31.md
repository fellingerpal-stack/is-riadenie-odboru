# Network Discovery 0.31 – metodika

## Cieľ

Network Discovery dopĺňa manuálnu a importovanú evidenciu aktív o technické pozorovanie siete. Discovery je **zdroj dôkazu**, nie autoritatívna majetková evidencia.

## Architektúra

```text
Interná LAN/VLAN
   ↓
CVTI Asset Collector
   ↓ outbound HTTPS
Supabase ingest_discovery_batch RPC
   ↓
discovery_devices + discovery_observations
   ↓
Asset Management → Network Discovery
   ↓ potvrdenie
Asset 360 / cmdbItems
```

Vercel aplikácia internú sieť sama neskenuje. Collector musí bežať v sieti, ktorú má objavovať.

## Discovery identita

Server pri ingestovaní preferuje stabilné identifikátory v poradí:

1. serial number,
2. MAC,
3. hostname,
4. IP.

Pri každom rune sa uchová first/last seen a observation history.

## Zmeny

Pri zmene známeho zariadenia sa sledujú minimálne:

- IP,
- hostname,
- model,
- serial,
- firmware.

Zmena sa zobrazí ako `Zmenené`, kým ďalšie pozorovanie nepotvrdí nový stabilný stav.

## Print Fleet

SNMP enrichment je voliteľný. Community/credentials ostávajú iba na collectore a nikdy sa neposielajú do Supabase payloadu.

Collector v 0.31 používa Net-SNMP CLI `snmpget/snmpwalk` a v2c read-only. V produkcii odporúčame vyhradenú read-only konfiguráciu a ACL, ktorá povoľuje SNMP iba z IP collectora. Budúca verzia môže rozšíriť collector o SNMPv3.

## Retencia

Aktuálny stav zariadenia je v `discovery_devices`; historické pozorovania sú v `discovery_observations`. Admin má RPC `prune_discovery_observations(days)`; odporúčaná retencia je 90 dní podľa objemu dát a auditných potrieb.

## Čo 0.31 nerobí

- vulnerability scanning,
- testovanie hesiel,
- exploitáciu,
- inventár nainštalovaného softvéru na endpointoch,
- agentové EDR/MDM funkcie,
- pasívny SPAN/TAP sensor.

Tieto oblasti sú zámerne mimo scope prvej verzie.
