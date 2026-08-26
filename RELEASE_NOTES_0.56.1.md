# IS Riadenie odboru v0.56.1
## Project Financial + IS/Service Integration

v0.56.1 je finalny release nad v0.55.0. Obsahuje kompletne financne prepojenie z v0.56.0 a doplna zakladanie projektov rozvoja priamo z existujuceho informacneho systemu alebo sluzby.

### 1. Projekt priamo z existujuceho informacneho systemu
V detaile Informacneho systemu pribudla sekcia **Projekty / rozvoj** a akcia **Vytvorit projekt rozvoja**.

Pri vytvoreni projektu sa predvyplni:
- nazov `<IS> - rozvoj`,
- typ `Rozvoj existujuceho IS`,
- gestor/sponsor z vecneho gestora IS, ak je evidovany,
- ciel a popis z existujucich udajov IS.

Po ulozeni sa automaticky vytvori vazba projektu na zdrojovy IS. Ak ma IS evidovane cislo zmluvy alebo dodavatela, vytvoria sa aj samostatne projektove vazby na tieto existujuce referencie.

Zdrojovy register IS sa nekopiruje do druhej evidencie. Projekt si uchovava vazbu cez project_links a zdrojovy IS zostava autoritativnym zaznamom.

### 2. Projekt priamo zo sluzby
V detaile sluzby pribudla akcia **Projekt rozvoja**.

Projekt sa zalozi ako `Rozvoj sluzby`, predvyplni sa nazov, biznis vlastnik ako sponsor a vytvori sa vazba na konkretne ID a nazov sluzby.

### 3. Obojsmerne zobrazenie
Detail IS aj detail sluzby zobrazuju aktualne prepojene projekty. Jeden IS alebo sluzba mozu mat viac samostatnych projektov rozvoja v roznych obdobiach.

V karte projektu zostava existujuca zalozka **Vazby**, kde je viditelny zdrojovy IS/sluzba, zmluva, dodavatel a ostatne prepojenia.

### 4. Projektovy formular pri vytvoreni z evidencie
Ak projekt vznikol z existujuceho IS alebo sluzby, formular zobrazi informacny banner s referenciami, ktore sa po ulozeni automaticky prepoja.

### 5. Financovanie z v0.56.0 zostava kompletne zahrnute
- Pripojit IT ulohu 10 / 22 / 25.
- Cela uloha / projektova alokacia / podla ZAK / vybrane financne polozky.
- Synchronizovany rozpocet, cerpanie a zostatok.
- Drill-down na zdrojove financne riadky.
- Manualny **Novy zdroj financovania** zostava zachovany.
- Existujuce manualne financovanie sa automaticky neprepisuje.
- Financny signal sa zapaja do Project Health.

### Databaza
v0.56.1 nepridava novu databazovu schemu nad v0.56.0. Ak nasadzujete priamo z v0.55.0, je potrebne spustit `supabase/migration_project_finance_v056.sql` z DATABASE balika. Existujuca tabulka `project_links` uz podporuje nove vazby IS/sluzba/zmluva/dodavatel, preto dalsia SQL migracia nie je potrebna.

### Opravnenia
- Admin a Projektovy manazer mozu vytvarat projekt, ak maju pristup do prislusneho zdrojoveho modulu a pravo riadit projekty.
- Projektovy clen vidi len projekty v rozsahu svojho projektoveho clenstva.
- Zdrojove IS/sluzby sa samotnym vytvorenim projektu nemenia.
