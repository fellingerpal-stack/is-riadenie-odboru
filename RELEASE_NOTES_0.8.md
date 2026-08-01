# IS Riadenie odboru v0.8.0

## Nový modul IAM / Prístupy

- register žiadostí IAM s číslami `IAM-YYYY-NNNN`,
- nový prístup, zmena, odobratie, onboarding, offboarding a dočasný prístup,
- schvaľovacia cesta: priamy nadriadený, vlastník služby a bezpečnosť,
- privilegované prístupy, riziko, platnosť a termín vybavenia,
- prepojenie na službu, katalóg prístupov a realizačnú úlohu,
- komentáre, interné poznámky a auditná história,
- katalóg štandardizovaných prístupov a rolí,
- recertifikačné kampane s rozhodnutiami ponechať / odobrať / upraviť,
- dashboard otvorených, omeškaných, privilegovaných a končiacich prístupov,
- vzorové IAM dáta pre CRZP/APS, EvuPP, WebJet, OpenAI, NTI a nový intranet.

## Ďalšie úpravy

- zapracovaný čitateľnejší RACI vysvetľovací panel 0.7A,
- aktualizovaná roadmapa – IAM je aktívny modul, CMDB je nasledujúci release,
- automatická migrácia lokálnych a Supabase snapshot dát na verziu 0.8.0,
- voliteľná SQL schéma `supabase/schema_iam_v08.sql` pre neskorší prechod na samostatné IAM tabuľky.

## Poznámka k nasadeniu

Pri prechode z funkčnej verzie 0.7 stačí nahradiť zmenené súbory. Nové npm balíky neboli pridané.
