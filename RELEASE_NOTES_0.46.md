# Release v0.46.0 – ServiceDesk Email → Ticket & Hardening

## Cieľ

Release mení e-mail z čisto výstupného notifikačného kanála na obojsmerný ServiceDesk kanál. Nový e-mail môže vytvoriť ticket a odpoveď na existujúci ServiceDesk e-mail sa pripojí k správnemu ticketu ako verejný komentár.

Súčasťou release je aj oprava nečitateľného chybového banneru `[object Object]`.

## Inbound e-mail → ticket

- nový provider-neutral Edge Function `service-email-inbound`,
- každý inbound webhook vyžaduje samostatný secret,
- nový e-mail sa priradí podľa prijímacej adresy k nakonfigurovanému e-mailovému kanálu,
- kanál určuje predvolenú riešiteľskú skupinu, typ ticketu, kategóriu, podkategóriu, službu a prioritu,
- nový ticket má kanál `E-mail`,
- SLA sa dopočíta existujúcim serverovým business-calendar triggerom z v0.45,
- spracovanie je idempotentné podľa `messageId`; opakované doručenie rovnakého e-mailu nevytvorí duplikát.

## Odpoveď na existujúci ticket

Odchádzajúci e-mailový outbox teraz automaticky prefixuje predmet ticketom, napr.:

`[REQ-2026-0814-142030-A1B2] Nová odpoveď k ticketu ...`

Ak inbound e-mail v predmete obsahuje existujúce ID ticketu:

- nevytvorí sa nový ticket,
- text e-mailu sa pridá ako verejný komentár,
- uloží sa auditná história prijatia e-mailu,
- riešiteľ alebo členovia fronty dostanú in-app notifikáciu o odpovedi,
- e-mail sa zapíše do inbound logu.

## Prijímacie e-mailové kanály

V `ServiceDesk → Skupiny a routing` pribudla sekcia **E-mail → Ticket**.

Admin/manager môže pre každú adresu nastaviť:

- e-mailovú adresu,
- názov kanála,
- riešiteľskú frontu,
- Incident / Požiadavka,
- kategóriu a podkategóriu,
- predvolenú prioritu,
- väzbu na službu / systém,
- aktívny/neaktívny stav.

Migrácia bezpečne vytvorí počiatočné kanály z existujúcich aktívnych front, ktoré už majú vyplnený e-mail. Adresy je možné následne upraviť v UI.

## Prílohy

Provider môže poslať najviac 5 príloh, každú do 750 kB. Edge Function podporuje `base64`, `data` alebo `dataUrl`. Pri odpovedi sa prílohy pridajú iba vtedy, ak ticket neprekročí existujúci limit 5 príloh.

## Ochrana proti e-mailovej slučke

Inbound Edge Function podporuje secret `SERVICEDESK_OUTBOUND_FROM`. Ak inbound správa prichádza z tejto adresy, worker ju ignoruje. Je to povinná ochrana v konfigurácii mail gateway, ak inbound a outbound používajú ten istý mailbox/doménu.

## Oprava [object Object]

`friendlyHelpdeskError()` teraz z objektovej chyby vyberie čitateľné polia:

- `message`,
- `details`,
- `hint`,
- `code`,
- `error_description`.

Neznáma objektová chyba sa už nezobrazí ako `[object Object]`.

## Databáza

Nové tabuľky:

- `service_email_channels`,
- `service_email_messages`.

Nové RPC / serverové prvky:

- `get_service_email_channels()`,
- `upsert_service_email_channel(jsonb)`,
- `delete_service_email_channel(uuid)`,
- `ingest_service_email(jsonb)` – iba `service_role`,
- `service_email_subject_v046()` – garantuje ticket ID v outbound predmete.

## Bezpečnostný model

- konfiguráciu inbound kanálov mení iba admin/manager,
- browser nemá priamy INSERT/UPDATE/DELETE na inbound tabuľky,
- samotný inbound ingest RPC je povolený iba `service_role`,
- Edge Function vyžaduje `x-servicedesk-inbound-secret`,
- payload má limit 4 MB,
- inbound prílohy sú limitované,
- opakovaný `messageId` je idempotentne ignorovaný.

## Nie je súčasťou v0.46

- priame IMAP/POP3 polling spojenie,
- konkrétny vendor mail provider,
- OCR/AI klasifikácia obsahu e-mailu,
- automatické vyťahovanie veľkých príloh do objektového storage.

Mail gateway musí vedieť POSTnúť JSON webhook do Edge Function. Tým zostáva riešenie nezávislé od konkrétneho mail servera.
