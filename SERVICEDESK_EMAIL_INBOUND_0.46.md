# ServiceDesk v0.46 – inbound e-mail gateway

## Edge Function

`supabase/functions/service-email-inbound/index.ts`

Funkcia je zámerne provider-neutral. CVTI môže pred ňu postaviť interný mail gateway, Microsoft 365/Graph adaptér alebo inú integračnú službu. Gateway musí e-mail znormalizovať do JSON.

## Header

```text
x-servicedesk-inbound-secret: <secret>
Content-Type: application/json
```

## Minimálny payload

```json
{
  "messageId": "<unique-message-id@example>",
  "from": "Meno Používateľa <pouzivatel@example.sk>",
  "to": "servicedesk@cvtisr.sk",
  "subject": "Nejde mi tlačiareň",
  "text": "Prosím o preverenie tlačiarne na 2. poschodí."
}
```

## Reply na existujúci ticket

Predmet musí obsahovať ID existujúceho ticketu, napr.:

```text
Re: [REQ-2026-0814-142030-A1B2] ServiceDesk prijal ticket ...
```

Outbound ServiceDesk od v0.46 dopĺňa `[ID]` automaticky.

## Prílohy

Voliteľné pole:

```json
{
  "attachments": [
    {
      "name": "screenshot.png",
      "contentType": "image/png",
      "size": 123456,
      "base64": "iVBORw0KGgo..."
    }
  ]
}
```

Limity: najviac 5 príloh, každá do 750 kB.

## Bezpečnosť

- webhook secret musí byť dlhý náhodný secret,
- Service Role key nikdy nesmie byť v browseri ani v mail gateway klientskom kóde,
- Edge Function drží Service Role na serveri,
- nastavte `SERVICEDESK_OUTBOUND_FROM` na reálnu From adresu ServiceDesku,
- mail gateway by mal navyše filtrovať automatické odpovede/bounce správy podľa vlastných hlavičiek.

## Centrálny vs. skupinový mailbox

Odporúčanie pre produkciu:

- centrálna adresa `servicedesk@...` ako primárny vstup pre zamestnancov,
- skupinové aliasy (`komis@...`, `infra@...`, `tlac@...`) iba tam, kde je to organizačne užitočné,
- routing pravidlá a e-mailové kanály nech zostávajú zdrojom pravdy pre frontu.
