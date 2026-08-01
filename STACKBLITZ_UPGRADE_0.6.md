# Nasadenie verzie 0.6 do StackBlitz

Odporúčaný spôsob je inštalátor z balíka `IS_Riadenie_odboru_v0.6_INSTALLER.zip`.

1. Nahraj do koreňa projektu priečinok `release-v06` a súbor `install-v06.mjs`.
2. V termináli spusti `node install-v06.mjs`.
3. Spusti `npm run dev` a obnov náhľad cez `Ctrl + F5`.
4. V ľavom menu sa pod Helpdeskom zobrazí `Change management` a dole verzia `v0.6.0`.

SQL schéma je voliteľná. Aktuálna aplikácia môže naďalej ukladať celý stav cez existujúci Supabase snapshot.
