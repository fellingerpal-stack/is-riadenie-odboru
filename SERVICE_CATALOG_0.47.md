# ServiceDesk v0.47 – prevádzkový model katalógu služieb

## Základný princíp

Katalóg je vstupná UX vrstva, nie náhrada routing matice. Zamestnanec vyberá službu podľa ľudského názvu. Server z katalogovej položky vytvorí technické atribúty ticketu a potom aplikuje routing pravidlá.

## Odporúčaná správa

- katalóg držte krátky a orientovaný na potrebu používateľa,
- technické tímy nevystavujte ako hlavný navigačný model,
- pri často používaných službách použite 2–5 doplňujúcich polí,
- pri incidentoch zbierajte lokalitu, prostredie, URL/asset a čas vzniku,
- pri rozvojových požiadavkách zbierajte biznis cieľ a požadovaný termín,
- položku radšej deaktivujte než okamžite zmažte, ak na ňu už existujú historické tickety.

## Smart polia

Každé pole má:

- `key` – stabilný technický identifikátor,
- `label` – text pre používateľa,
- `type`,
- `required`,
- `placeholder`,
- `helpText`,
- `options` pri type select.

Po vytvorení ticketu sú odoslané údaje v UI read-only, aby sa zachoval pôvodný obsah požiadavky.

## Routing

Poradie vyhodnotenia pre employee ticket:

1. katalogová položka,
2. routing matica,
3. fallback fronta položky katalógu,
4. `Q-SD-L1`.

Takto môže admin meniť organizačný routing bez prepisovania katalógu a naopak.
