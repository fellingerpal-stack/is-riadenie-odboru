# IS Riadenie odboru v0.34.0 – Log Management & Audit Trail

## Cieľ release
Release dopĺňa centrálny administrátorský audit **kto, kedy, kde a čo zmenil**. Nový pohľad sa nachádza v sekcii **Správa → Log management**.

## Nový Log management
Administrátor dostáva samostatný auditný dashboard s:
- KPI za 24 hodín / 30 dní,
- aktivitou za posledných 14 dní,
- filtrami obdobie, používateľ, modul, kategória, stav a fulltext,
- tabuľkou `čas → používateľ → modul → akcia → objekt/zmena`,
- detailom udalosti vrátane technickej delty,
- CSV exportom aktuálne filtrovaného pohľadu.

## Audit snapshotov
Frontend v0.34.0 používa nové RPC `save_app_snapshot_v4`.

Dôležité: v4 **nemení stabilnú logiku snapshot synchronizácie**. Server-side volá existujúce a overené `save_app_snapshot_v3` a až po úspešnom uložení zapíše auditnú udalosť.

Audit snapshotu obsahuje:
- autora z `auth.uid()` + profilu,
- čas,
- číslo snapshot verzie,
- zmenené top-level moduly,
- počty pridaných / upravených / odstránených záznamov,
- vzorku identifikátorov a pri upravených záznamoch aj field-level deltu.

## Samostatné DB registre
Databázové triggre automaticky auditujú existujúce tabuľky, ak sú v inštalácii prítomné:
- work_projects,
- work_tasks,
- service_queues,
- service_sla_policies,
- service_tickets,
- iam_catalog_items,
- iam_requests,
- iam_recert_campaigns,
- website_registry,
- information_system_registry.

Discovery/collector tabuľky sa zámerne neauditujú po jednotlivých zariadeniach, aby automatické sieťové skeny nevytvárali tisíce administrátorských logov.

## Používatelia a IAM
Nový pohľad zároveň načíta existujúci `user_admin_audit`, takže ostáva viditeľná história pozvánok, zmien rolí, prístupov, obnov hesiel a blokovaní účtov.

## Bezpečnosť auditu
- `app_audit_log` je append-only z pohľadu aplikácie,
- klient nemá INSERT/UPDATE/DELETE práva na tabuľku,
- zápis vzniká iba cez SECURITY DEFINER RPC alebo server-side trigger,
- čítanie je RLS obmedzené na administrátora vlastnej organizácie,
- actor_id pri server-side zmene pochádza z autentifikovanej Supabase session,
- audit payload filtruje citlivé názvy polí a obmedzuje veľkosť detailu.

## Historické dáta
SQL migrácia automaticky doplní existujúce `app_snapshots` do auditu ako historické snapshot udalosti. Preto po prvom otvorení Log managementu nebude história prázdna.

## Kompatibilita
Ak frontend v0.34.0 beží ešte pred SQL migráciou, uloženie snapshotu má fallback na `save_app_snapshot_v3`, takže existujúca synchronizácia sa nezablokuje. Log management v takom prípade zobrazí jasné upozornenie, že treba spustiť SQL migráciu.

## Verzia
`0.34.0`
