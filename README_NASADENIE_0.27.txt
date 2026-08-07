IS Riadenie odboru – nasadenie v0.27.0
=====================================

Východisková verzia: v0.26.0
Cieľová verzia:      v0.27.0

Odporúčané nasadenie:
1. Zálohujte aktuálny projekt / commit.
2. Rozbaľte IS_Riadenie_odboru_v0.27.0_LEN_ZMENENE_SUBORY.zip do koreňa projektu a povoľte prepísanie súborov.
   ALEBO spustite: node install-v0270-asset-management.mjs
3. Spustite npm install / npm ci. v0.27 pridáva balíky xlsx a qrcode.
4. Spustite npm run check a npm run build.
5. Deploynite na Vercel.
6. Po nasadení urobte Ctrl+F5.

Kontrola po nasadení:
- spodný ľavý stav aplikácie zobrazuje v0.27.0,
- v skupine Spoločné je položka Asset management,
- pôvodné CMDB položky zostali zachované,
- Register aktív ponúka tlačiarne, MFP, monitory, UPS, notebooky a ďalšie typy,
- Asset 360 zobrazuje vlastníctvo, lokalitu, financie, lifecycle a audit,
- Inventarizácia umožňuje meniť stav položky,
- Hromadný import prijíma CSV/TXT/XLSX/XLS,
- QR štítok sa vytvorí lokálne v prehliadači.

IAM:
- používateľ potrebuje aspoň read prístup do Spoločných modulov, aby Asset management otvoril,
- zápis konkrétnej položky závisí od jej scope 3.1 / 3.2 / Spoločné,
- odstrániť záznam môže iba admin.

Databáza:
- nový SQL sa NEVYKONÁVA,
- platí už nasadená v0.26 IAM migrácia,
- nové asset polia sa uložia v existujúcom synchronizovanom snapshot payload-e.

Import:
- odporúčame začať na malej vzorke 5–20 zariadení,
- pred potvrdením skontrolujte automatické mapovanie stĺpcov,
- najlepšie identifikátory duplicity sú inventárne číslo, sériové číslo a hostname,
- import nikdy nezapisuje položku do scope, na ktorý používateľ nemá W.
