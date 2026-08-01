KOMPLETNA OPRAVA 0.8D

Táto oprava nahradí celý priečinok src konzistentnou verziou aplikácie.
Obsahuje Helpdesk, Change management, Problem management a IAM / Prístupy.
Zachováva dáta v localStorage aj Supabase; mení iba zdrojové súbory.

POSTUP V STACKBLITZ:
1. Nahraj install-komplet-fix-08d.mjs do koreňa projektu vedľa package.json.
2. V termináli ukonči bežiaci Vite cez Ctrl+C.
3. Spusti: node install-komplet-fix-08d.mjs
4. Spusti: npm run dev
5. Obnov náhľad cez Ctrl+F5.

Over priame cesty: #/changes, #/problems, #/iam
Skript automaticky vytvorí zálohu pôvodného src.
