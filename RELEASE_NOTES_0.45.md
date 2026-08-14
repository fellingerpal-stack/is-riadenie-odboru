# Release v0.45.0 – ServiceDesk Operations & Notifications

## Cieľ

Release posúva samostatný ServiceDesk z produkčného základu v0.44 na každodenný prevádzkový nástroj. Dopĺňa serverovo počítané SLA podľa pracovného kalendára, in-app notifikácie, SLA warning/breach eskalácie, vedúci pohľad na health front a pripravený e-mailový outbox s provider-neutral Edge Function workerom.

## 1. Business-calendar SLA

SLA už nie je založené iba na kalendárnych hodinách. Každá riešiteľská skupina môže mať:

- zapnuté/vypnuté SLA podľa pracovného kalendára,
- pracovné dni,
- začiatok a koniec pracovného dňa,
- časové pásmo (predvolene `Europe/Bratislava`),
- predstih SLA warningu v minútach.

Serverová DB logika je autoritatívna: pri novom tickete alebo zmene fronty/priority prepočíta first-response a resolution SLA. Existujúce otvorené tickety sa po migrácii prepočítajú tiež.

## 2. Výnimky kalendára

Admin/manager môže v ServiceDesk konfigurácii evidovať:

- sviatok alebo iný nepracovný deň,
- mimoriadny pracovný deň,
- voliteľne špeciálny pracovný interval pre konkrétny dátum.

Release zámerne neobsahuje natvrdo zakódovaný zoznam sviatkov. Výnimky sú organizačné dáta a spravujú sa v ServiceDesk konfigurácii.

## 3. In-app Notification Center

ServiceDesk má vlastné notifikačné centrum. Upozornenia vznikajú serverovo napríklad pri:

- založení ticketu,
- priradení riešiteľovi,
- zmene stavu,
- novom verejnom komentári riešiteľa,
- blížiacom sa SLA,
- prekročení SLA.

Používateľ vidí iba notifikácie určené jemu. Notifikácie sa dajú označiť ako prečítané jednotlivo alebo hromadne.

## 4. SLA eskalácie

Nové RPC `process_service_sla_escalations()` kontroluje otvorené tickety a vytvára deduplikované warning/breach notifikácie. Eskalačné ciele sú podľa dostupnosti:

- vedúci riešiteľskej skupiny,
- zástupca,
- priamo pridelený riešiteľ,
- skupinový e-mail.

Ak je v Supabase už zapnuté `pg_cron`, migrácia sa pokúsi vytvoriť 15-minútový job. Ak `pg_cron` dostupný nie je, ServiceDesk spúšťa kontrolu aj počas aktívneho používania UI. Pre garantované 24/7 eskalácie odporúčame následne zapnúť scheduler/cron.

## 5. Vedúci pohľad na fronty

V SLA reporte pribudol blok `Vedúci skupín / Operatívny health front` s prehľadom:

- otvorené tickety,
- nepridelené tickety,
- SLA risk,
- SLA breach,
- vedúci a zástupca,
- pracovný čas fronty,
- warning lead time.

## 6. E-mailový outbox

Databáza vytvára e-mailový outbox spolu s in-app notifikáciami. Samotné odoslanie je oddelené od ticket transakcie, aby výpadok mailu nikdy nezablokoval ServiceDesk.

Súčasťou release je Edge Function:

`supabase/functions/service-notifications/index.ts`

Worker je provider-neutral. Očakáva interný/organizačný mail gateway webhook a odosiela mu JSON payload `to`, `subject`, `html`, `source`.

E-mail sa nezačne fyzicky odosielať iba spustením SQL migrácie – treba nasadiť Edge Function, nastaviť secrets a pravidelne worker volať. In-app notifikácie fungujú bez tejto konfigurácie.

## 7. Bezpečnosť

- Notification Center vracia iba vlastné notifikácie.
- Calendar exceptions môže meniť iba admin/manager.
- E-mail outbox nie je priamo dostupný `authenticated` používateľom.
- Claim/complete email RPC sú určené iba pre `service_role`.
- Kritické helper RPC nemajú PUBLIC execute.
- SLA termíny a eskalácie vznikajú na serveri.

## Databázová zmena

Vyžaduje sa:

`supabase/migration_servicedesk_v045.sql`

Migrácia predpokladá už nasadenú v0.44.0.

## Verzia

`0.45.0`
