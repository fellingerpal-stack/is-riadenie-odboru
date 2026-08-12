# IS Riadenie odboru v0.38.0 – Landing Dashboard Refresh

## Cieľ release

Release 0.38.0 mení iba vstupnú obrazovku **Portál odborov / Hlavný panel**. Pôvodné dlhé horizontálne bloky spoločných modulov sú nahradené jednotným dlaždicovým dashboardom.

Výpočty, dátové modely, Supabase schéma, RLS, synchronizácia, Network Discovery, finančné datasety a logika jednotlivých modulov sa nemenia.

## Nová vstupná obrazovka

Portál je rozdelený na tri vizuálne vrstvy:

1. **Kompaktný hero panel**
   - názov portálu,
   - krátke vysvetlenie spoločnej architektúry,
   - počet dostupných modulov podľa oprávnení,
   - spoločná dátová vrstva,
   - jednotné SSO/oprávnenia.

2. **Modulový dashboard 2 × 3**
   - ORIS / odbor 3.2,
   - OIT / odbor 3.1,
   - Technologický katalóg,
   - Service 360 / Control Tower,
   - IT náklady,
   - Asset Management / Asset 360.

3. **Kompaktný informačný pás**
   - oddelené kompetencie,
   - spoločné dáta,
   - jeden manažérsky obraz naprieč 3.1 a 3.2.

## Vizuálne zmeny

- každá oblasť je samostatná dlaždica,
- ORIS a OIT zostávajú vizuálne dominantné,
- spoločné moduly používajú vlastné farebné akcenty,
- jednotná typografia, tagy a CTA tlačidlá,
- stav dostupnosti je viditeľný priamo v dlaždici,
- hover a keyboard focus sú výraznejšie,
- responzívny režim pre notebook, tablet a mobil,
- odstránený vizuálny dojem dlhého zoznamu kariet pod sebou.

## Oprávnenia

Existujúca logika scope zostáva zachovaná:

- ORIS rešpektuje `canOris`,
- OIT rešpektuje `canOit`,
- spoločné moduly rešpektujú `canShared`,
- nedostupný odborný priestor sa zobrazí ako uzamknutý,
- navigačné ciele jednotlivých modulov sa nemenia.

## Databáza

Release 0.38.0 **nevyžaduje SQL migráciu**.
