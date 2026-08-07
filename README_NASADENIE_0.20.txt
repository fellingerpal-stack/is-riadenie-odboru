IS Riadenie odboru v0.20.0 – RACI Intelligence
================================================

ODPORÚČANÝ POSTUP
1. Zálohujte aktuálny projekt v0.19.0.
2. Nahraďte projekt obsahom FULL balíka alebo použite install-v0200-raci-intelligence.mjs.
3. Skontrolujte .env nastavenie Supabase – release nepridáva nové premenné.
4. Spustite:
   npm install
   npm run build
5. Nasaďte štandardným spôsobom na Vercel.

ČO OTESTOVAŤ
- Odbor 3.2 -> RACI matica -> RACI Intelligence.
- Odbor 3.1 -> RACI OIT -> RACI Intelligence.
- Prepínanie Oba odbory / 3.1 / 3.2.
- What-if simuláciu pri viacerých pracovníkoch.
- Rebríček bus factor, dvojice väzieb a návrhy zástupcov.
- Po zmene RACI role skontrolujte, že sa Intelligence prepočíta.

DATABÁZA
Nie je potrebná žiadna nová SQL migrácia.
