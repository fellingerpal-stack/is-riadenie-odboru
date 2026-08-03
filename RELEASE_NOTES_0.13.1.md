# Release 0.13.1 – prístup k administrácii a oprava digitálneho portfólia

## Bezpečnosť menu

- `Používatelia` vidí iba rola `admin`.
- `Roadmap a nastavenia` vidí iba rola `admin`.
- Pri ručnom otvorení `#/users` alebo `#/roadmap` je neadministrátor presmerovaný na Dashboard.

## Digitálne portfólio

- Pri chýbajúcich tabuľkách `website_registry` alebo `information_system_registry` aplikácia nezostane prázdna.
- Zobrazí zdrojové dáta z release balíka v režime iba na čítanie.
- Zobrazí zrozumiteľný pokyn na spustenie SQL opravy 0.13.1.
- Po vytvorení tabuliek a obnovení stránky sa automaticky prepne späť na Supabase register.

## Databáza

Súčasťou release je idempotentná SQL oprava, ktorá vytvorí a naplní:

- `public.website_registry`
- `public.information_system_registry`
- `public.digital_portfolio_activity`

Vrátane RLS, RPC funkcií, auditu a Realtime.
