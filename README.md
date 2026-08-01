# IS Riadenie odboru CVTI SR

React + TypeScript + Vite aplikácia pre riadenie odboru, RACI, služby, zastupiteľnosť, kapacity, projekty, úlohy, ServiceDesk, Change management, Problem management, IAM a CMDB.

## Verzia 0.10.0

Release 0.10 dopĺňa produkčný základ pre používateľské účty:

- prihlasovanie cez Supabase Auth,
- obnovu a zmenu hesla,
- správu používateľov a organizačných údajov,
- roly Administrátor, Riaditeľ / manažér, Riešiteľ, Zamestnanec a Čitateľ,
- aktiváciu a deaktiváciu účtov,
- pozývanie používateľov cez Edge Function,
- audit administrátorských zmien,
- posledné prihlásenie,
- automatické cloudové ukladanie s manuálnou zálohou.

Bez `.env` aplikácia funguje v lokálnom demo režime a obrazovka Používatelia používa vzorové účty uložené v prehliadači.

## Spustenie

```bash
npm install
npm run dev
```

Pre reálne účty a prihlásenie postupujte podľa `SUPABASE_SETUP_0.10.md`.
