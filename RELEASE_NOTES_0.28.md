# Release 0.28.0 – Smart Workspace & UX Simplification

Release 0.28.0 sa zameriava na rýchlejšiu každodennú prácu v aplikácii. Nepridáva ďalší izolovaný register; zjednodušuje prístup k údajom, ktoré už aplikácia obsahuje.

## 1. Moje centrum

Nový spoločný pohľad `Moje centrum` vytvára personalizovanú pracovnú frontu podľa prihláseného používateľa:
- moje otvorené úlohy,
- Helpdesk položky, ktoré riešim alebo som ich zadal,
- IAM požiadavky, ktoré riešim alebo schvaľujem,
- finančné/riadiace opatrenia, kde som owner,
- moje aktíva s inventúrnym alebo lifecycle signálom.

Položky sú rozdelené na `Dnes / po termíne`, `Do 7 dní` a `Na sledovanie`.
Admin/manager navyše vidí manažérsky Action Center so súhrnnými signálmi.

## 2. Globálne hľadanie Ctrl+K

V topbare pribudlo globálne hľadanie dostupné cez `Ctrl+K` / `Cmd+K`.
Vyhľadáva naprieč dostupným scope v:
- aktívach a CI,
- službách,
- dodávateľoch a IČO,
- úlohách a projektoch,
- Helpdesku,
- IAM požiadavkách,
- rizikách,
- navigačných skratkách.

Výsledok vedie priamo do príslušného modulu; pri assete sa otvorí Asset 360.

## 3. Data Quality Center

Nový pohľad `Kvalita dát` prioritizuje opraviteľné medzery:
- aktíva bez ownera,
- aktíva bez identifikátora,
- inventúrne nezhody,
- chýbajúcu väzbu asset → služba,
- lifecycle / warranty / support termíny,
- možné duplicity,
- služby s chýbajúcim vlastníctvom alebo kontinuitou,
- RACI procesy bez A/R,
- otvorené úlohy bez ownera,
- dodávateľské profily na doplnenie.

Skóre kvality je orientačný indikátor úplnosti evidencie, nie audit zdrojových systémov.

## 4. Asset Management – Saved Views

V registri aktív je možné uložiť aktuálnu kombináciu filtrov do lokálneho `Uloženého pohľadu` a neskôr ju jedným klikom obnoviť.
Uložené pohľady sú používateľská preferencia prehliadača a nemenia centrálny snapshot.

## 5. Asset Management – hromadné operácie

Register aktív podporuje označenie viacerých položiek a hromadnú zmenu:
- inventúrneho stavu,
- lokality,
- pridelenej osoby,
- vecného vlastníka,
- technického vlastníka,
- lifecycle,
- scope (iba admin).

Hromadná zmena rešpektuje existujúce W oprávnenia scope a zapisuje auditnú stopu do histórie aktíva.

## 6. Zjednodušená navigácia

Spoločný portál je preusporiadaný do štyroch pracovných skupín:
- Pracovný priestor,
- IT prostredie,
- Financie,
- Správa.

Detailná navigácia odborov 3.1 a 3.2 zostáva dostupná po vstupe do príslušného odboru.

## 7. IAM a databáza

- Bez nového Supabase SQL.
- Bez zmeny RLS.
- `Moje centrum`, globálne hľadanie a Data Quality rešpektujú dostupný scope používateľa.
- Hromadný zápis assetov používa rovnaké aplikačné scope pravidlá ako individuálna úprava assetu.

## 8. Technické zmeny

- bez nových npm dependencies,
- verzia aplikácie: `0.28.0`,
- nové komponenty: `GlobalSearch`, `MyWorkspace`, `DataQuality`,
- rozšírený Asset Management o saved views a bulk edit.
