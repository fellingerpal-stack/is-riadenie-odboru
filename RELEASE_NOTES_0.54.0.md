# IS Riadenie odboru v0.54.0
## Project Capacity Intelligence

### Cieľ release
Rozšíriť existujúcu záložku Kapacity o manažérsky BI pohľad bez zmeny dátového modelu. Všetky vizualizácie vychádzajú z existujúcich projektových členstiev, percenta alokácie a obdobia platnosti.

### Nové pohľady Kapacít
V záložke **Riadenie projektov -> Kapacity** sa dá prepínať medzi štyrmi pohľadmi:

1. **BI prehľad**
   - počet ľudí s aktívnou alokáciou,
   - plánované FTE,
   - voľná kapacita v FTE,
   - počet preťažených nad 100 %, vysoké vyťaženie 80-100 % a priemer,
   - rozdelenie ľudí do kapacitných pásiem,
   - projekty s najvyššou sumou alokácií,
   - prehľad kapacity podľa projektových rolí,
   - automatické kapacitné riziká.

2. **Heatmapa**
   - horizont 3 / 6 / 12 mesiacov,
   - človek x mesiac,
   - pásma <50 %, 50-79 %, 80-100 %, >100 %,
   - klik na bunku otvorí drill-down alokácií človeka v danom mesiaci,
   - z drill-downu sa dá otvoriť karta projektu.

3. **Graf**
   - stacked horizontal zobrazenie alokácií človeka podľa projektov,
   - škála do 120 %,
   - jasná hranica 100 %,
   - segment projektu je klikateľný a otvorí kartu projektu.

4. **Detail**
   - zachovaný pôvodný detailný zoznam ľudí a ich projektových alokácií,
   - editácia alokácie zostáva dostupná iba tam, kde používateľ môže projekt riadiť.

### Kapacitné riziká
BI automaticky signalizuje najmä:
- osoby nad 100 % kapacity,
- osoby súčasne na 3 a viac projektoch,
- projektové alokácie končiace v referenčnom mesiaci.

Klik na riziko presunie používateľa do heatmapy na konkrétneho človeka a mesiac.

### Oprávnenia
Bez zmeny bezpečnostného modelu v0.53.0:
- **Admin** vidí kapacity všetkých dostupných projektov,
- **Projektový manažér** vidí kapacitné dáta v rozsahu projektov, ktoré mu server sprístupní,
- **Člen projektu** vidí iba vlastné projektové alokácie a vlastnú heatmapu/graf/BI.

### Databáza
**Žiadna nová SQL migrácia.** v0.54.0 je frontendový analytický release a používa existujúce tabuľky/RPC z v0.53.0.

### Build
Release zachováva Vercel prebuild cleanup a kontrolu importov. Verifikačný skript očakáva verziu 0.54.0.
