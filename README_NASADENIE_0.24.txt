IS Riadenie odboru – nasadenie release 0.24.0
==============================================

Odporúčaný upgrade: v0.23.0 -> v0.24.0

VARIANT A – zmenené súbory
1. Urob zálohu aktuálneho projektu.
2. Rozbaľ IS_Riadenie_odboru_v0.24.0_LEN_ZMENENE_SUBORY.zip do koreňa projektu.
3. Potvrď prepísanie existujúcich súborov.
4. Spusti npm run build alebo bežný Vercel deployment.
5. Po deployi sprav tvrdé obnovenie stránky (Ctrl+F5).

VARIANT B – automatický installer
1. Skopíruj install-v0240-suppliers.mjs do koreňa projektu v0.23.0.
2. Spusti:
   node install-v0240-suppliers.mjs
3. Installer vytvorí zálohu menených súborov.
4. Následne spusti npm run build alebo Vercel deployment.

KONTROLA PO NASADENÍ
- verzia v ľavom dolnom rohu: v0.24.0,
- v Spoločné / Portál je položka Dodávatelia,
- IČO 35728531 sa zobrazuje ako InterWay, a. s.,
- používateľ bez roly admin vidí read-only register bez tlačidiel na úpravu,
- admin vidí Nový dodávateľ a Upraviť kartu,
- Riadiace centrum IT -> Dodávatelia / zmluvy používa pomenované identity,
- zdrojové platby sa pri editácii karty nemenia.

SUPABASE
Release 0.24.0 nevyžaduje nový SQL skript ani zmenu schémy.
Spravované karty sa ukladajú v existujúcom synchronizovanom stave aplikácie.
