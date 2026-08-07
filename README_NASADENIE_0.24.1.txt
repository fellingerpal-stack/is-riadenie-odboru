IS Riadenie odboru v0.24.1 – nasadenie

Ak už máte v0.24.0:
1. Rozbaľte balík LEN_ZMENENE_SUBORY do koreňa projektu a potvrďte nahradenie súborov.
2. Nie je potrebný žiadny nový SQL skript ani migrácia Supabase.
3. Spustite npm run build alebo nechajte Vercel spraviť štandardný build.
4. Po deployi urobte hard refresh (Ctrl+F5).

Overenie:
- v pätičke/sidebar je verzia v0.24.1,
- IT náklady -> Dôkazná vrstva obsahuje stĺpec Dodávateľ,
- toolbar obsahuje filter Dodávateľ a zoradenie Podľa dodávateľa,
- InterWay sa pri KOMIS položkách s IČO 35728531 zobrazí ako InterWay, a. s.,
- pravý stĺpec sumy ostáva sticky.

Poznámka: väzba dodávateľa je konzervatívna. Ak chýba jednoznačný doklad/názvová zhoda v riadkovom SIT snapshote, aplikácia zobrazí bez spoľahlivej zhody.
