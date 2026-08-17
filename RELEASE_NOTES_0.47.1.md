# Release v0.47.1 – Service Catalog + ServiceDesk 42702 hotfix

## Cieľ
Nahrádza v0.47.0 pre produkčné nasadenie. Zachováva celý Service Catalog a opravuje PostgreSQL chybu 42702 `organization_id is ambiguous`, ktorá blokovala načítanie E-mail → Ticket a SLA kalendára na databáze v0.46.

## Oprava
Dotknuté ServiceDesk RPC teraz vždy používajú explicitný alias `cfg.organization_id` / `cfg.user_id` pri čítaní kontextu z `assert_service_configurator()`. Oprava je aplikovaná nielen na dva čítacie RPC zo screenu, ale aj na súvisiace write/config RPC pre skupiny, routing, SLA kalendár a e-mailové kanály.

## Service Catalog
Funkcionalita v0.47.0 zostáva bezo zmeny: katalóg služieb, smart formuláre, admin konfigurácia, serverová validácia katalógovej položky a následný routing/SLA.

## SQL varianty
- `migration_servicedesk_v0471.sql`: použiť pri prechode z produkčnej v0.46. Obsahuje celý v0.47 Service Catalog + hotfix.
- `migration_servicedesk_v0471_hotfix_only.sql`: použiť iba ak už bola pôvodná migrácia v0.47 spustená.
