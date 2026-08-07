# Scoped IAM 0.26 – model oprávnení

## Základný princíp

Efektívne oprávnenie používateľa vzniká kombináciou:

**Aplikačná rola × pracovný scope**

Rola určuje **čo smie typ používateľa robiť**. Scope určuje **v ktorom pracovnom priestore to smie robiť**.

## Pracovné scope

| Scope | Význam |
|---|---|
| `oit` | Odbor 3.1 / OIT |
| `oris` | Odbor 3.2 / ORIS |
| `shared` | Technologický katalóg, Riadiace centrum IT, IT náklady, dodávatelia a spoločné riadiace dáta |

## Úrovne

| Úroveň | Význam |
|---|---|
| `none` | používateľ pracovný priestor nevidí |
| `read` | používateľ ho vidí, ale nemá zápis |
| `write` | používateľ môže zapisovať v rozsahu svojej aplikačnej roly |

## Odporúčané príklady

### Riaditeľ 3.2

`manager` + `3.1=read`, `3.2=write`, `shared=write`

### Riaditeľ 3.1

`manager` + `3.1=write`, `3.2=read`, `shared=write`

### Centrálna kontrola / auditor

`viewer` + `3.1=read`, `3.2=read`, `shared=read`

### Administrátor

`admin` = vždy `write/write/write`.

## Bezpečnostná vrstva

Frontend skrýva alebo deaktivuje zápisové akcie podľa scope, ale ochrana nie je iba vizuálna. Supabase migrácia zavádza `current_scope_access`, `can_read_scope`, `can_write_scope` a aktualizuje RLS/editorské funkcie. Snapshot zápis zachová serverovú hodnotu oblastí, kde používateľ nemá WRITE.

## Existujúci používatelia po migrácii

Ak profil ešte nemá `access_scopes`, migrácia ho doplní podľa útvaru:

- 3.1 → vlastný odbor W, 3.2 R, spoločné W (pri ne-viewer role),
- 3.2 → 3.1 R, vlastný odbor W, spoločné W,
- viewer → R/R/R,
- admin → W/W/W.

Následne môže administrátor maticu upraviť individuálne v **Používatelia**.
