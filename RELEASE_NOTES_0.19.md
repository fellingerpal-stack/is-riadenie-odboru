# Release 0.19.0 – spoločný pohľad a porovnanie RACI odborov

## Porovnanie odborov 3.1 a 3.2

- Do RACI OIT aj RACI ORIS pribudla karta **Porovnanie 3.1 / 3.2**.
- Porovnanie pracuje s aktuálnou maticou odboru 3.2 zo synchronizovaného stavu aplikácie a so zdrojovou RACI maticou odboru 3.1.
- Zobrazuje rozsah matíc, počet oblastí, interných účastníkov, formálnu úplnosť, chýbajúce alebo viacnásobné A, chýbajúce R, jediných vykonávateľov a spojené A/R.
- Kombinované zápisy `A/R`, `R/A`, `R/C` a podobné hodnoty sa pri analytike normalizujú na jednotlivé roly.

## Rovnaký osobný pohľad pre odbor 3.2

- RACI matica odboru 3.2 získala priamo kartu **Ľudia a výkon rolí** v rovnakom štýle ako RACI OIT.
- Pri každom pracovníkovi sa zobrazujú počty R, A, C, I, kombinované A/R, procesy s jediným R a percento zapojenia do matice.
- Karty možno zoradiť podľa praktického vykonávania R, formálneho vlastníctva A, jediného vykonávateľa alebo celkového zapojenia a filtrovať podľa mena alebo roly.

## Manažérske porovnanie

- Nový pohľad obsahuje spoločné súhrnné karty oboch odborov, porovnávaciu tabuľku a distribúciu rolí R/A/C/I.
- Samostatne zobrazuje odborné oblasti každej matice a externé alebo medziútvarové priradenia odboru 3.2.
- Rebríčky ukazujú najvýraznejších vykonávateľov R a vlastníkov A v každom odbore.
- V spodnej časti možno prepínať kompletný osobný pohľad medzi odborom 3.1 a 3.2 bez odchodu z porovnania.

## Technické zmeny

- Pribudla spoločná analytická vrstva `src/lib/raciAnalytics.ts`.
- Pribudli komponent a štýly `src/views/RaciComparison.tsx` a `src/views/RaciComparison.css`.
- Release nevyžaduje nový Supabase SQL skript ani zmenu databázovej schémy.
