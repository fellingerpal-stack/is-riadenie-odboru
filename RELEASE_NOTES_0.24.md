# Release 0.24.0 – Register a správa dodávateľov

Release 0.24.0 rozširuje finančnú a servisnú vrstvu o spoločný register dodávateľov pre odbory 3.1 a 3.2.

## 1. Nový spoločný modul Dodávatelia

- nový modul **Dodávatelia** je dostupný z portálu aj z navigácie oboch odborov,
- zoznam môže čítať každý prihlásený používateľ vrátane roly zamestnanec,
- vytvárať, upravovať a odstraňovať spravovanú kartu môže iba rola **admin**,
- zdrojové platby a zmluvné väzby sa pri úprave karty dodávateľa nemenia.

## 2. Automatické pomenovanie dodávateľov podľa IČO

Register využíva už existujúci interný mapping IČO → názov spoločnosti. Medzi rozpoznávané identity patria napríklad:

- `35728531` → **InterWay, a. s.**,
- `36383431` → **INFOkey, s. r. o.**,
- `35697270` → **Orange Slovensko, a.s.**,
- `35763469` → **Slovak Telekom, a.s.**,
- `36237337` → **Seyfor Slovensko, a.s.**,
- `50412329` → **ESMO s. r. o.**,
- `45310106` → **COPY PRINT GROUP, a.s.**,
- `36817864` → **CellQoS, a.s.**.

Ak IČO nie je v overenom internom mappingu, aplikácia názov nevymýšľa a ponechá identitu vo forme `Firma / IČO XXXXXXXX`. Admin môže názov a kartu následne potvrdiť ručne.

## 3. Supplier 360

Detail dodávateľa spája:

- IČO a zdroj identity,
- celkovú sumu platieb v SIT 2026,
- počet dokladov/platieb,
- úlohy 10 / 22 / 25 a strediská,
- čísla zmlúv a typické položky z platieb,
- mesačné čerpanie január–máj 2026,
- informačné systémy, pri ktorých je dodávateľ evidovaný,
- kritickosť IS, SLA a zmluvnú referenciu,
- administratívne kontakty a zodpovednosti,
- web, CRZ, PDF zmluvy a DMS odkaz,
- internú poznámku a audit poslednej úpravy.

## 4. Admin správa karty

Admin môže doplniť:

- názov a kategóriu dodávateľa,
- stav,
- kontaktnú osobu / obchodníka,
- e-mail a telefón,
- projektového manažéra dodávateľa,
- projektového manažéra CVTI SR,
- garanta zmluvy,
- garanta služby,
- eskalačný kontakt,
- web, CRZ, PDF/DMS odkazy,
- poznámku.

IČO, ktoré pochádza zo zdrojovej SIT platby, je v editácii uzamknuté – spravovaná karta nesmie meniť auditovateľný zdrojový identifikátor.

Odstránenie spravovanej karty odstráni iba adminom doplnené metadáta. Zdrojový dodávateľ, platby, zmluvy a väzby na IS zostávajú v registri.

## 5. Väzba na Riadiace centrum IT

Pohľad **Dodávatelia / zmluvy** v Riadiacom centre IT teraz používa rovnaké rozlíšenie IČO → názov ako nový register. Pri InterWay sa teda namiesto všeobecného `Firma/IČO 35728531` zobrazí názov **InterWay, a. s.** a IČO zostane uvedené v detaile.

V Service 360 sa rovnaké pomenovanie používa aj v TOP dodávateľských identitách služby.

## 6. Zdroje a metodická hranica

Register spája tri existujúce zdroje aplikácie:

1. riadkové SIT platby 2026,
2. register informačných systémov s poľom Dodávateľ,
3. spravované metadáta doplnené administrátorom.

Automatické pomenovanie je konzervatívne. Názov sa použije iba pri známom IČO alebo pri už potvrdenej spravovanej karte. Neznáme IČO sa automaticky nedohľadáva ani neodhaduje v používateľskom rozhraní.

## 7. Technické zmeny

Nové súbory:

- `src/data/supplierRegistry.ts`,
- `src/lib/supplierDirectory.ts`,
- `src/views/Suppliers.tsx`,
- `src/views/Suppliers.css`.

Upravené súbory:

- `src/App.tsx`,
- `src/views/OperationsIntelligence.tsx`,
- `src/types.ts`,
- `src/lib/storage.ts`,
- `src/data/seed.json`,
- `package.json`.

## Databáza

Release 0.24.0 **nevyžaduje nový Supabase SQL skript ani zmenu databázovej schémy**. Spravované karty dodávateľov sú súčasťou existujúceho synchronizovaného snapshotu aplikácie.

Admin-only editácia je v tomto release riadená aplikačnou rolou. Zdrojové finančné dáta ostávajú read-only analytickým podkladom.
