# Contract & Renewal Control – metodika v0.30

## Cieľ

Modul spája zmluvnú referenciu s dodávateľom, informačným systémom/službou, SLA, finančným čerpaním a termínom obnovy.

## Zdroj vs. spravovaná karta

**Zdrojový záznam** vzniká z existujúcich platieb, Supplier Relationships alebo registra informačných systémov. Aplikácia ho nemení.

**Spravovaná karta** je administrátorské doplnenie. Môže obsahovať platnosť, hodnotu, ownera, SLA, CRZ/DMS a renewal parametre.

## Výpočet obnovy

Od dátumu `Platnosť do` sa odpočíta:

`max(výpovedná lehota, lead-time obstarávania)`.

Výsledkom je odporúčaný dátum, kedy treba začať obnovu. Ide o riadiaci signál, nie právne stanovisko ani automatické rozhodnutie o obstarávaní.

## Finančné hodnoty

`Čerpanie YTD` je suma zdrojových platieb s konkrétnou zmluvnou referenciou v dostupnom SIT snapshote. Nie je to automaticky celková hodnota zmluvy ani konečné ročné čerpanie.

## SLA

SLA sa eviduje ako požiadavka + cieľ + stav. Ak je SLA povinné a stav chýba, vzniká Data Quality signál.

## Oprávnenia

- čítanie: podľa Shared READ,
- editácia spravovaných zmlúv: iba admin + Shared WRITE,
- serverová snapshot funkcia zachová contract master dáta pri pokuse ne-admin používateľa o zmenu.
