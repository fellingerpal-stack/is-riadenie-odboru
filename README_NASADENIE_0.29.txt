IS Riadenie odboru v0.29.0 – Supplier Relationships & Vendor Dependency
=======================================================================

Odporúčaný upgrade: v0.28.0 -> v0.29.0

VARIANT A – LEN ZMENENÉ SÚBORY
1. Urob zálohu aktuálneho projektu.
2. Rozbaľ IS_Riadenie_odboru_v0.29.0_LEN_ZMENENE_SUBORY.zip do koreňa projektu.
3. Potvrď prepísanie existujúcich súborov.
4. Spusti npm install iba ak v projekte chýbajú node_modules. Nová dependency nepribudla; XLSX už projekt používa.
5. Spusti npm run build alebo nechaj Vercel vykonať štandardný build.
6. Po deployi sprav hard refresh (Ctrl+F5).

VARIANT B – KOMPLETNÝ RELEASE
Nahraď projekt obsahom IS_Riadenie_odboru_v0.29.0_FULL.zip a vykonaj štandardný build/deploy.

VARIANT C – INSTALLER
1. Skopíruj install-v0290-supplier-relationships.mjs do koreňa projektu v0.28.0.
2. Spusti:
   node install-v0290-supplier-relationships.mjs
3. Installer vytvorí zálohu menených súborov.
4. Následne spusti npm run build alebo Vercel deployment.

SUPABASE
- Nový SQL skript sa nespúšťa.
- RLS sa nemení.
- Nové pole supplierRelationships sa ukladá v existujúcom synchronizovanom snapshot JSON.
- Starší snapshot sa pri načítaní automaticky migruje na supplierRelationships: [].

KONTROLA PO NASADENÍ
- verzia v aplikácii: v0.29.0,
- Dodávatelia -> InterWay obsahuje Supplier 360 Vendor Dependency,
- CREPČ/CREUČ/VedaTechnika sú zdrojové väzby,
- ISS/SKCRIS/SCIDAP/SVD/CRZP/APS-Antiplag sa zobrazia ako kandidáti Na preverenie,
- admin vidí Potvrdiť / Upraviť / Zamietnuť,
- admin môže otvoriť Import väzieb a načítať CSV/XLSX,
- bežný používateľ má read-only pohľad,
- Data Quality Center obsahuje signál dodávateľských väzieb na potvrdenie,
- Ctrl+K nájde dodávateľa aj podľa názvu prepojeného systému/modulu.
