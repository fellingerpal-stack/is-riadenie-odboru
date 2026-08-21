IS Riadenie odboru – nasadenie v0.48.2
======================================

TOTO JE IBA FRONTEND BUILD HOTFIX.

1. V Supabase nič nespúšťaj.
   - Ak v0.48.1 migrácia už skončila TRUE / TRUE, DB je hotová.

2. Nahraj FULL v0.48.2 alebo zmenené súbory do GitHub main.

3. Nechaj Vercel spustiť štandardný build:
   npm run build

4. Očakávané:
   - chyba TS18048 na Helpdesk.tsx:839 už nesmie byť,
   - aplikácia zobrazí v0.48.2,
   - ServiceDesk workflow funguje rovnako ako v0.48.1.

SMOKE TEST
- otvor ticket ako resolver,
- zmeň riešiteľskú skupinu / riešiteľa,
- vyplň Riešenie / výsledok,
- Vyriešiť,
- Uzatvoriť.

Bez vyplneného Riešenie / výsledok musí aplikácia uzatvorenie odmietnuť.
