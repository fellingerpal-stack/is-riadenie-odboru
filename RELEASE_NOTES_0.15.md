# Release 0.15.0 – Prevádzkové väzby OIT

Release prepája odborný blok OIT s existujúcimi registrami a workflow aplikácie bez vytvorenia ďalšej duplicitnej databázy.

## Nový modul

V menu OIT pribudla položka **Prevádzkové väzby**.

Modul automaticky vytvára manažérsky pohľad na päť prevádzkových domén:

1. dátové centrá a serverová infraštruktúra,
2. sieťová infraštruktúra a bezpečnosť,
3. identity, účty a prístupové služby,
4. monitoring, zálohovanie a kontinuita,
5. aplikačné, dátové a cloudové platformy.

## Prepojené registre

- RACI OIT a odporúčaní technickí vlastníci,
- rackové inventáre oboch lokalít,
- služby a systémy,
- CMDB aktíva a vzťahy,
- ServiceDesk tickety,
- Problem management,
- Change management,
- projekty a úlohy,
- riziká.

## Pohľady

- **Mapa väzieb** – počty, vlastníci, prevádzkové záznamy a skóre pripravenosti podľa domény.
- **Krytie a medzery** – neúplné CMDB položky, služby, zmenové plány a významné riziká.
- **Prevádzkový tok** – end-to-end model od technického zdroja cez službu, CMDB a ITSM až po RACI a riziká.
- **Export medzier CSV** – pracovný zoznam na doplnenie údajov.

## Technické poznámky

- Nevyžaduje sa SQL migrácia.
- Nepribúdajú nové npm závislosti.
- Modul iba číta existujúci AppState a nič automaticky nemení v databáze.
- Automatické zhody sú návrhové a používajú názvy, popisy, lokality, vlastníkov a kľúčové slová.
