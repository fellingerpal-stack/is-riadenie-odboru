# Release 0.17.0 – Technologický katalóg a výkon rolí ORIS

## Nový spoločný modul

Do hlavného portálu aj menu oboch odborov pribudol **Technologický katalóg**. Modul prepája:

- lokality a racky,
- servery a CMDB položky,
- virtualizáciu, siete, storage a zálohovanie,
- databázy, identity, monitoring, cloud, HPC a aplikačné platformy,
- informačné systémy a služby ORIS,
- IaaS, PaaS a SaaS klasifikáciu,
- výkonové kapacity,
- licenčné a podporné termíny,
- incidenty, problémy a zmeny,
- simuláciu dopadu výpadku.

Pohľady obsahujú prehľad, infraštruktúrny explorer, servisné modely, kapacitu a výkon, licencie a simulátor blast radius.

## ORIS – ľudia a výkon rolí

Modul **Ľudia a roly** má nový pohľad **Ľudia a výkon rolí**, ktorý pre každého pracovníka zobrazuje:

- praktické vykonávanie R,
- formálnu zodpovednosť A,
- konzultovanie C,
- informovanie I,
- kombinované A/R,
- procesy s jediným vykonávateľom,
- percento zapojenia do RACI procesov,
- dostupný kapacitný plán.

Počty rolí sú vysvetlené ako RACI zodpovednosti, nie ako odpracované hodiny.

## Dáta a bezpečnosť

Release používa existujúci Supabase snapshot, CMDB a už nasadené OIT/ORIS registre. Nevyžaduje nové SQL tabuľky ani zmenu Storage bucketov.
