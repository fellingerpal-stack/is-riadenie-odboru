# Upgrade zo release 0.3 na 0.3A

## Odporúčaný postup

1. Uložte aktuálny StackBlitz projekt cez **Save**.
2. Stiahnite a rozbaľte release 0.3A.
3. V StackBlitz nahraďte celý priečinok `src` priečinkom `src` z release 0.3A.
4. Nahraďte aj koreňový súbor `package.json`.
5. Počkajte na obnovenie aplikácie; ak sa náhľad neobnoví, v termináli spustite `npm run dev`.
6. Skontrolujte modul **Projekty a úlohy** a päť horných KPI kariet.

## Minimálna opravná inštalácia

Ak nechcete nahrádzať celý priečinok `src`, nahraďte tieto súbory:

- `src/views/Work.tsx`
- `src/views/Work.css` – nový súbor
- `src/lib/storage.ts`
- `src/data/seed.json`

Existujúce lokálne aj Supabase údaje zostanú zachované. Release nemení databázovú schému.
