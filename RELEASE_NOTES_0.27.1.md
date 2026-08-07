# Release 0.27.1 – build hotfix Asset Management

Hotfix opravuje TypeScript build v release 0.27.0.

## Oprava

- `CmdbItem` bol vo v0.27 rozšírený o Asset Management polia, ale `seed.json` obsahuje historické CMDB položky v staršom tvare.
- `cloneSeed()` preto už nevykonáva priamy nebezpečný cast staršieho seed tvaru na nový `AppState`.
- `migrateCmdbItem()` prijíma aj historický/čiastočný tvar CMDB položky a doplní nové Asset polia pred použitím v aplikácii.
- fallback CMDB položiek zo seedu prechádza rovnakou migráciou, takže staršie dáta zostávajú kompatibilné.

## Rozsah

Funkcionalita Asset Management v0.27.0 sa nemení. Ide iba o build/migračný hotfix.

## Kontrola

- presne modul `src/lib/storage.ts`, na ktorom Vercel hlásil TS2352, prešiel strict TypeScript kontrolou,
- 57 TS/TSX zdrojových súborov prešlo syntax transpilačnou kontrolou,
- lokálny plný `npm install` nie je v pracovnom prostredí dostupný, pretože interný npm mirror neobsahuje `@supabase/supabase-js`; Vercel však dependencies podľa logu používateľa nainštaloval úspešne.
