# IS Riadenie odboru v0.52.0 – Karta projektu a kapacitné plánovanie

## Hlavné zmeny

- Kliknutie na projekt už iba neoznačí kartu v portfóliu. Otvorí samostatnú **Kartu projektu**.
- Karta projektu má vlastné záložky: **Karta projektu**, **Delivery a úlohy**, **Tím a kapacity**, **Financovanie**, **Väzby**.
- Admin a projektový manažér môžu z karty projektu projekt upraviť, pridávať/odoberať členov, meniť projektové roly a alokáciu, spravovať míľniky, úlohy, financovanie a väzby.
- Pribudla portfóliová záložka **Kapacity**. Zobrazuje vyťaženie jednotlivých ľudí podľa percentuálnych alokácií a obdobia platnosti.
- Kapacity sa dajú filtrovať podľa mesiaca a vyhľadávať podľa človeka, projektu alebo projektovej roly.
- Súčet alokácií nad 100 % sa označí ako preťaženie, 80–100 % ako vysoké vyťaženie.
- Člen projektu v kapacitách vidí iba **svoje vlastné alokácie** v projektoch, do ktorých má prístup.
- Projektový manažér je od v0.52.0 serverovo obmedzený iba na projekty, ku ktorým je priradený ako PM. Admin naďalej vidí a riadi všetko.
- Projektový manažér nemôže sám prepisovať vlastníctvo projektu na iného PM; zmenu PM vykonáva Admin.

## Databáza

Po už nasadenej v0.51.0 treba spustiť iba:

`supabase/migration_project_capacity_v052.sql`

Migrácia nemení existujúce projektové dáta. Dopĺňa server-side scope funkciu a ochranné triggery pre projektového manažéra.
