# Upgrade na v0.7.0 v StackBlitz

## Odporúčaný postup

1. Rozbaľte inštalačný ZIP.
2. Nahrajte do koreňa projektu priečinok `release-v07` a súbor `install-v07.mjs`.
3. V termináli spustite:

```bash
node install-v07.mjs
npm run dev
```

4. Obnovte náhľad cez `Ctrl + F5`.

## Kontrola

Po úspešnom nasadení:

- v ľavom menu je položka **Problem management**,
- dole vľavo je verzia **v0.7.0**,
- adresa `#/problems` otvorí nový modul,
- existujúce ServiceDesk a Change management dáta zostali zachované.

## Ručné nasadenie

Pri ručnom nasadení nahraďte všetky súbory z balíka „len zmenené súbory“ podľa ich adresárovej štruktúry. Nové súbory `ProblemManagement.tsx` a `ProblemManagement.css` musia byť uložené v `src/views`.
