# Release 0.18.0 – RACI a editovateľná architektúra

## ORIS – ľudia a výkon rolí

- Položka menu **Ľudia a výkon rolí** otvára predvolene analytický pohľad nad RACI maticou odboru 3.2.
- Pri každom pracovníkovi sú oddelene zobrazené roly R, A, C, I, kombinácia A/R, jediný vykonávateľ a percento zapojenia.
- Profily pracovníkov zostávajú dostupné ako samostatná karta.

## OIT – manažérsky RACI pohľad

- RACI OIT získala samostatné pohľady **Manažérsky pohľad**, **RACI matica**, **Riadenie a kontinuita**, **Ľudia a výkon rolí** a **Pravidlá**.
- Manažérsky pohľad vyhodnocuje formálnu úplnosť, jediných vykonávateľov, spojené A/R, koncentráciu výkonu R a odporúčané kroky.
- Prah koncentrácie výkonu R a vybrané pravidlá je možné upraviť lokálne v prehliadači bez zásahu do zdrojovej RACI matice.

## Editovateľná architektúra služieb

- Karty v module **Architektúra a závislosti** je možné upravovať priamo v aplikácii.
- Doplniť alebo opraviť možno lokalitu, prostredie, platformu, server/hostname, sieťové závislosti, monitoring, zálohovanie, kontinuitu, vlastníkov OIT, zdroj a úroveň potvrdenia.
- Upravovať možno aj služby, ktoré zatiaľ nemajú zdrojové technické mapovanie, napríklad DALV.
- Manuálne úpravy sú uložené v bežnom synchronizovanom snímku aplikácie a prenášajú sa aj do Technologického katalógu.
- Pri každej úprave sa eviduje čas a používateľ; zdrojové mapovanie možno obnoviť.

## Oprávnenia a databáza

- Architektúru môžu upravovať administrátor, manažér a riešiteľ. Čitateľ má pohľad iba na čítanie.
- Release nevyžaduje nový Supabase SQL skript ani zmenu Storage bucketov.
