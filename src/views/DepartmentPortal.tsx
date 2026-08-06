import { Icon, PageHeader } from '../components/UI'

type Go = (view:string)=>void

export default function DepartmentPortal({go}:{go:Go}){
  return <div className="department-portal">
    <PageHeader eyebrow="Portál riadenia CVTI SR" title="Vyberte pracovný priestor" description="Oddelené riadiace pohľady pre ORIS a OIT. Každý odbor má vlastnú navigáciu, dáta a manažérske prehľady."/>
    <section className="department-grid">
      <article className="department-card department-card-oris">
        <div className="department-card-top"><div className="department-icon"><Icon name="dashboard" size={27}/></div><span>ODBORNÝ BLOK 01</span></div>
        <h2>ORIS · Odbor 3.2</h2>
        <p>Riadenie ľudí, RACI, služieb, digitálneho portfólia, kapacít, projektov, ServiceDesku, IAM, CMDB, rizík a rozhodnutí.</p>
        <div className="department-tags"><span>RACI a služby</span><span>Digitálne portfólio</span><span>ITSM</span><span>Riadenie práce</span></div>
        <button className="department-enter" onClick={()=>go('dashboard')}>Vstúpiť do ORIS <Icon name="arrow" size={18}/></button>
      </article>
      <article className="department-card department-card-oit">
        <div className="department-card-top"><div className="department-icon"><Icon name="systems" size={27}/></div><span>ODBORNÝ BLOK 02</span></div>
        <h2>OIT · Informačné technológie</h2>
        <p>Samostatný priestor pre RACI OIT, dve serverové lokality, sieťovú architektúru, prevádzkované systémy a prevádzkové riziká.</p>
        <div className="department-tags"><span>79 RACI procesov</span><span>2 serverové lokality</span><span>4 topológie a dokumenty</span><span>53 projektov</span></div>
        <button className="department-enter" onClick={()=>go('oit')}>Vstúpiť do OIT <Icon name="arrow" size={18}/></button>
      </article>
    </section>
    <section className="portal-principles panel">
      <div><Icon name="shield" size={22}/><span><strong>Oddelené pracovné priestory</strong><small>ORIS a OIT majú samostatné menu a manažérske pohľady.</small></span></div>
      <div><Icon name="database" size={22}/><span><strong>Spoločná autentifikácia</strong><small>Prihlásenie, roly a administrácia používateľov ostávajú centrálne.</small></span></div>
      <div><Icon name="roadmap" size={22}/><span><strong>Postupné rozširovanie</strong><small>OIT blok je pripravený na ďalšie databázové moduly a workflow.</small></span></div>
    </section>
  </div>
}
