# Release 0.27.2 – UI alignment pre Asset Management

Release 0.27.2 upravuje vizuál modulu **Asset management**, aby bol konzistentný
so zvyškom aplikácie a odstránil „neuhladený“ vzhľad tlačidiel a filtrov.

## Čo sa mení

- zjednotený vzhľad horného briefing bloku a KPI kariet,
- upravené taby (`Prehľad`, `Register aktív`, `Inventarizácia`, `Hromadný import`, `Väzby / CMDB`, `Lifecycle radar`),
- zjednotený vzhľad filtrov, selectov a vyhľadávania v registri aktív,
- jemnejšie a konzistentnejšie hover/focus stavy tlačidiel a ikonových akcií,
- vizuálne upravené zoznamy v kartách `Prehľad`, `Väzby / CMDB` a `Lifecycle radar`,
- zjednotený vzhľad importných krokov a Asset 360 detailu,
- doplnený konzistentný focus ring namiesto surového browser outline.

## Technický rozsah

Menia sa iba front-end štýly a interná verzia aplikácie:

- `src/views/Cmdb.css`
- `src/lib/storage.ts`
- `src/data/seed.json`
- `package.json`

## Databáza

- bez zmeny SQL,
- bez zmeny Supabase schémy,
- bez zmeny RLS.

## Poznámka

Ide o UX/UI úpravu. Biznis logika modulu Asset Management ostáva zachovaná.
