IS Riadenie odboru – release 0.14.0
========================================

Release rozdeľuje aplikáciu na samostatné pracovné priestory ORIS a OIT.

STACKBLITZ
1. Nahraj install-v0140-oris-oit-portal.mjs vedľa package.json.
2. Spusti:
   node install-v0140-oris-oit-portal.mjs
   npm run build
3. Očakávaj hlášku VERIFIED.

GITHUB
Nahraj celý obsah priečinka github-files so zachovaním ciest. Diagramy zo zložky SUPABASE_STORAGE_UPLOAD do GitHubu nenahrávaj.

SUPABASE
1. SQL Editor: spusti SUPABASE_OIT_DOCUMENTS_0.14.sql.
2. Storage -> oit-documents: nahraj presne:
   - topologia.png
   - oob.png
Bucket musí zostať PRIVATE. Aplikácia vytvára iba 15-minútové podpísané odkazy pre oprávnených používateľov.

VERCEL
Po stave Ready obnov aplikáciu cez Ctrl+Shift+R. Vľavo dole musí byť v0.14.0.
