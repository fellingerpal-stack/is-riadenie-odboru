# Release 0.40.0 – Landing Variant B

## Cieľ

Release upravuje iba hlavný vstupný portál aplikácie. Cieľom je jasnejšia vizuálna hierarchia: odbory 3.2 a 3.1 zostávajú dominantné pracovné priestory a spoločné moduly sú zobrazené kompaktnejšie pod nimi.

## Variant B

Nové poradie landing stránky:

1. **Dva hlavné pracovné priestory**
   - Odbor 3.2 · ORIS
   - Odbor 3.1 · OIT

2. **Dva spoločné riadiace moduly**
   - Technologický katalóg
   - Service 360 · Control Tower

3. **Dva podporné moduly / rýchly prístup**
   - IT náklady
   - Asset Management · Asset 360

## UI zmeny

- kompaktnejší hero panel a menší prázdny priestor nad dlaždicami,
- kratšie texty na kartách,
- dve dominantné odborové dlaždice s najvýraznejším CTA,
- menšie spoločné riadiace dlaždice,
- samostatný kompaktný riadok pre financie a aktíva,
- zjednotená geometria, spacing a výška kariet podľa úrovne,
- výraznejšie CTA tlačidlá,
- jemný hover, border glow a animácia dekoratívneho prvku,
- responzívny prechod z dvoch stĺpcov na jeden,
- zachované stavy Dostupné / Bez prístupu.

## Bez zmeny

Release nemení:

- obchodnú logiku aplikácie,
- navigačné ciele modulov,
- IAM a scope oprávnenia,
- Supabase schému, RLS ani snapshot synchronizáciu,
- Network Discovery,
- IT náklady a v0.39 Contract Payment Drill-down,
- Supplier 360, zmluvy ani ostatné pracovné moduly.

## Zmenené súbory

- `package.json`
- `src/data/seed.json`
- `src/lib/storage.ts`
- `src/styles.css`
- `src/views/DepartmentPortal.tsx`

Verzia aplikácie: `0.40.0`.
