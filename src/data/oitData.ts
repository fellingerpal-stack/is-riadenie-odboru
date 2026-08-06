export interface OitPerson { id:string; name:string; area:string }
export interface OitRaciRow { id:string; process:string; note:string; assignments:Record<string,string> }
export interface OitRaciArea { id:string; title:string; description:string; rows:OitRaciRow[] }
export interface OitRackItem { row:string; size:string; rack:string; device:string; code:string; position:string; units:string; generation:string; status:string; note:string }
export interface OitProject { name:string; note:string; category:string; status:string; description:string }

export const oitData = {
  "people": [
    {
      "id": "MK",
      "name": "Michal Kučera",
      "area": "Riaditeľ odboru / riadenie OIT"
    },
    {
      "id": "ĽH",
      "name": "Ľubomír Hozlár",
      "area": "Lamačská cesta / používateľská a endpointová podpora"
    },
    {
      "id": "SK",
      "name": "Samuel Kováč",
      "area": "Lamačská cesta / podpora, endpointy, ESET/ERA"
    },
    {
      "id": "VŠ",
      "name": "Vladimír Šulko",
      "area": "Lamačská cesta / účty, prístupy, systémové služby"
    },
    {
      "id": "JS",
      "name": "Ján Strešňák",
      "area": "Staré Grunty / lokálna IT podpora a infraštruktúra"
    },
    {
      "id": "RB",
      "name": "Roman Bátora",
      "area": "DC VaV Žilina / riadenie a koordinácia prevádzky"
    },
    {
      "id": "MD",
      "name": "Mário Dubec",
      "area": "DC VaV Žilina / prevádzka dátového centra"
    },
    {
      "id": "AP",
      "name": "Alojz Pavlovič",
      "area": "DC VaV Žilina / prevádzka dátového centra"
    },
    {
      "id": "PM",
      "name": "Pavol Marcina",
      "area": "Teslova / infraštruktúra, virtualizácia, monitoring, zálohovanie"
    },
    {
      "id": "ŠK",
      "name": "Štefan Knap",
      "area": "Teslova / serverová a systémová infraštruktúra"
    },
    {
      "id": "JL",
      "name": "Jaroslav Lečko",
      "area": "Teslova / Microsoft enterprise, cloud, HPC, architektúra"
    },
    {
      "id": "MŽ",
      "name": "Matej Žáry",
      "area": "Teslova / sieťová infraštruktúra a bezpečnosť"
    },
    {
      "id": "RJ",
      "name": "Richard Jurík",
      "area": "Teslova / samostatný Service Desk mimo JIRA OIT"
    }
  ],
  "raciAreas": [
    {
      "id": "Riadenie_JIRA",
      "title": "Riadenie a JIRA",
      "description": "RACI podľa konkrétnych pracovníkov; prístup do JIRA OIT majú iba MK, ĽH, SK, VŠ a JS.",
      "rows": [
        {
          "id": "Riadenie_JIRA-5",
          "process": "Celkové riadenie odboru",
          "note": "Konečná riadiaca zodpovednosť.",
          "assignments": {
            "MK": "A/R",
            "VŠ": "C",
            "RB": "C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Riadenie_JIRA-6",
          "process": "Určovanie priorít odboru",
          "note": "Operatívne a strategické priority.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "C",
            "RB": "C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Riadenie_JIRA-7",
          "process": "Koordinácia pracovísk",
          "note": "Lamačská cesta, Staré Grunty, DC VaV Žilina a Teslova.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "R/C",
            "RB": "R/C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Riadenie_JIRA-8",
          "process": "Schvaľovanie významných technických zmien",
          "note": "Pred realizáciou sa vyžaduje odborná konzultácia vlastníka technickej oblasti.",
          "assignments": {
            "MK": "A/R",
            "VŠ": "C",
            "JS": "C",
            "RB": "C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Riadenie_JIRA-9",
          "process": "Riadenie kritických incidentov",
          "note": "Technický koordinátor sa určí podľa dotknutej oblasti.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "C",
            "RB": "R/C",
            "MD": "C",
            "AP": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Riadenie_JIRA-10",
          "process": "Vlastníctvo a praktická koordinácia JIRA",
          "note": "Vlastník a praktický koordinátor: Michal Kučera. Ostatní oprávnení pracovníci sú informovaní.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "I",
            "SK": "I",
            "VŠ": "I",
            "JS": "I"
          }
        },
        {
          "id": "Riadenie_JIRA-11",
          "process": "Nastavenie kategórií, priorít a pravidiel JIRA",
          "note": "Pravidlá nastavuje Michal Kučera; ĽH, SK, VŠ a JS poskytujú konzultáciu z praxe.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "C"
          }
        },
        {
          "id": "Riadenie_JIRA-12",
          "process": "Pridelenie a kontrola požiadaviek v JIRA",
          "note": "Pridelenie a kontrolu vykonáva Michal Kučera; pridelení riešitelia dostávajú informáciu.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "I",
            "SK": "I",
            "VŠ": "I",
            "JS": "I"
          }
        },
        {
          "id": "Riadenie_JIRA-13",
          "process": "Spracovanie prideleného ticketu",
          "note": "Tickety spracúvajú iba pracovníci s prístupom do JIRA OIT.",
          "assignments": {
            "MK": "A",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R",
            "JS": "R"
          }
        },
        {
          "id": "Riadenie_JIRA-14",
          "process": "Reporting a vyhodnotenie JIRA",
          "note": "Vyhodnotenie vykonáva Michal Kučera; ostatní oprávnení pracovníci sú informovaní.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "I",
            "SK": "I",
            "VŠ": "I",
            "JS": "I"
          }
        }
      ]
    },
    {
      "id": "Podpora_endpointy",
      "title": "Podpora a endpointy",
      "description": "RACI podľa konkrétnych pracovníkov; poznámka spresňuje rozsah kompetencie.",
      "rows": [
        {
          "id": "Podpora_endpointy-5",
          "process": "Riadenie používateľskej podpory",
          "note": "Priority a neštandardné riešenia schvaľuje riaditeľ odboru.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "C",
            "RB": "C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Podpora_endpointy-6",
          "process": "L1/L2 používateľská podpora – Lamačská cesta",
          "note": "Praktický kompetenčný prekryv tímu.",
          "assignments": {
            "MK": "A",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R",
            "JS": "C"
          }
        },
        {
          "id": "Podpora_endpointy-7",
          "process": "Lokálna podpora – Staré Grunty",
          "note": "Ján Strešňák je primárny lokálny vykonávateľ.",
          "assignments": {
            "MK": "A",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "R"
          }
        },
        {
          "id": "Podpora_endpointy-8",
          "process": "Lokálna podpora – DC VaV Žilina",
          "note": "V rozsahu miestnych kompetencií.",
          "assignments": {
            "MK": "A",
            "RB": "R",
            "MD": "R",
            "AP": "R"
          }
        },
        {
          "id": "Podpora_endpointy-9",
          "process": "Lokálna podpora – Teslova",
          "note": "Odborní pracovníci podporujú používateľov pracoviska.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Podpora_endpointy-10",
          "process": "Príprava a konfigurácia pracovných staníc",
          "note": "Vrátane domény, profilu a štandardného softvéru.",
          "assignments": {
            "MK": "A",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R",
            "JS": "R",
            "RB": "C",
            "MD": "C",
            "AP": "C",
            "ŠK": "C"
          }
        },
        {
          "id": "Podpora_endpointy-11",
          "process": "Diagnostika a jednoduchý servis hardvéru",
          "note": "Podľa pracoviska; odborná eskalácia podľa potreby.",
          "assignments": {
            "MK": "A",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R",
            "JS": "R",
            "RB": "R/C",
            "MD": "R",
            "AP": "R",
            "ŠK": "C"
          }
        },
        {
          "id": "Podpora_endpointy-12",
          "process": "Evidencia pridelenia, vrátenia a pohybu zariadení",
          "note": "Každý pohyb musí byť preukázateľne zaznamenaný.",
          "assignments": {
            "MK": "A",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R",
            "JS": "R",
            "RB": "R",
            "MD": "R",
            "AP": "R"
          }
        },
        {
          "id": "Podpora_endpointy-13",
          "process": "Inventarizácia koncových zariadení",
          "note": "Lokálni pracovníci vykonávajú fyzickú kontrolu.",
          "assignments": {
            "MK": "A",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R",
            "JS": "R",
            "RB": "R",
            "MD": "R",
            "AP": "R"
          }
        },
        {
          "id": "Podpora_endpointy-14",
          "process": "Technická podpora porád a podujatí",
          "note": "Podľa lokality a dostupnosti.",
          "assignments": {
            "MK": "A",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R",
            "JS": "R",
            "RB": "R",
            "MD": "R",
            "AP": "R",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Podpora_endpointy-15",
          "process": "ESET/ERA – bežná operatívna správa",
          "note": "Samuel Kováč vykonáva bežnú operatívnu správu.",
          "assignments": {
            "MK": "A",
            "SK": "R",
            "PM": "C",
            "JL": "C"
          }
        },
        {
          "id": "Podpora_endpointy-16",
          "process": "ESET/ERA – vyššia administrátorská úroveň",
          "note": "Pavol Marcina a Jaroslav Lečko: pokročilá konfigurácia, zásadné zmeny a eskalované incidenty.",
          "assignments": {
            "MK": "A",
            "SK": "C",
            "PM": "R",
            "JL": "R"
          }
        },
        {
          "id": "Podpora_endpointy-17",
          "process": "ESET/ERA – schválenie zásadnej zmeny",
          "note": "Konečná zodpovednosť riaditeľa; odborná príprava vyšších administrátorov.",
          "assignments": {
            "MK": "A/R",
            "SK": "C",
            "PM": "C",
            "JL": "C"
          }
        }
      ]
    },
    {
      "id": "Identity_Microsoft",
      "title": "Identity a Microsoft",
      "description": "RACI podľa konkrétnych pracovníkov; poznámka spresňuje rozsah kompetencie.",
      "rows": [
        {
          "id": "Identity_Microsoft-5",
          "process": "Zakladanie, zmena a rušenie používateľských účtov",
          "note": "Na základe schválenej požiadavky.",
          "assignments": {
            "MK": "A",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "R",
            "JS": "R/C",
            "PM": "C",
            "ŠK": "R/C",
            "JL": "R/C"
          }
        },
        {
          "id": "Identity_Microsoft-6",
          "process": "Správa skupín a prístupových oprávnení",
          "note": "Citlivé oprávnenia podliehajú schváleniu.",
          "assignments": {
            "MK": "A",
            "VŠ": "R",
            "PM": "C",
            "ŠK": "R",
            "JL": "R"
          }
        },
        {
          "id": "Identity_Microsoft-7",
          "process": "Privilegované účty a administrátorské roly",
          "note": "Evidencia, minimálne oprávnenia a kontrola zmien.",
          "assignments": {
            "MK": "A",
            "VŠ": "R/C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Identity_Microsoft-8",
          "process": "Active Directory a skupinové politiky",
          "note": "Systémová a enterprise správa.",
          "assignments": {
            "MK": "A",
            "VŠ": "R/C",
            "PM": "C",
            "ŠK": "R",
            "JL": "R/C"
          }
        },
        {
          "id": "Identity_Microsoft-9",
          "process": "Microsoft 365 – účty a licencie",
          "note": "Enterprise administrácia a prevádzkové úkony.",
          "assignments": {
            "MK": "A",
            "VŠ": "R/C",
            "ŠK": "C",
            "JL": "R"
          }
        },
        {
          "id": "Identity_Microsoft-10",
          "process": "Exchange Online / hybridné služby",
          "note": "Pokročilá Microsoft enterprise správa.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "ŠK": "R/C",
            "JL": "R"
          }
        },
        {
          "id": "Identity_Microsoft-11",
          "process": "Teams, SharePoint a súvisiace služby",
          "note": "Konfigurácia služby a odborná eskalácia.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "ŠK": "R/C",
            "JL": "R"
          }
        },
        {
          "id": "Identity_Microsoft-12",
          "process": "Certifikáty, servisné účty a tajomstvá",
          "note": "Evidencia vlastníka, platnosti, rotácie a závislostí.",
          "assignments": {
            "MK": "A",
            "VŠ": "R/C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Identity_Microsoft-13",
          "process": "Pravidelná kontrola oprávnení",
          "note": "Kontrola účtov, skupín a privilegovaných rolí.",
          "assignments": {
            "MK": "A/R",
            "VŠ": "R",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        }
      ]
    },
    {
      "id": "Servery_cloud_HPC",
      "title": "Servery cloud HPC",
      "description": "RACI podľa konkrétnych pracovníkov; poznámka spresňuje rozsah kompetencie.",
      "rows": [
        {
          "id": "Servery_cloud_HPC-5",
          "process": "Architektúra serverovej infraštruktúry",
          "note": "Návrh štandardov a cieľovej architektúry.",
          "assignments": {
            "MK": "A",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "C"
          }
        },
        {
          "id": "Servery_cloud_HPC-6",
          "process": "Správa fyzických serverov",
          "note": "Inštalácia, konfigurácia, firmware a životný cyklus.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "MD": "C",
            "AP": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "C"
          }
        },
        {
          "id": "Servery_cloud_HPC-7",
          "process": "Správa Windows Server",
          "note": "Operačné systémy a súvisiace služby.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "PM": "R/C",
            "ŠK": "R",
            "JL": "R/C"
          }
        },
        {
          "id": "Servery_cloud_HPC-8",
          "process": "Správa Linux serverov",
          "note": "Operačné systémy a aplikačné závislosti.",
          "assignments": {
            "MK": "A",
            "PM": "R",
            "ŠK": "R",
            "JL": "R/C"
          }
        },
        {
          "id": "Servery_cloud_HPC-9",
          "process": "Virtualizačná platforma",
          "note": "Prevádzka, kapacita, aktualizácie a riešenie incidentov.",
          "assignments": {
            "MK": "A",
            "PM": "R",
            "ŠK": "R",
            "JL": "C"
          }
        },
        {
          "id": "Servery_cloud_HPC-10",
          "process": "Kontajnerové platformy",
          "note": "Prevádzka a štandardy kontajnerizácie.",
          "assignments": {
            "MK": "A",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C"
          }
        },
        {
          "id": "Servery_cloud_HPC-11",
          "process": "Cloudová infraštruktúra",
          "note": "Architektúra, konfigurácia a prevádzka cloudových služieb.",
          "assignments": {
            "MK": "A",
            "PM": "C",
            "ŠK": "R/C",
            "JL": "R"
          }
        },
        {
          "id": "Servery_cloud_HPC-12",
          "process": "HPC infraštruktúra",
          "note": "Architektúra, plánovanie kapacity a odborná správa.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R"
          }
        },
        {
          "id": "Servery_cloud_HPC-13",
          "process": "Aktualizácie a hardening serverov",
          "note": "Zmeny sa realizujú riadene a dokumentovane.",
          "assignments": {
            "MK": "A",
            "PM": "R",
            "ŠK": "R",
            "JL": "R/C",
            "MŽ": "C"
          }
        },
        {
          "id": "Servery_cloud_HPC-14",
          "process": "Kapacitné plánovanie compute vrstvy",
          "note": "Vyhodnocovanie výkonu a potreby obnovy.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R"
          }
        }
      ]
    },
    {
      "id": "Storage_backup_monitoring",
      "title": "Storage backup monitoring",
      "description": "RACI podľa konkrétnych pracovníkov; poznámka spresňuje rozsah kompetencie.",
      "rows": [
        {
          "id": "Storage_backup_monitoring-5",
          "process": "Správa storage a SAN",
          "note": "Konfigurácia, kapacita, výkon a dostupnosť.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "MD": "C",
            "AP": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Storage_backup_monitoring-6",
          "process": "Politika zálohovania",
          "note": "Rozsah, periodicita, retencia a vlastníctvo dát.",
          "assignments": {
            "MK": "A/R",
            "RB": "C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "C"
          }
        },
        {
          "id": "Storage_backup_monitoring-7",
          "process": "Prevádzka zálohovacej platformy",
          "note": "Monitoring behov, riešenie chýb a kapacita.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "MD": "C",
            "AP": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "C"
          }
        },
        {
          "id": "Storage_backup_monitoring-8",
          "process": "Obnova dát a systémov",
          "note": "Realizácia obnovy na základe schválenej požiadavky alebo incidentu.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "RB": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R/C"
          }
        },
        {
          "id": "Storage_backup_monitoring-9",
          "process": "Pravidelné testy obnovy",
          "note": "Preukázanie obnoviteľnosti vrátane protokolu.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "C"
          }
        },
        {
          "id": "Storage_backup_monitoring-10",
          "process": "Monitoring infraštruktúry",
          "note": "Nastavenie metrík, dostupnosti a alarmov.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "MD": "R/C",
            "AP": "R/C",
            "PM": "R",
            "ŠK": "R",
            "JL": "C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Storage_backup_monitoring-11",
          "process": "Reakcia na monitoringové alarmy",
          "note": "Podľa dotknutej technickej oblasti.",
          "assignments": {
            "MK": "A",
            "RB": "R/C",
            "MD": "R",
            "AP": "R",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Storage_backup_monitoring-12",
          "process": "Automatizácia prevádzkových úloh",
          "note": "Skripty, konfigurácia a opakovateľné postupy.",
          "assignments": {
            "MK": "A",
            "PM": "R",
            "ŠK": "R",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Storage_backup_monitoring-13",
          "process": "Evidencia kapacity a trendov",
          "note": "Podklad pre obnovu a investičné plánovanie.",
          "assignments": {
            "MK": "A",
            "RB": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R/C"
          }
        }
      ]
    },
    {
      "id": "Siete_bezpečnosť",
      "title": "Siete a bezpečnosť",
      "description": "RACI podľa konkrétnych pracovníkov; poznámka spresňuje rozsah kompetencie.",
      "rows": [
        {
          "id": "Siete_bezpečnosť-5",
          "process": "Architektúra LAN/WAN",
          "note": "Topológia, segmentácia, adresný plán a štandardy.",
          "assignments": {
            "MK": "A",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-6",
          "process": "Správa switchov, routerov a Wi-Fi",
          "note": "Konfigurácia, aktualizácie a riešenie porúch.",
          "assignments": {
            "MK": "A",
            "JS": "R/C",
            "RB": "C",
            "MD": "C",
            "AP": "C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-7",
          "process": "Správa firewallov",
          "note": "Pravidlá, objekty, NAT a bezpečnostné politiky.",
          "assignments": {
            "MK": "A",
            "PM": "C",
            "JL": "C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-8",
          "process": "VPN a vzdialený prístup",
          "note": "Profily, pravidlá, incidenty a životný cyklus prístupov.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "JL": "C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-9",
          "process": "IDS/IPS a sieťový dohľad",
          "note": "Konfigurácia detekcie, alarmy a eskalácia.",
          "assignments": {
            "MK": "A",
            "PM": "C",
            "JL": "C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-10",
          "process": "DNS, DHCP a IP adresácia",
          "note": "Systémová a sieťová súčinnosť.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "PM": "C",
            "ŠK": "R/C",
            "JL": "C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-11",
          "process": "Load balancing a publikovanie služieb",
          "note": "Koordinácia aplikačnej, serverovej a sieťovej vrstvy.",
          "assignments": {
            "MK": "A",
            "PM": "C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-12",
          "process": "Zálohovanie sieťových konfigurácií",
          "note": "Bezpečné uloženie a pravidelná kontrola použiteľnosti.",
          "assignments": {
            "MK": "A",
            "PM": "C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-13",
          "process": "Riešenie sieťového bezpečnostného incidentu",
          "note": "Vedúci incidentu určený podľa rozsahu; sieťová realizácia MŽ.",
          "assignments": {
            "MK": "A/R",
            "VŠ": "C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R"
          }
        },
        {
          "id": "Siete_bezpečnosť-14",
          "process": "Sieťová dokumentácia",
          "note": "Topológia, konfigurácie, pravidlá, závislosti a núdzové prístupy.",
          "assignments": {
            "MK": "A",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "R"
          }
        }
      ]
    },
    {
      "id": "Lokality_DC",
      "title": "Lokality a DC",
      "description": "RACI podľa konkrétnych pracovníkov; poznámka spresňuje rozsah kompetencie.",
      "rows": [
        {
          "id": "Lokality_DC-5",
          "process": "Prevádzková koordinácia Lamačská cesta",
          "note": "Lokálna používateľská a endpointová prevádzka.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "R",
            "SK": "R",
            "VŠ": "R/C"
          }
        },
        {
          "id": "Lokality_DC-6",
          "process": "Prevádzková koordinácia Staré Grunty",
          "note": "Ján Strešňák je primárna lokálna osoba.",
          "assignments": {
            "MK": "A",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "R"
          }
        },
        {
          "id": "Lokality_DC-7",
          "process": "Riadenie prevádzky DC VaV Žilina",
          "note": "Roman Bátora koordinuje miestnu prevádzku.",
          "assignments": {
            "MK": "A",
            "RB": "R",
            "MD": "C",
            "AP": "C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Lokality_DC-8",
          "process": "Fyzická kontrola technológií DC",
          "note": "Obhliadky, kontrolné úkony a evidencia zistení.",
          "assignments": {
            "MK": "A",
            "RB": "R/C",
            "MD": "R",
            "AP": "R",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Lokality_DC-9",
          "process": "Reakcia na lokálny alarm DC",
          "note": "Prvotná fyzická reakcia miestneho tímu, odborná eskalácia podľa technológie.",
          "assignments": {
            "MK": "A",
            "RB": "R",
            "MD": "R",
            "AP": "R",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Lokality_DC-10",
          "process": "Koordinácia havarijného stavu DC",
          "note": "Riadiaca a technická koordinácia podľa typu udalosti.",
          "assignments": {
            "MK": "A",
            "RB": "R",
            "MD": "C",
            "AP": "C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Lokality_DC-11",
          "process": "Prístup do technologických priestorov",
          "note": "Evidencia a dodržiavanie prístupového režimu.",
          "assignments": {
            "MK": "A",
            "RB": "R",
            "MD": "R",
            "AP": "R",
            "PM": "I",
            "ŠK": "I",
            "JL": "I",
            "MŽ": "I"
          }
        },
        {
          "id": "Lokality_DC-12",
          "process": "Koordinácia servisných zásahov v DC",
          "note": "Miestna súčinnosť a odborný vlastník technológie.",
          "assignments": {
            "MK": "A",
            "RB": "R",
            "MD": "R/C",
            "AP": "R/C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        }
      ]
    },
    {
      "id": "Zmeny_dokumentácia",
      "title": "Zmeny dokumentácia",
      "description": "RACI podľa konkrétnych pracovníkov; poznámka spresňuje rozsah kompetencie.",
      "rows": [
        {
          "id": "Zmeny_dokumentácia-5",
          "process": "Evidencia významnej technickej zmeny",
          "note": "Zmena musí obsahovať vlastníka, plán, riziko, návratový postup a výsledok.",
          "assignments": {
            "MK": "A",
            "VŠ": "R/C",
            "JS": "R/C",
            "RB": "R/C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Zmeny_dokumentácia-6",
          "process": "Posúdenie rizika a dopadu zmeny",
          "note": "Konzultácia všetkých dotknutých technologických oblastí.",
          "assignments": {
            "MK": "A",
            "VŠ": "C",
            "JS": "C",
            "RB": "C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Zmeny_dokumentácia-7",
          "process": "Schválenie a naplánovanie zmeny",
          "note": "Významné zmeny schvaľuje riaditeľ odboru.",
          "assignments": {
            "MK": "A/R",
            "VŠ": "C",
            "JS": "C",
            "RB": "C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        },
        {
          "id": "Zmeny_dokumentácia-8",
          "process": "Realizácia a vyhodnotenie zmeny",
          "note": "Vykonáva technický vlastník; výsledok sa dokumentuje.",
          "assignments": {
            "MK": "A",
            "VŠ": "R/C",
            "JS": "R/C",
            "RB": "R/C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Zmeny_dokumentácia-9",
          "process": "Prevádzková a technická dokumentácia",
          "note": "Každý vlastník oblasti aktualizuje dokumentáciu po zmene.",
          "assignments": {
            "MK": "A",
            "ĽH": "R/C",
            "SK": "R/C",
            "VŠ": "R",
            "JS": "R",
            "RB": "R",
            "MD": "C",
            "AP": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Zmeny_dokumentácia-10",
          "process": "Postupy obnovy a riešenia incidentov",
          "note": "Runbooky pre kritické služby a najčastejšie udalosti.",
          "assignments": {
            "MK": "A",
            "VŠ": "R/C",
            "JS": "R/C",
            "RB": "R/C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Zmeny_dokumentácia-11",
          "process": "Odovzdávanie znalostí a zastupiteľnosť",
          "note": "Minimálne sekundárny riešiteľ pre kritickú oblasť.",
          "assignments": {
            "MK": "A/R",
            "ĽH": "R/C",
            "SK": "R/C",
            "VŠ": "R/C",
            "JS": "R/C",
            "RB": "R/C",
            "MD": "R/C",
            "AP": "R/C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Zmeny_dokumentácia-12",
          "process": "Komunikácia a koordinácia dodávateľov",
          "note": "Odborný vlastník pripravuje podklady; riaditeľ schvaľuje priority a eskalácie.",
          "assignments": {
            "MK": "A/R",
            "VŠ": "C",
            "JS": "C",
            "RB": "R/C",
            "PM": "R/C",
            "ŠK": "R/C",
            "JL": "R/C",
            "MŽ": "R/C"
          }
        },
        {
          "id": "Zmeny_dokumentácia-13",
          "process": "Technické podklady pre obstarávanie",
          "note": "Špecifikácia, kompatibilita, kapacita a prevádzkové požiadavky.",
          "assignments": {
            "MK": "A",
            "ĽH": "C",
            "SK": "C",
            "VŠ": "C",
            "JS": "C",
            "RB": "C",
            "PM": "R",
            "ŠK": "R",
            "JL": "R",
            "MŽ": "R"
          }
        },
        {
          "id": "Zmeny_dokumentácia-14",
          "process": "Kontrola plnenia SLA a odovzdania dokumentácie",
          "note": "Kontrola kvality podpory, evidencie zásahov a transferu znalostí.",
          "assignments": {
            "MK": "A/R",
            "RB": "C",
            "PM": "C",
            "ŠK": "C",
            "JL": "C",
            "MŽ": "C"
          }
        }
      ]
    }
  ],
  "rackInventory": [
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S1",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S2",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S3",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S4",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S5",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S6",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S7",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S8",
      "device": "SAV",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S9",
      "device": "volne miesto",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S10",
      "device": "volne miesto",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S11",
      "device": "volne miesto",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S12",
      "device": "volne miesto",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S13",
      "device": "volne miesto",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "volne",
      "code": "",
      "position": "1-15U",
      "units": "15U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "PDU",
      "code": "CIPADPWPDU36",
      "position": "16U",
      "units": "1U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "volne",
      "code": "",
      "position": "17-24U",
      "units": "8U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "Huawei switch CE8860",
      "code": "ZA-CVTI-111",
      "position": "25-28U",
      "units": "4U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "volne",
      "code": "",
      "position": "29-30U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "Dell 6224F",
      "code": "",
      "position": "31U",
      "units": "1U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "volne",
      "code": "",
      "position": "32-33U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "patch panely",
      "code": "",
      "position": "34-35U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "optika",
      "code": "",
      "position": "36-37U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "Dell 6224F",
      "code": "",
      "position": "38U",
      "units": "1U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "volne",
      "code": "",
      "position": "39U",
      "units": "1U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "patch panely",
      "code": "",
      "position": "40U",
      "units": "1U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S15",
      "device": "optika",
      "code": "",
      "position": "41-42U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS13",
      "position": "1U",
      "units": "1U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "volne",
      "code": "",
      "position": "2-3U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "ističe 230V",
      "code": "",
      "position": "4-7U",
      "units": "4U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "volne",
      "code": "",
      "position": "8-15U",
      "units": "8U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "PDU",
      "code": "CIPADPWPDU35",
      "position": "16U",
      "units": "1U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "volne",
      "code": "",
      "position": "17-38U",
      "units": "22U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "patch panely",
      "code": "",
      "position": "39-40U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R1",
      "size": "42U",
      "rack": "R1S16",
      "device": "optika",
      "code": "",
      "position": "41-42U",
      "units": "2U",
      "generation": "infrastruktura Sanet",
      "status": "",
      "note": ""
    },
    {
      "row": "R2",
      "size": "",
      "rack": "",
      "device": "voľná celá rada",
      "code": "",
      "position": "",
      "units": "",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "HP blade C7000",
      "code": "CIPADBLC01",
      "position": "1-10U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": "toto bezi iba kvoli fyzickym serverom kde prevadzkujeme Matlab, ale treba riesit a bude sa moct vypnut"
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "Switch Altron dohlad",
      "code": "",
      "position": "11-12U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "volne",
      "code": "",
      "position": "13-20U",
      "units": "8U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "HP LCD",
      "code": "CIPADKVM01",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASOBESX01",
      "position": "22-23U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, bude sa vypinat cca mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASMGCSM02",
      "position": "24-25U",
      "units": "2U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "volne",
      "code": "",
      "position": "26-29U",
      "units": "4U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "genomatix",
      "code": "CIPASBIGNX01",
      "position": "30U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "volne",
      "code": "",
      "position": "31U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX69",
      "position": "32U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX70",
      "position": "33U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX71",
      "position": "34U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX72",
      "position": "35U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX73",
      "position": "36U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "volne",
      "code": "",
      "position": "37-38U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "patch panely",
      "code": "",
      "position": "39-41U",
      "units": "3U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S1",
      "device": "HP switch",
      "code": "CIPADKVM01",
      "position": "42U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "HP blade C7000",
      "code": "CIPADBLC02",
      "position": "1-10U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": "plati co riadok 3, bude sa vypinat"
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "volne",
      "code": "",
      "position": "11-19U",
      "units": "9U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS01",
      "position": "20U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "HP LCD",
      "code": "CIPADKVM02",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASIFSQL01",
      "position": "22-23U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, bude sa vypinat cca mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASOBESX02",
      "position": "24-25U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, bude sa vypinat cca mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "volne",
      "code": "",
      "position": "26U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "Cisco 2800",
      "code": "CIPADLNCRT03",
      "position": "27U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "volne",
      "code": "",
      "position": "28U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "ThinkSystem SR655",
      "code": "CIPASIFTSM11",
      "position": "29-30U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "ThinkSystem SR655",
      "code": "CIPASIFTSM12",
      "position": "31-32U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "ThinkSystem SR635",
      "code": "CIPASOBESX11",
      "position": "33U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "ThinkSystem SR635",
      "code": "CIPASIFADC03",
      "position": "34U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "volne",
      "code": "",
      "position": "35-37U",
      "units": "3U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "patch panely",
      "code": "",
      "position": "38-41U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S2",
      "device": "HP switch",
      "code": "CIPADKVM02",
      "position": "42U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "HP blade C7000",
      "code": "CIPADBLC03",
      "position": "1-10U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": "plati co riadok 3, bude sa vypinat"
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "volne",
      "code": "",
      "position": "11-20U",
      "units": "10U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "HP LCD",
      "code": "CIPADKVM03",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASPROJ01",
      "position": "22-23U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, bude a vypinat cca mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPAFIFTSM01N1",
      "position": "24-25U",
      "units": "2U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "volne",
      "code": "",
      "position": "26-31U",
      "units": "6U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX74",
      "position": "32U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX75",
      "position": "33U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX76",
      "position": "34U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX77",
      "position": "35U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "ThinkSystem SR635",
      "code": "CIPASVIESX78",
      "position": "36U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "patch panely",
      "code": "",
      "position": "37-41U",
      "units": "5U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S3",
      "device": "HP switch",
      "code": "CIPADKVM03",
      "position": "42U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "HP blade C7000",
      "code": "CIPADBLC04",
      "position": "1-10U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": "plati co riadok 3, bude sa vypinat"
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "volne",
      "code": "",
      "position": "11-19U",
      "units": "9U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS2",
      "position": "20U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "HP LCD",
      "code": "CIPADKVM04",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASVIVCS01",
      "position": "22-23U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, bude sa vypinat cca 3 mesiace",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASIFADC01",
      "position": "24-25U",
      "units": "2U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "volne",
      "code": "",
      "position": "26U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "Cisco 2800",
      "code": "CIPADLNCRT04",
      "position": "27U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "volne",
      "code": "",
      "position": "28-37U",
      "units": "10U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "patch panely",
      "code": "",
      "position": "38-41U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S4",
      "device": "HP switch",
      "code": "CIPADKVM04",
      "position": "42U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S5",
      "device": "volne",
      "code": "",
      "position": "1-10U",
      "units": "10U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S5",
      "device": "IBM power 6 p 570",
      "code": "CIPASVIIPW02C02",
      "position": "11-14U",
      "units": "4U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S5",
      "device": "IBM power 6 p 570",
      "code": "CIPASVIIPW02C01",
      "position": "15-18U",
      "units": "4U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S5",
      "device": "volne",
      "code": "",
      "position": "19-38U",
      "units": "20U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S5",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S6",
      "device": "volne",
      "code": "",
      "position": "1-19U",
      "units": "19U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S6",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS9",
      "position": "20U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S6",
      "device": "IBM",
      "code": "CIPADKVM05",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, ale bude sa moct vypnut - mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S6",
      "device": "IBM ",
      "code": "CIPASVIHMC02",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, ale bude sa moct vypnut - mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S6",
      "device": "volne",
      "code": "",
      "position": "23-40U",
      "units": "18U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S6",
      "device": "patch panel",
      "code": "",
      "position": "41-42U",
      "units": "2U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S7",
      "device": "volne",
      "code": "",
      "position": "1-10U",
      "units": "10U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S7",
      "device": "IBM power 6 p 570",
      "code": "CIPASVIIPW01C02",
      "position": "11-14U",
      "units": "4U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S7",
      "device": "IBM power 6 p 570",
      "code": "CIPASVIIPW01C01",
      "position": "15-18U",
      "units": "4U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S7",
      "device": "volne",
      "code": "",
      "position": "19-38U",
      "units": "20U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S7",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S8",
      "device": "volne",
      "code": "",
      "position": "1-19U",
      "units": "19U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S8",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS10",
      "position": "20U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S8",
      "device": "IBM ",
      "code": "CIPADKVM06",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, ale bude sa moct vypnut - mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S8",
      "device": "IBM ",
      "code": "CIPASVIHMC01",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, ale bude sa moct vypnut - mesiac",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S8",
      "device": "volne",
      "code": "",
      "position": "23-40U",
      "units": "18U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S8",
      "device": "patch panel",
      "code": "",
      "position": "41-42U",
      "units": "2U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S9",
      "device": "HUAWEI volne",
      "code": "",
      "position": "1-42U",
      "units": "42U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E01",
      "position": "1-2U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E02",
      "position": "3-4U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E03",
      "position": "5-6U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E04",
      "position": "7-8U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E05",
      "position": "9-10U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E06",
      "position": "11-12U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E07",
      "position": "13-14U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E08",
      "position": "15-16U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E09",
      "position": "17-18U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 cont.",
      "code": "CIPADDASWZ01",
      "position": "19-20U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E010",
      "position": "21-22U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ01E011",
      "position": "23-24U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "IBM FlashSystem 7300",
      "code": "CIPADDASF01",
      "position": "25-26U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "IBM Storage FlashSystem 5000",
      "code": "CIPADDASF03E1",
      "position": "27-31U",
      "units": "5U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "Controler FlashSystem 5200",
      "code": "CIPADDASF03",
      "position": "32U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "PDU",
      "code": "CIPADPWR3S10PS",
      "position": "33U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S10",
      "device": "volne",
      "code": "",
      "position": "34-42U",
      "units": "9U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ02E01",
      "position": "1-2U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ02E02",
      "position": "3-4U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ02E03",
      "position": "5-6U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ02E04",
      "position": "7-8U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "Storwize V7000 exp.",
      "code": "CIPADDASWZ02E05",
      "position": "9-10U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "Storwize V7000 cont.",
      "code": "CIPADDASWZ02",
      "position": "11-12U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "IBM Storage FlashSystem 5000",
      "code": "CIPADDASF02E2",
      "position": "13-17U",
      "units": "5U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "IBM Storage FlashSystem 5000",
      "code": "CIPADDASF02E1",
      "position": "18-22U",
      "units": "5U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "Controler FlashSystem 5200",
      "code": "CIPADDASF02",
      "position": "23U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "PDU",
      "code": "CIPADPWR3S11PS",
      "position": "24U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S11",
      "device": "volne",
      "code": "",
      "position": "25-42U",
      "units": "18U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HP Apollo",
      "code": "CIPAMIFBAL04",
      "position": "1-5U",
      "units": "5U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HPE Power Shelf",
      "code": "",
      "position": "6-7U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HP Apollo",
      "code": "CIPAMIFBAL03",
      "position": "8-12U",
      "units": "5U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HP Apollo",
      "code": "CIPAMIFBAL02",
      "position": "13-17U",
      "units": "5U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HPE Power Shelf",
      "code": "",
      "position": "18-19U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HP Apollo",
      "code": "CIPAMIFBAL01",
      "position": "20-24U",
      "units": "5U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "LCD",
      "code": "CIPADIFKVM02",
      "position": "25U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "switch SX6025",
      "code": "CIPADIBSWT04",
      "position": "26U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "switch SX6025",
      "code": "CIPADIBSWT03",
      "position": "27U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCLOS01N2",
      "position": "28-29U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCLOS01N1",
      "position": "30-31U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HPE ProLiant DL380",
      "code": "CIPALHCLMD01N2",
      "position": "32-33U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "HPE ProLiant DL380",
      "code": "CIPALHCLMD01N1",
      "position": "34-35U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "switch SX6025",
      "code": "CIPADIBSWT02",
      "position": "36U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "switch SX6025",
      "code": "CIPADIBMSW01",
      "position": "37U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "switch SX6025",
      "code": "CIPADIBSWT01",
      "position": "38U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "volne",
      "code": "",
      "position": "39-40U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "Catalyst2960",
      "code": "CIPADLNASW05",
      "position": "41U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S12",
      "device": "Catalyst2960",
      "code": "CIPADLNASW04",
      "position": "42U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HPE Power Shelf",
      "code": "",
      "position": "1-2U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HP blade",
      "code": "CIPAMIFBAL06",
      "position": "3-7U",
      "units": "5U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HP blade",
      "code": "CIPAMIFBAL05",
      "position": "8-12U",
      "units": "5U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCCRN02",
      "position": "13-14U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCCRN01",
      "position": "15-16U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCRVN02",
      "position": "17-18U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCRVN01",
      "position": "19-20U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCACN02",
      "position": "21-22U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPALHCACN01",
      "position": "23-24U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "switch SX6025",
      "code": "CIPADIBSWT05",
      "position": "25U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "volne",
      "code": "",
      "position": "26-38U",
      "units": "13U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "Catalyst2960",
      "code": "CIPADLNASW07",
      "position": "39U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "Catalyst2960",
      "code": "CIPADLNASW06",
      "position": "40U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "Catalyst2960",
      "code": "CIPADOBASW06",
      "position": "41U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S13",
      "device": "Catalyst 9300L",
      "code": "CIPADOBASW16",
      "position": "42U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S14",
      "device": "PDU",
      "code": "CIPADPWPDU64",
      "position": "1-2U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S14",
      "device": "PDU",
      "code": "CIPADPWPDU63",
      "position": "3-4U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S14",
      "device": "HP Blade C7000",
      "code": "CIPADIFBLC07",
      "position": "5-14U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S14",
      "device": "HP Blade C7000",
      "code": "CIPADIFBLC06",
      "position": "15-24U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S14",
      "device": "LCD",
      "code": "CIPADIFKVM01",
      "position": "25U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S14",
      "device": "HP Blade C7000",
      "code": "CIPADIFBLC05",
      "position": "26-35U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S14",
      "device": "volne",
      "code": "",
      "position": "36-42U",
      "units": "7U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM System x3550",
      "code": "CIPASDARMS01",
      "position": "1U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "volne",
      "code": "",
      "position": "2-9U",
      "units": "8U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM kniznica",
      "code": "CIPADIFTAP11.ED03",
      "position": "10-12U",
      "units": "3U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM kniznica",
      "code": "CIPADIFTAP11.ED02",
      "position": "13-15U",
      "units": "3U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM kniznica",
      "code": "CIPADIFTAP11.ED01",
      "position": "16-18U",
      "units": "3U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM kniznica",
      "code": "CIPADIFTAP11",
      "position": "19-21U",
      "units": "3U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM kniznica",
      "code": "CIPADIFTAP11.EU01",
      "position": "22-24U",
      "units": "3U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM kniznica",
      "code": "CIPADIFTAP11.EU02",
      "position": "25-27U",
      "units": "3U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "IBM kniznica",
      "code": "CIPADIFTAP11.EU03",
      "position": "28-30U",
      "units": "3U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R3",
      "size": "42U",
      "rack": "R3S15",
      "device": "volne",
      "code": "",
      "position": "31-42U",
      "units": "11U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS11",
      "position": "1U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "volne",
      "code": "",
      "position": "2-10U",
      "units": "9U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "Fortinet 1801F",
      "code": "CIPADLNFRW11",
      "position": "11-12U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "volne",
      "code": "",
      "position": "13U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "F5 R2000",
      "code": "CIPADLNNB11",
      "position": "14U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "volne",
      "code": "",
      "position": "15U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "PDU",
      "code": "cipadpwpdu01",
      "position": "16U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "PDU",
      "code": "cipadpwpdu02",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "volne",
      "code": "",
      "position": "18U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "Fortinet 1000D",
      "code": "CIPADLNFRW03",
      "position": "19-20U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "F5 Big-IP i2000",
      "code": "CIPADLNNLB03",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, moze sa vypnut, nepouziva sa, ale je dobra, udrzatelnost",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "Cisco ASA 5580",
      "code": "CIPADLNFRW01",
      "position": "22-25U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "Fortinet 1200D",
      "code": "CIPADLNFRW01",
      "position": "26-27U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, moze sa vypnut, nepouziva sa, ale je dobra, udrzatelnost",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "volne",
      "code": "",
      "position": "28U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "Cisco 4490",
      "code": "CIPADPLDNS01",
      "position": "29U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "volne",
      "code": "",
      "position": "30-37U",
      "units": "8U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "LANTIME M200",
      "code": "CIPADIFNTP01",
      "position": "38U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "volne",
      "code": "",
      "position": "39-40U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S1",
      "device": "patch panely",
      "code": "",
      "position": "41-42U",
      "units": "2U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "volne",
      "code": "",
      "position": "1-2U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "Catalyst 6500-E",
      "code": "CIPADLNCSW01",
      "position": "3-16U",
      "units": "14U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "PDU",
      "code": "CIPADPWPDU04",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "PDU",
      "code": "CIPADPWPDU03",
      "position": "18U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "volne",
      "code": "",
      "position": "19U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "Catalyst 4900",
      "code": "CIPADLNDMZ01",
      "position": "20-21U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "ASA 5540",
      "code": "CIPDLNVPN01",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": "po migracii VPN sa moze vypnut"
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWST03",
      "position": "23U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "volne",
      "code": "",
      "position": "24-25U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "Cisco 7604",
      "code": "CIPADPLSWC01",
      "position": "26-30U",
      "units": "5U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "Cisco ASR 1002",
      "code": "CIPADPLCRY01",
      "position": "31-32U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "volne",
      "code": "",
      "position": "33-38U",
      "units": "6U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S2",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADOBOFW01",
      "position": "1U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "volne",
      "code": "",
      "position": "2U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "Catalyst 6500-E",
      "code": "CIPADLNSSW01",
      "position": "3-16U",
      "units": "14U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "PDU",
      "code": "CIPADPWPDU06",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "PDU",
      "code": "CIPADPWPDU05",
      "position": "18U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "Cisco 2800",
      "code": "CIPADLNCRT01",
      "position": "19U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "volne",
      "code": "",
      "position": "20-21U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS04",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "Catalyst 9300L",
      "code": "CIPADOBASW11",
      "position": "23-24U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "volne",
      "code": "",
      "position": "25U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "Fortigate 60F",
      "code": "CIPADOBFRW01",
      "position": "26U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "volne",
      "code": "",
      "position": "27-38U",
      "units": "12U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S3",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "volne",
      "code": "",
      "position": "1-2U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "Catalyst 6500-E",
      "code": "CIPADLNDSW01",
      "position": "3-16U",
      "units": "14U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "PDU",
      "code": "CIPADPWPDU08",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "PDU",
      "code": "CIPADPWPDU07",
      "position": "18U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "volne",
      "code": "",
      "position": "19U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "Nexus 7706",
      "code": "CIPADLNDSW03",
      "position": "20-29U",
      "units": "10U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "Switch cisco 9318",
      "code": "CIPADLNCSW13",
      "position": "30U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "Switch cisco 9318",
      "code": "CIPADLNCSW11",
      "position": "31U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "Catalyst 9300L",
      "code": "CIPADOBASSW13",
      "position": "32-33U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "patch panely",
      "code": "",
      "position": "34-35U",
      "units": "2U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "Catalyst 4900",
      "code": "CIPADLNASW01",
      "position": "36-38U",
      "units": "3U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S4",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S5",
      "device": "volne",
      "code": "",
      "position": "1-32U",
      "units": "32U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S5",
      "device": "opti moduly",
      "code": "",
      "position": "33-42U",
      "units": "10U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S6",
      "device": "volne",
      "code": "",
      "position": "1-17U",
      "units": "17U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S6",
      "device": "patch panely",
      "code": "",
      "position": "18-42U",
      "units": "25U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S7",
      "device": "volne",
      "code": "",
      "position": "1-15U",
      "units": "15U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S7",
      "device": "patch panely",
      "code": "",
      "position": "16-42U",
      "units": "27U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "volne",
      "code": "",
      "position": "1U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Catalyst 6500-E",
      "code": "CIPADSCSSW01",
      "position": "2-15U",
      "units": "14U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "PDU",
      "code": "CIPADPWPDU09",
      "position": "16U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "PDU",
      "code": "CIPADPWPDU010",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "volne",
      "code": "",
      "position": "18-19U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Flowmon sonda",
      "code": "CIPADLNNFP01",
      "position": "20U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": "bez licencii, udrzatenost, bez updatov"
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Flowmon sonda",
      "code": "CIPADLNNFC01",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": "bez licencii, udrzatenost, bez updatov"
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Cisco 4270",
      "code": "CIPADSCIDS02",
      "position": "22-25U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Cisco 4270",
      "code": "CIPADSCIDS01",
      "position": "26-29U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "volne",
      "code": "",
      "position": "30U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Cisco Mars 210",
      "code": "CIPADSCMRS02",
      "position": "31-32U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Cisco 1120",
      "code": "CIPADOBAAA01",
      "position": "33U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, po migracii sa moze vypnut, ",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "Cisco 1121",
      "code": "CIPADOBAAA02",
      "position": "34U",
      "units": "1U",
      "generation": "stare",
      "status": "zive, po migracii sa moze vypnut, ",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "volne",
      "code": "",
      "position": "35-38U",
      "units": "4U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S8",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "volne",
      "code": "",
      "position": "1-2U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "Catalyst 6500-E",
      "code": "CIPADLNDSW02",
      "position": "3-16U",
      "units": "14U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "PDU",
      "code": "CIPADPWPDU12",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "PDU",
      "code": "CIPADPWPDU11",
      "position": "18U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS05",
      "position": "19U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "Nexus 7706",
      "code": "CIPADLNCSW04",
      "position": "20-29U",
      "units": "9U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "catalyst 93180YC",
      "code": "CIPADLNCSW14",
      "position": "30U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "catalyst 93180YC",
      "code": "CIPADLNCSW12",
      "position": "31U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "Catalyst 9300L",
      "code": "CIPADOBASW14",
      "position": "32-33U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "patch panely",
      "code": "",
      "position": "34-35U",
      "units": "2U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "Catalyst 4900",
      "code": "CIPADLNASW02",
      "position": "36-38",
      "units": "3U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S9",
      "device": "patch panely",
      "code": "",
      "position": "39-42",
      "units": "2U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "ASA 5540",
      "code": "CIPADOBFW01",
      "position": "1U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "volne",
      "code": "",
      "position": "2U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "Catalyst 6500-E",
      "code": "CIPADLNSSW02",
      "position": "3-16U",
      "units": "14U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "PDU",
      "code": "CIPADPWPDU14",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "PDU",
      "code": "CIPADPWPDU13",
      "position": "18U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "Cisco 2800",
      "code": "CIPADLNCRT02 CIPADLNCRT04",
      "position": "19U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "Catalyst 9300L",
      "code": "CIPADOBASW12",
      "position": "20-21U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS06",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "volne",
      "code": "",
      "position": "23-25U",
      "units": "3U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "Fortigate 60F",
      "code": "CIPADOBFRW01",
      "position": "26U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "volne",
      "code": "",
      "position": "27-38U",
      "units": "12U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S10",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "volne",
      "code": "",
      "position": "1-2U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "Catalyst 6500-E",
      "code": "CIPADLNCSW02",
      "position": "3-16U",
      "units": "14U",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "PDU",
      "code": "CIPADPWPDU016",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "PDU",
      "code": "CIPADPWPDU015",
      "position": "18U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "volne",
      "code": "",
      "position": "19U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "Catalyst 4900",
      "code": "CIPADLNDMZ02",
      "position": "20-21U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "ASA 5540",
      "code": "CIPDLNVPN02",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": "po migracii VPn sa vypne"
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "Pulsar Eaton STS 16",
      "code": "CIPADPWSTS12",
      "position": "23U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "volne",
      "code": "",
      "position": "24-25U",
      "units": "2U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "Cisco 7604",
      "code": "CIPADPLSWC02",
      "position": "26-30U",
      "units": "5U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "Cisco ASR 1002",
      "code": "CIPADPLCRY02",
      "position": "31-32U",
      "units": "2U",
      "generation": "stare",
      "status": "zive, moze sa vypnut do mesiaca",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "volne",
      "code": "",
      "position": "33-38U",
      "units": "6U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S11",
      "device": "patch panely",
      "code": "",
      "position": "39-42U",
      "units": "4U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "volne",
      "code": "",
      "position": "1-10U",
      "units": "10U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Fortinet 1801F",
      "code": "CIPADLNFRW12",
      "position": "11-12U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "volne",
      "code": "",
      "position": "13U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "F5 R2000",
      "code": "CIPADLNNB12",
      "position": "14U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "volne",
      "code": "",
      "position": "15U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "PDU",
      "code": "cipadpwpdu01",
      "position": "16U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "PDU",
      "code": "cipadpwpdu02",
      "position": "17U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "volne",
      "code": "",
      "position": "18U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Fortinet 1000D",
      "code": "CIPADLNFRW04",
      "position": "19-20U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "F5 Big-IP i2000",
      "code": "CIPADLNNLB04",
      "position": "21U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": "zive, moze sa vypnut, nepouziva sa, ale je dobra, udrzatelnost"
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Cisco ASA 5580",
      "code": "CIPADLNFRW02",
      "position": "22-25U",
      "units": "4U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Fortinet 1200D",
      "code": "CIPADLNFRW02",
      "position": "26-27U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "volne",
      "code": "",
      "position": "28U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "HPE ProLiant DL380 ",
      "code": "CIPASMGHMC01",
      "position": "29-30U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Sistore MX3232",
      "code": "",
      "position": "31-33U",
      "units": "3U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Sistore AX2",
      "code": "",
      "position": "34-35U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Sistore AX1",
      "code": "",
      "position": "36-37U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "Catalyst 2960",
      "code": "nema cislo",
      "position": "39U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "volne",
      "code": "",
      "position": "40U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R4",
      "size": "42U",
      "rack": "R4S12",
      "device": "patch panely",
      "code": "",
      "position": "41-42U",
      "units": "2U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS01",
      "position": "1-4U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS01E1",
      "position": "5-8U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS02",
      "position": "9-12U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS02E1",
      "position": "13-16U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS03",
      "position": "17-20U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS03E1",
      "position": "21-24U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS04",
      "position": "25-28U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "IBM DCS 3700",
      "code": "CIPADDADCS04E1",
      "position": "29-32U",
      "units": "4U",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S1",
      "device": "volne",
      "code": "",
      "position": "33-42U",
      "units": "10U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S2",
      "device": "IBM SONAS",
      "code": "",
      "position": "",
      "units": "",
      "generation": "stare",
      "status": "zive, bude sa vypinat po migracii vsetkych diskov, 6 mesiacov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S3",
      "device": "HP vypnute XP24000",
      "code": "",
      "position": "",
      "units": "",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S4",
      "device": "IBM vypnute",
      "code": "",
      "position": "",
      "units": "",
      "generation": "stare",
      "status": "vypnute",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S4",
      "device": "Catalyst 9300L",
      "code": "CIPADOBASW15",
      "position": "29U",
      "units": "1U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "volne",
      "code": "",
      "position": "1-5U",
      "units": "5U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "Cisco MDS 9500",
      "code": "CIPADSNCSW01",
      "position": "6-20U",
      "units": "15U",
      "generation": "stare",
      "status": "zive",
      "note": "toto bude mozne vypnut ked vyriesime BigData a Matlab, do 6 mesiacov"
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "volne",
      "code": "",
      "position": "21U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "PDU",
      "code": "CIPADPWPDU19",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "PDU",
      "code": "CIPADPWPDU20",
      "position": "23U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "volne",
      "code": "",
      "position": "24U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "cisco DS 9396T",
      "code": "CIPADSNCSW11",
      "position": "25-26U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S5",
      "device": "volne",
      "code": "",
      "position": "27-42U",
      "units": "16U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S6",
      "device": "volne",
      "code": "",
      "position": "1-8U",
      "units": "8U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S6",
      "device": "opti moduly",
      "code": "",
      "position": "9-24U",
      "units": "16U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S6",
      "device": "volne",
      "code": "",
      "position": "25-37U",
      "units": "13U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S6",
      "device": "opti moduly",
      "code": "",
      "position": "38-42U",
      "units": "5U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S7",
      "device": "volne",
      "code": "",
      "position": "1-9U",
      "units": "9U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S7",
      "device": "opti moduly",
      "code": "",
      "position": "10-24U",
      "units": "15U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S7",
      "device": "volne",
      "code": "",
      "position": "25-37U",
      "units": "13U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S7",
      "device": "opti moduly",
      "code": "",
      "position": "38-42U",
      "units": "5U",
      "generation": "stare",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "volne",
      "code": "",
      "position": "1-5U",
      "units": "5U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "Cisco MDS 9500",
      "code": "CIPADSNCSW02",
      "position": "6-20U",
      "units": "15U",
      "generation": "stare",
      "status": "zive",
      "note": "toto bude mozne vypnut ked vyriesime BigData a Matlab, do 6 mesiacov"
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "volne",
      "code": "",
      "position": "21U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "PDU",
      "code": "CIPADPWPDU22",
      "position": "22U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "PDU",
      "code": "CIPADPWPDU21",
      "position": "23U",
      "units": "1U",
      "generation": "stare",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "volne",
      "code": "",
      "position": "24U",
      "units": "1U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "cisco DS 9396T",
      "code": "CIPADSNCSW12",
      "position": "25-26U",
      "units": "2U",
      "generation": "nove",
      "status": "zive",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S8",
      "device": "volne",
      "code": "",
      "position": "27-42U",
      "units": "16U",
      "generation": "",
      "status": "",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S9",
      "device": "IBM knižnica",
      "code": "",
      "position": "",
      "units": "",
      "generation": "stare",
      "status": "zive, bude sa vypinat do dvoch tyzdnov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S10",
      "device": "IBM knižnica",
      "code": "",
      "position": "",
      "units": "",
      "generation": "stare",
      "status": "zive, bude sa vypinat do dvoch tyzdnov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S11",
      "device": "IBM knižnica",
      "code": "",
      "position": "",
      "units": "",
      "generation": "stare",
      "status": "zive, bude sa vypinat do dvoch tyzdnov",
      "note": ""
    },
    {
      "row": "R5",
      "size": "42U",
      "rack": "R5S12",
      "device": "IBM knižnica",
      "code": "",
      "position": "",
      "units": "",
      "generation": "stare",
      "status": "zive, bude sa vypinat do dvoch tyzdnov",
      "note": ""
    }
  ],
  "projects": [
    {
      "name": "Matlab",
      "note": "",
      "category": "Vedecké výpočty",
      "status": "Ostrá prevádzka",
      "description": "Vedecké výpočty pre vedeckú obec a študentov; fyzické blade servery a terminálové servery."
    },
    {
      "name": "HGD database",
      "note": "",
      "category": "Vedecké databázy",
      "status": "Ostrá prevádzka",
      "description": "Vedecká databáza pre výskum ľudského genómu s webovým rozhraním."
    },
    {
      "name": "Osobnosti vedy",
      "note": "",
      "category": "Portály",
      "status": "Ostrá prevádzka",
      "description": "Verejný portál a redakčný systém pre evidenciu ocenených osobností vedy a techniky."
    },
    {
      "name": "Adinis",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "indelfinder",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "adicyt",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "logit",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "adprot",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "exprof",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "SKCRIS",
      "note": "",
      "category": "Registre a reporty",
      "status": "Ostrá prevádzka",
      "description": "Informačný systém vedy a výskumu s portálom, integráciou, reportmi a databázou."
    },
    {
      "name": "Schola ludus – videoserver",
      "note": "",
      "category": "Médiá",
      "status": "Infraštruktúra v prevádzke",
      "description": "Streamovacia infraštruktúra využívaná aj pre potreby CVTI a vedatechnika.sk."
    },
    {
      "name": "Mediainfo",
      "note": "",
      "category": "Médiá",
      "status": "Nasadzovanie",
      "description": "Systém na prezentáciu online tlačovín a skenov."
    },
    {
      "name": "VASP",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "Bionumerics",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "SVOP",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "Centrálny register záverečných prác",
      "note": "",
      "category": "Registre",
      "status": "Produkčná prevádzka",
      "description": "Register záverečných a kvalifikačných prác a porovnávací korpus."
    },
    {
      "name": "Centrálny register publikačnej činnosti",
      "note": "",
      "category": "Registre",
      "status": "Produkčná prevádzka",
      "description": "Automatizovaná evidencia publikačnej činnosti vysokých škôl."
    },
    {
      "name": "Centrálny register edukačnej činnosti",
      "note": "",
      "category": "Registre",
      "status": "Produkčná prevádzka",
      "description": "Register súvisiaci s evidenciou činnosti vysokých škôl."
    },
    {
      "name": "Antiplagiátorsky system",
      "note": "",
      "category": "Registre",
      "status": "Produkčná prevádzka",
      "description": "Systém kontroly originality prác a porovnávací korpus."
    },
    {
      "name": "SciDAP",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "VedaTechnika",
      "note": "",
      "category": "Portály",
      "status": "Ostrá prevádzka",
      "description": "Centrálny informačný portál pre výskum, vývoj a inovácie."
    },
    {
      "name": "ISS",
      "note": "",
      "category": "Informačné systémy",
      "status": "Produkčná prevádzka",
      "description": "Integrovaný systém služieb."
    },
    {
      "name": "NPTT – upgrade",
      "note": "",
      "category": "Portály",
      "status": "Ostrá prevádzka",
      "description": "Správa požiadaviek na expertné podporné služby v procese transferu technológií."
    },
    {
      "name": "BUXUS weby",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "OWNCLOUD",
      "note": "",
      "category": "Cloudové služby",
      "status": "Prevádzka",
      "description": "Vlastná služba cloudového prístupu k dátam pre používateľov a projekty."
    },
    {
      "name": "NPC",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "FabLab",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "Suweco",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "BigData",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "IT Akadémia",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "Jira",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "IBM Cloud Orchestrator",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "HPC",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "Discourse",
      "note": "diskusne forum pre uzivatelov, vedecku komunitu a pod. Trgala je admin a aj poziadavka isla od neho",
      "category": "Kolaborácia",
      "status": "Prevádzka",
      "description": "Komunikačná platforma na zdieľanie úloh, diskusie a spoluprácu."
    },
    {
      "name": "SPSS",
      "note": "Statisticky softver, testovacia verzia nasadena na nasich serveroch a stale funkcna, licenciu aj nasadenie riesil Bosnak",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": "Statisticky softver, testovacia verzia nasadena na nasich serveroch a stale funkcna, licenciu aj nasadenie riesil Bosnak"
    },
    {
      "name": "SSBMB",
      "note": "riaditel a Gabika Gavurnikova, Slovenska spolocnost pre biochemiu a molekularnu biologiu, webova stranka",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": "riaditel a Gabika Gavurnikova, Slovenska spolocnost pre biochemiu a molekularnu biologiu, webova stranka"
    },
    {
      "name": "eshop",
      "note": "eshop pre CVTI, Bosnak",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": "eshop pre CVTI, Bosnak"
    },
    {
      "name": "SAV Kosice",
      "note": "maju u nas zalohovanie a je na to podpisana zmluva as doslo k prepojeniu lokalit, riesil to Bilsky a Noge a za SAV Kosice Skyba",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": "maju u nas zalohovanie a je na to podpisana zmluva as doslo k prepojeniu lokalit, riesil to Bilsky a Noge a za SAV Kosice Skyba"
    },
    {
      "name": "Repozitar",
      "note": "Kasakova, Capkovic, ale to sa robili iba servre a nasadzuju to aktualne",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": "Kasakova, Capkovic, ale to sa robili iba servre a nasadzuju to aktualne"
    },
    {
      "name": "HAN",
      "note": "nove servre, Capkovic",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": "nove servre, Capkovic"
    },
    {
      "name": "eraportal",
      "note": "novy web, Peter Wachter",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": "novy web, Peter Wachter"
    },
    {
      "name": "sport.cvtisr.sk",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "Server pre archivaciu BIOARCH",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "Remotio",
      "note": "",
      "category": "Vedecké dáta",
      "status": "Prevádzka",
      "description": "Informačný systém na spracovanie snímok z vesmíru."
    },
    {
      "name": "KOMIS",
      "note": "",
      "category": "Informačné systémy",
      "status": "Prevádzka",
      "description": "Komplexné serverové prostredie prevádzkované v dátovom centre."
    },
    {
      "name": "GIMS",
      "note": "",
      "category": "Informačné systémy",
      "status": "Prevádzka",
      "description": "Viacserverové aplikačné, databázové a integračné prostredie."
    },
    {
      "name": "IWCloud",
      "note": "",
      "category": "Cloudové služby",
      "status": "Prevádzka",
      "description": "Cloudové prostredie s riadiacimi, výpočtovými a podpornými uzlami."
    },
    {
      "name": "Analyticke nastroje",
      "note": "",
      "category": "Analytika",
      "status": "Prevádzka",
      "description": "Súbor analytických komponentov a serverov."
    },
    {
      "name": "Covseq",
      "note": "",
      "category": "Vedecké dáta",
      "status": "Prevádzka",
      "description": "Viacserverové prostredie pre spracovanie sekvenačných dát."
    },
    {
      "name": "EFONF",
      "note": "",
      "category": "Zdrojový zoznam",
      "status": "Neurčený",
      "description": ""
    },
    {
      "name": "ERMS",
      "note": "",
      "category": "Informačné systémy",
      "status": "Prevádzka",
      "description": "Viacvrstvové serverové prostredie."
    },
    {
      "name": "IDM",
      "note": "",
      "category": "Identity",
      "status": "Prevádzka",
      "description": "Identity management a súvisiace integračné komponenty."
    },
    {
      "name": "Kniznicky IS",
      "note": "",
      "category": "Knižničné systémy",
      "status": "Prevádzka",
      "description": "Knižničný informačný systém."
    }
  ],
  "nonIt": [
    {
      "category": "Napájanie a UPS",
      "summary": "Dva nezávislé napájacie prívody, zálohovanie UPS a motorgenerátorom.",
      "items": [
        "2× UPS Frame Newave DPA 250",
        "8× Power Modul Newave Conceptpower DPA 50",
        "4× batériová skriňa Newave DPA 200S",
        "640× batéria 12V/28Ah",
        "Dieselový motorgenerátor Caterpillar Olympian GEP 550 (550 kVA / 440 kW)"
      ]
    },
    {
      "category": "Klimatizácia",
      "summary": "Sálové chladiace a vonkajšie kondenzátorové jednotky.",
      "items": [
        "4× Liebert-Hiross HPM L99 UA",
        "8× Liebert-Hiross HCE 87"
      ]
    },
    {
      "category": "Hasiaci a detekčný systém",
      "summary": "Stabilné hasiace zariadenie Sinorix pre serverovňu a UPS vrátane EPS a VESDA.",
      "items": [
        "2× hasiaca ústredňa Siemens XC1001-A",
        "30× kombinovaný hlásič požiaru Siemens FDOOT241-9",
        "7× odsávací systém VESDA Laser Focus Xtralis VLF-250",
        "Strojná časť SHZ – fľaše, hasivo, trysky a príslušenstvo"
      ]
    },
    {
      "category": "Fyzická bezpečnosť",
      "summary": "Integrovaný bezpečnostný systém PSN, SKV a PTV.",
      "items": [
        "1× ústredňa PSN SPC6330.310 L1",
        "1× riadiaca jednotka Siemens AC 5100",
        "4× čítačka kariet PR-500",
        "22× kamerové zariadenia (IP a analógové)",
        "1× záznamové zariadenie SISTORE MX3232 3G"
      ]
    }
  ],
  "capacity": [
    {
      "name": "CPU",
      "total": "4 THz",
      "used": "240,3 GHz",
      "free": "3,8 THz",
      "percent": 6.0
    },
    {
      "name": "Pamäť",
      "total": "33,34 TB",
      "used": "6,69 TB",
      "free": "26,64 TB",
      "percent": 20.1
    },
    {
      "name": "Primárne úložisko",
      "total": "290,11 TB",
      "used": "141 TB",
      "free": "149,11 TB",
      "percent": 48.6
    }
  ],
  "hpc": [
    "36× HP ProLiant XL230a Gen9 bez akcelerátora",
    "5× HP ProLiant XL250a Gen9 s 10× NVIDIA Tesla K40",
    "5× HP ProLiant XL250a Gen9 s 10× Intel Xeon Phi 7120P",
    "2× prístupový uzol HP ProLiant DL380 Gen9",
    "2× riadiaci uzol HP ProLiant DL380 Gen9",
    "2× uzol vzdialenej vizualizácie",
    "4× uzol prístupu k dátovému úložisku"
  ],
  "serviceWorkflow": "Dohľadový systém generuje alerty a notifikácie podľa typu zariadenia. Zásah sa koordinuje medzi administrátorom a pracovníkmi dátového centra; pred fyzickým zásahom sa zariadenia podľa potreby migrujú na záložné zdroje. Hot-plug výmeny sa vykonávajú koordinovane s príslušným administrátorom."
} as {
  people: OitPerson[]
  raciAreas: OitRaciArea[]
  rackInventory: OitRackItem[]
  projects: OitProject[]
  nonIt: {category:string;summary:string;items:string[]}[]
  capacity: {name:string;total:string;used:string;free:string;percent:number}[]
  hpc: string[]
  serviceWorkflow: string
}
