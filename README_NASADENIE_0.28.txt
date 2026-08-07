IS RIADENIE ODBORU v0.28.0 – SMART WORKSPACE
=============================================

Východisková verzia: v0.27.2
Cieľová verzia:      v0.28.0

Odporúčané nasadenie:
1. Zálohujte / commitnite aktuálnu v0.27.2.
2. Rozbaľte IS_Riadenie_odboru_v0.28.0_LEN_ZMENENE_SUBORY.zip do koreňa projektu a povoľte prepísanie súborov.
   ALEBO spustite: node install-v0280-smart-workspace.mjs
3. Nie sú potrebné nové npm balíky; package.json mení iba verziu.
4. Spustite npm run check a npm run build.
5. Commit/push a deploy na Vercel.
6. Po deployi urobte Ctrl+F5.

Kontrola po nasadení:
- spodný ľavý stav aplikácie zobrazuje v0.28.0,
- v spoločnom portáli je `Moje centrum`,
- topbar obsahuje tlačidlo Hľadať / Ctrl K,
- Ctrl+K otvorí globálne hľadanie,
- v menu je `Kvalita dát`,
- Asset management > Register aktív umožňuje označiť viac riadkov,
- po označení sa zobrazí panel Hromadná úprava,
- v Asset filtroch je `Uložené pohľady`.

Databáza:
- nový Supabase SQL sa NEVYKONÁVA,
- existujúca IAM migrácia v0.26 zostáva platná,
- žiadna zmena RLS.

Poznámka k Saved Views:
- uložené asset pohľady sú uložené v localStorage konkrétneho prehliadača,
- nie sú zdieľané medzi používateľmi ani zariadeniami.
