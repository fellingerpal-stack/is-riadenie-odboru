import { Icon, PageHeader } from '../components/UI'

type Go = (view:string)=>void

export default function DepartmentPortal({go,canOit=true,canOris=true,canShared=true}:{go:Go;canOit?:boolean;canOris?:boolean;canShared?:boolean}){
  return <div className="department-portal">
    <PageHeader eyebrow="Portál riadenia CVTI SR" title="Vyberte pracovný priestor" description="Oddelené riadiace pohľady pre odbor 3.1 a odbor 3.2 dopĺňajú spoločné moduly: technologický katalóg, riadiace centrum Service 360 a finančný pohľad IT nákladov, ktoré prepájajú prevádzku, rozvoj, infraštruktúru, služby, zodpovednosti a kontrakty."/>
    <section className="department-grid">
      <article className={`department-card department-card-oris ${!canOris?'is-access-disabled':''}`}>
        <div className="department-card-top"><div className="department-icon"><Icon name="dashboard" size={27}/></div><span>ODBORNÝ BLOK 01</span></div>
        <h2>3.2 · Odbor prevádzky, rozvoja informačných systémov a projektové riadenie</h2>
        <p>Riadenie ľudí, RACI, služieb, digitálneho portfólia, kapacít, projektov, ServiceDesku, IAM, CMDB, rizík a rozhodnutí.</p>
        <div className="department-tags"><span>RACI a služby</span><span>Digitálne portfólio</span><span>ITSM</span><span>Riadenie práce</span></div>
        <button className="department-enter" disabled={!canOris} onClick={()=>go('dashboard')}>{canOris?'Vstúpiť do ORIS':'Prístup nepridelený'} <Icon name="arrow" size={18}/></button>
      </article>
      <article className={`department-card department-card-oit ${!canOit?'is-access-disabled':''}`}>
        <div className="department-card-top"><div className="department-icon"><Icon name="systems" size={27}/></div><span>ODBORNÝ BLOK 02</span></div>
        <h2>3.1 · Odbor správy a prevádzky IT infraštruktúry</h2>
        <p>Samostatný priestor pre RACI OIT, dve serverové lokality, sieťovú architektúru, prevádzkované systémy, riziká a väzby na spoločné ITSM registre.</p>
        <div className="department-tags"><span>79 RACI procesov</span><span>2 serverové lokality</span><span>4 topológie a dokumenty</span><span>53 projektov</span><span>ITSM a CMDB väzby</span></div>
        <button className="department-enter" disabled={!canOit} onClick={()=>go('oit')}>{canOit?'Vstúpiť do OIT':'Prístup nepridelený'} <Icon name="arrow" size={18}/></button>
      </article>
    </section>
    {canShared&&<section className="shared-technology-entry panel"><div><span className="shared-technology-icon"><Icon name="systems" size={27}/></span><div><span className="eyebrow">SPOLOČNÝ MODUL</span><h2>Technologický katalóg a infraštruktúrny explorer</h2><p>Interaktívny reťazec lokalita → server → platforma → informačný systém → služba, doplnený o IaaS/PaaS/SaaS, kapacity, licencie a simuláciu dopadu výpadku.</p></div></div><button className="button button-primary" onClick={()=>go('technology')}>Otvoriť technologický katalóg <Icon name="arrow" size={17}/></button></section>}
    {canShared&&<section className="shared-technology-entry panel"><div><span className="shared-technology-icon"><Icon name="shield" size={27}/></span><div><span className="eyebrow">SPOLOČNÉ RIADIACE CENTRUM</span><h2>Service 360 · Control Tower · lifecycle · forecast</h2><p>Jedna manažérska obrazovka nad službami, RACI, technológiami, incidentmi, problémami, zmenami, nákladmi, dodávateľskou koncentráciou a rozpočtovým forecastom úloh 10/22/25.</p></div></div><button className="button button-primary" onClick={()=>go('intelligence')}>Otvoriť riadiace centrum <Icon name="arrow" size={17}/></button></section>}
    {canShared&&<section className="shared-technology-entry panel"><div><span className="shared-technology-icon"><Icon name="capacity" size={27}/></span><div><span className="eyebrow">SPOLOČNÝ FINANČNÝ MODUL</span><h2>IT náklady · prevádzka, rozvoj a infraštruktúra</h2><p>Päťročný porovnateľný pohľad na IT platby s rozdelením RUN/CHANGE, nákladovými doménami, dôkaznými položkami a väzbami COST × SERVICE × RACI pre odbory 3.1 a 3.2.</p></div></div><button className="button button-primary" onClick={()=>go('itCosts')}>Otvoriť IT náklady <Icon name="arrow" size={17}/></button></section>}
    <section className="portal-principles panel">
      <div><Icon name="shield" size={22}/><span><strong>Oddelené pracovné priestory</strong><small>ORIS a OIT majú samostatné menu a manažérske pohľady.</small></span></div>
      <div><Icon name="database" size={22}/><span><strong>Spoločná autentifikácia</strong><small>Prihlásenie, roly a administrácia používateľov ostávajú centrálne.</small></span></div>
      <div><Icon name="roadmap" size={22}/><span><strong>Postupné rozširovanie</strong><small>Spoločná architektúra prepája služby odboru 3.2 s lokalitami, platformami, monitoringom a zálohovaním odboru 3.1.</small></span></div>
    </section>
  </div>
}
