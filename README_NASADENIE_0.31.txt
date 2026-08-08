IS Riadenie odboru – nasadenie v0.31.0
=====================================

Východisková verzia: v0.30.4
Cieľová verzia:      v0.31.0

DÔLEŽITÉ: v0.31 má povinný Supabase SQL krok.

1. Over správny Supabase projekt
---------------------------------
V SQL Editore spusti:

select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.app_snapshots') as app_snapshots,
  to_regprocedure('public.can_write_scope(text)') as can_write_scope,
  to_regprocedure('public.save_app_snapshot_v3(jsonb,integer)') as snapshot_v3;

V správnej DB nesmú byť tieto hodnoty NULL.

2. Spusti discovery SQL
-----------------------
Spusti celý súbor:

IS_Riadenie_odboru_v0.31.0_NETWORK_DISCOVERY.sql

Na konci očakávaj 6× true:
- collectors_ready
- devices_ready
- runs_ready
- observations_ready
- ingest_rpc_ready
- collector_rpc_ready

3. Nasaď frontend
-----------------
Ak už beží v0.30.4, rozbaľ:

IS_Riadenie_odboru_v0.31.0_LEN_ZMENENE_SUBORY.zip

do koreňa repozitára a povoľ prepísanie.

Commit + push. Vercel build musí zobrazovať:

is-riadenie-odboru@0.31.0

Po deployi Ctrl+F5 a skontroluj v0.31.0 v ľavom dolnom rohu.

4. Vytvor collector
-------------------
V aplikácii:
Asset management → Network Discovery → Collectory → Nový collector

Vyber scope 3.1 / 3.2 / Spoločné. Token sa zobrazí iba raz.

5. Nasaď lokálny collector
--------------------------
Priečinok `collector/` skopíruj na Windows/Linux host v internej sieti.

Skopíruj config.example.json na config.json a nastav CIDR rozsahy.
Secrets daj do environment premenných:

CVTI_SUPABASE_ANON_KEY=<publishable/anon key>
CVTI_DISCOVERY_TOKEN=<collector token>

Najprv test:

python cvti_asset_collector.py --config config.json --dry-run --output preview.json

Potom reálny run:

python cvti_asset_collector.py --config config.json

6. Print Fleet / SNMP
---------------------
SNMP je predvolene vypnuté.
Ak ho chceš použiť, nainštaluj na collector host Net-SNMP CLI a nastav v configu snmp.enabled=true.
Community nedávaj do JSON; nastav:

CVTI_SNMP_COMMUNITY=<read-only community>

7. Kontrola
-----------
- Network Discovery ukáže nové zariadenia,
- Print Fleet zobrazí identifikované tlačiarne/MFP,
- exact match podľa S/N/MAC/hostname ponúkne Potvrdiť,
- Vytvoriť asset vytvorí Asset 360 až po manuálnom potvrdení,
- existujúca snapshot synchronizácia v0.30.4 ostáva nezmenená.
