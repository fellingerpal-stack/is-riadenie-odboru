# Release 0.23.0 – Service 360 a Riadiace centrum IT

Release 0.23.0 nadväzuje na Technology Intelligence a finančný modul v0.22. Cieľom je zjednotiť prevádzkový, personálny, technologický a finančný obraz do jedného manažérskeho pracovného priestoru.

## 1. Riadiace centrum IT / Control Tower

Nový spoločný modul **Riadiace centrum IT** je dostupný z portálu odborov 3.1 aj 3.2, Technologického katalógu a IT nákladov.

Control Tower vytvára vysvetliteľnú frontu signálov z existujúcich registrov:
- Service Health a kontinuita služby,
- RACI a procesy s jediným R,
- otvorené problémy a prioritné tickety,
- blížiace sa lifecycle termíny,
- rozpočtový forecast úloh 10 / 22 / 25,
- metodické upozornenia pri finančnom mapovaní.

Nejde o externé AI API ani automatické personálne hodnotenie. Signály sú deterministické a dajú sa spätne vysvetliť cez zdrojové dáta.

## 2. Service 360

Každá evidovaná služba získala spoločný 360° pohľad:
- business a technický vlastník, primárny riešiteľ a zástupca,
- RTO, monitoring, backup a supplier SLA,
- RACI 3.2 a názvovo súvisiaca RACI 3.1,
- technológie a CMDB položky,
- tickety, problémy a zmeny,
- riziká, projekty a úlohy,
- 5-ročná finančná stopa a RUN / CHANGE,
- kontraktová expozícia na úlohy 10 / 22 / 25,
- TOP dodávateľské identity a koncentrácia.

Väzby používajú priame `serviceId` tam, kde existuje. Názvový fallback je konzervatívny a odstraňuje všeobecné slová, aby sa obmedzili falošné prepojenia.

## 3. Service Health a Attention Score

Service Health 0–100 kontroluje pripravenosť prevádzkových údajov a kontinuitu, napríklad vlastníka, zástupcu, runbook, monitoring, backup, SLA, RACI, problémy a lifecycle.

Attention Score slúži iba na zoradenie manažérskej pozornosti. Do skóre vstupuje napríklad kritickosť, chýbajúci zástupca, single-R, otvorený problém, prioritný incident, blízky lifecycle termín alebo rozpočtové riziko.

## 4. Lifecycle radar

Spoločný radar zobrazuje iba termíny, ktoré už existujú v registroch:
- licencia,
- podpora,
- kontrakt,
- záruka.

Možno filtrovať horizont 30 / 90 / 180 / 365 dní alebo všetko a typ termínu. Aplikácia nevymýšľa chýbajúce dátumy.

## 5. Dodávatelia a zmluvné referencie SIT 2026

Do release pribudol riadkový dataset platieb zo zdroja `čerpanie_01_05_2026_import_ready.xlsx` za január až máj 2026.

Pohľad umožňuje:
- filtrovať úlohu 10 / 22 / 25 alebo všetky,
- zoradiť dodávateľské identity podľa finančného objemu,
- zobraziť TOP 2 koncentráciu,
- vidieť počet platieb, strediská, zmluvné referencie a typické poznámky,
- rozlíšiť priame mapovanie a metodické reconciliačné mapovanie.

Ak zdroj obsahuje iba IČO/identifikátor firmy, aplikácia nezobrazuje vymyslený obchodný názov.

## 6. Metodická hranica úlohy 25

Riadkové platby sú mapované takto:
- úloha 10 – strediská 130 / 328,
- úloha 22 – stredisko 341,
- úloha 25 – stredisko 345 je označené ako priame; ďalšie IT/telekom strediská sú samostatne označené ako reconciliačné pravidlo potrebné na zhodu s autoritatívnym súhrnom.

V datasete v0.23 je pri úlohe 25:
- 25 797,65 € zo strediska 345,
- 11 684,73 € z ostatných stredísk cez reconciliačné pravidlo,
- spolu 37 482,38 €, čo presne zodpovedá súhrnu úlohy 25.

## 7. Rozpočtový forecast

Nový forecast pracuje s autoritatívnym čerpaním január–máj 2026 a ponúka tri scenáre:
- priemer doterajších mesiacov,
- tempo posledných troch mesiacov,
- konzervatívny scenár – vyšší z uvedených priemerov pre zostávajúce mesiace.

Zobrazuje mesačné čerpanie, forecast 31.12., FY využitie rozpočtu a odchýlku po jednotlivých úlohách. Forecast je analytická projekcia, nie schválený finančný plán.

## 8. Integrácia do existujúceho UI

- nový spoločný menu bod **Riadiace centrum IT**,
- vstupná karta na Portáli odborov,
- tlačidlo z Technologického katalógu,
- tlačidlo z IT nákladov,
- bez novej databázovej migrácie.

## Nové súbory

- `src/lib/managementIntelligence.ts`
- `src/views/OperationsIntelligence.tsx`
- `src/views/OperationsIntelligence.css`
- `src/data/contractPayments.json`

## Upravené súbory

- `src/App.tsx`
- `src/views/DepartmentPortal.tsx`
- `src/views/TechnologyCatalog.tsx`
- `src/views/ItCosts.tsx`
- `src/lib/storage.ts`
- `src/data/seed.json`
- `package.json`

## Databáza

Release 0.23.0 nevyžaduje nový Supabase SQL skript ani zmenu databázovej schémy.
