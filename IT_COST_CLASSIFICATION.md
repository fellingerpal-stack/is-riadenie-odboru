# IT Cost Classification – v0.21.0

Tento dokument popisuje reprodukovateľnú klasifikáciu finančného výrezu modulu **IT náklady**.

- Vstup: export Dashboard ekonomickej klasifikácie 632–642.
- Kontrola: Dashboard vývoja nákladov za rovnaké mesiace.
- Obdobie: január–jún pre roky 2022–2026.
- Klasifikácia: pravidlá v `scripts/extract_it_costs.py`.
- Výstup: `src/data/itCosts.json`.
- Duplicity medzi dvoma dashboardmi nevznikajú: druhý dashboard je len validačný.
- Vedecké databázové predplatné sa nepovažuje automaticky za IT prevádzku.
- DC VaV sa považuje za IT infraštruktúrnu prevádzku aj pri podporných technológiách, ak je väzba na DC VaV explicitne uvedená v poznámke.
- Kapitálové výdavky 7xx nie sú súčasťou dodaného zdroja.

## Kontrolné sumy klasifikovaného výrezu

| Rok | IT/DC VaV výrez |
|---:|---:|
| 2022 | 164 858,66 € |
| 2023 | 274 972,49 € |
| 2024 | 253 148,50 € |
| 2025 | 531 526,92 € |
| 2026 | 375 168,25 € |

Tieto sumy sú výsledkom manažérskych klasifikačných pravidiel v release 0.21.0 a nie novou účtovnou klasifikáciou.
