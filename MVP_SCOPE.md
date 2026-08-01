# MVP rozsah – release 0.2

## Cieľ

Overiť spoločné riadenie rolí, zodpovedností, služieb, zastupiteľnosti, kapacít, projektov, úloh, rizík a rozhodnutí v jednej aplikácii s reálnym prihlásením a zdieľaným ukladaním.

## Aktívne moduly

1. Dashboard
2. Ľudia a roly
3. RACI matica
4. Služby a systémy
5. Zastupiteľnosť
6. Kapacity
7. Projekty a úlohy
8. Riziká
9. Rozhodnutia
10. Používatelia a oprávnenia
11. Nastavenia, záloha a synchronizácia

## Technický model

- React + TypeScript + Vite
- Supabase Auth
- role admin / manager / viewer
- Row Level Security podľa organizácie
- verzované JSON snapshoty
- lokálna cache a JSON export/import
- Vercel hosting

## Vedome odložené

- automatické notifikácie,
- komentáre a prílohy,
- detailný kalendár a Gantt,
- ServiceDesk/Helpdesk,
- incident management,
- change management,
- problem management,
- IAM workflow,
- CMDB a majetok,
- samostatné relačné tabuľky pre každý modul,
- kompletný audit každej zmeny po jednotlivých poliach.
