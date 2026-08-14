# ServiceDesk Email Worker v0.45

## Architektúra

1. Ticket alebo SLA event vytvorí in-app `service_notification`.
2. Ak má cieľ e-mail a skupina povoľuje email notifications, DB vloží položku do `service_email_outbox`.
3. Edge Function claimne dávku cez service-role RPC.
4. Function pošle payload do organizáciou zvoleného mail gateway webhooku.
5. Výsledok zapíše ako `sent`, `retry` alebo `failed`.

Tento model je zámerne provider-neutral – release nevynucuje Resend, SendGrid ani konkrétny SMTP produkt.

## Secrets

- `SERVICEDESK_WORKER_SECRET` – tajomstvo pre volanie worker endpointu.
- `SERVICEDESK_EMAIL_WEBHOOK_URL` – HTTPS endpoint interného mail gateway.
- `SERVICEDESK_EMAIL_WEBHOOK_TOKEN` – voliteľný Bearer token pre gateway.
- `SERVICEDESK_APP_URL` – URL aplikácie pre link `Otvoriť ServiceDesk`.

## Očakávaný gateway request

```json
{
  "to": "user@example.sk",
  "subject": "ServiceDesk ...",
  "html": "<p>...</p>",
  "source": "CVTI ServiceDesk"
}
```

Gateway má pri úspechu vrátiť HTTP 2xx. Neúspech sa v outboxe retryuje; po piatich pokusoch položka ostane `failed` na diagnostiku.

## Bezpečnosť

Edge Function musí byť volaná iba schedulerom, ktorý pozná `SERVICEDESK_WORKER_SECRET`. Service-role key sa nesmie dostať do browser frontendu.
