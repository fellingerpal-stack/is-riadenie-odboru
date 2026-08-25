IS RIADENIE ODBORU v0.54.0
PROJECT CAPACITY INTELLIGENCE

VÝCHODISKOVÝ STAV
- v0.53.0 je nasadená a funkčná.
- projektové členstvá a user_id väzby z v0.53.0 zostávajú bez zmeny.

PORADIE NASADENIA
1. SUPABASE: nič nespúšťaj.
   v0.54.0 nemá SQL migráciu a nemení RLS ani RPC.

2. EDGE FUNCTION invite-user: nič nemeníš.

3. Nahraj obsah IS_Riadenie_odboru_v0.54.0_FULL.zip do rootu GitHub repozitára a commitni.

4. Vercel build musí ukázať:
   [v0.54.0 prebuild] legacy cleanup complete
   [v0.54.0 verify] OK
   a package build verziu 0.54.0.

SMOKE TEST – KAPACITY
- Riadenie projektov -> Kapacity.
- viditeľné prepínače: BI prehľad / Heatmapa / Graf / Detail.
- zmeň Referenčný mesiac.
- Heatmapa: prepni horizont 3, 6 a 12 mesiacov.
- klikni na bunku heatmapy -> musí sa zobraziť drill-down projektov človeka.
- klikni na projekt v drill-downe -> otvorí sa karta projektu.
- Graf: každý človek má stacked alokácie a hranicu 100 %.
- Detail: zostáva pôvodný zoznam alokácií.

SMOKE TEST – OPRÁVNENIA
- Admin: vidí všetkých ľudí, ktorých obsahuje projektové portfólio.
- Projektový manažér: BI počíta iba zo serverom sprístupnených projektov.
- Člen projektu: Kapacity zobrazia iba jeho vlastné alokácie.

DATABÁZA
- žiadna zmena; nespúšťaj staršie migrácie opakovane.
