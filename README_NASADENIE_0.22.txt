IS Riadenie odboru – nasadenie release 0.22.0
===============================================

Odporúčaný upgrade: v0.21.0 -> v0.22.0

MOŽNOSŤ A – LEN ZMENENÉ SÚBORY
1. Rozbaľ IS_Riadenie_odboru_v0.22.0_LEN_ZMENENE_SUBORY.zip.
2. Nahraj obsah do koreňa projektu a povoľ prepísanie existujúcich súborov.
3. Nové súbory ContractSpending.*, TechnologyCatalog.css a contractTasks.json musia zostať v uvedených priečinkoch.
4. Spusti npm run build alebo bežný Vercel deployment.
5. Over verziu v spodnej časti sidebaru: v0.22.0.

MOŽNOSŤ B – FULL
Použi IS_Riadenie_odboru_v0.22.0_FULL.zip ako kompletný zdroj projektu.

MOŽNOSŤ C – INSTALLER
V koreňovom priečinku projektu v0.21.0 spusti:
  node install-v0220-technology-finance.mjs
Installer pred prepísaním vytvorí lokálnu zálohu menených súborov.

KONTROLA PO NASADENÍ
- Technologický katalóg: globálne vyhľadávanie, rýchle filtre, nový tab Tabuľka a 360° detail.
- IT náklady: v hornej časti prepínač IT náklady / Úlohy 10 / 22 / 25.
- Dôkazná vrstva: vlastné filtre, kompaktné riadky a interné rolovanie.
- Úlohy 10/22/25: mesačný, kvartálny a kumulatívny graf + rozpočet/čerpanie/zostatok.

DÁTA KONTRAKTU
Zdrojový snapshot je január až máj 2026. Jún až december nie sú interpretované ako nulové čerpanie.
Release nemení Supabase schému.
