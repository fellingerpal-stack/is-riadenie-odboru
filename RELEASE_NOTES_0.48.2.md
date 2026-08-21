# Release v0.48.2 – ServiceDesk Workflow build hotfix

## Cieľ
Opraviť Vercel/TypeScript build chybu TS18048 z v0.48.1 bez zmeny databázy alebo funkčného workflow.

## Oprava
V `src/views/Helpdesk.tsx` bola pri validácii uzatvorenia ticketu použitá hodnota `candidate.resolution.trim()`, pričom `resolution` je v type `Ticket` voliteľná. TypeScript preto build zastavil hlásením `candidate.resolution is possibly undefined`.

Kontrola teraz používa bezpečný výraz:

`!(candidate.resolution ?? '').trim()`

Správanie zostáva rovnaké: vyriešený/uzatvorený ticket musí mať vyplnené pole Riešenie / výsledok.

## Databáza
Žiadna zmena. Ak migrácia v0.48.1 skončila `TRUE / TRUE`, nič ďalšie v Supabase nespúšťať.

## Kompatibilita
Všetky funkcie v0.48.1 zostávajú zachované: handover skupiny/riešiteľa, auditná história, OIT/prevádzkoví pracovníci v resolver matici, rýchle vyriešenie/uzatvorenie a Knowledge Base z v0.48.
