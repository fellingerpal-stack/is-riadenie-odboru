import { Icon } from '../components/UI'

type Go = (view:string)=>void

type PortalCardProps = {
  className: string
  eyebrow: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  buttonLabel: string
  icon: 'dashboard' | 'systems' | 'shield' | 'capacity' | 'cmdb'
  disabled?: boolean
  onOpen: () => void
}

function PortalCard({ className, eyebrow, title, subtitle, description, tags, buttonLabel, icon, disabled = false, onOpen }: PortalCardProps) {
  return <article className={`portal-launch-card ${className} ${disabled ? 'is-access-disabled' : ''}`}>
    <div className="portal-launch-card-accent" aria-hidden="true" />
    <div className="portal-launch-card-head">
      <span className="portal-launch-card-icon"><Icon name={icon} size={25}/></span>
      <div className="portal-launch-card-heading">
        <span className="portal-launch-card-eyebrow">{eyebrow}</span>
        <strong>{subtitle}</strong>
      </div>
      <span className={`portal-launch-access ${disabled ? 'is-locked' : ''}`}>
        <i />{disabled ? 'Bez prístupu' : 'Dostupné'}
      </span>
    </div>
    <div className="portal-launch-card-body">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="portal-launch-tags">{tags.map((tag)=><span key={tag}>{tag}</span>)}</div>
    </div>
    <button className="portal-launch-enter" disabled={disabled} onClick={onOpen}>
      <span>{disabled ? 'Prístup nepridelený' : buttonLabel}</span>
      <Icon name={disabled ? 'lock' : 'arrow'} size={18}/>
    </button>
  </article>
}

export default function DepartmentPortal({go,canOit=true,canOris=true,canShared=true}:{go:Go;canOit?:boolean;canOris?:boolean;canShared?:boolean}){
  const availableModules = Number(canOris) + Number(canOit) + (canShared ? 4 : 0)

  return <div className="department-portal portal-launch">
    <section className="portal-launch-hero">
      <div className="portal-launch-hero-copy">
        <span className="portal-launch-kicker">PORTÁL RIADENIA CVTI SR</span>
        <h1>Vyberte pracovný priestor</h1>
        <p>Vstúpte priamo do odborného priestoru alebo do spoločného riadiaceho modulu. Všetky oblasti používajú spoločnú autentifikáciu, synchronizované dáta a jednotné väzby medzi službami, technológiami, nákladmi a zodpovednosťami.</p>
      </div>
      <div className="portal-launch-hero-status" aria-label="Stav portálu">
        <div><span><Icon name="dashboard" size={18}/></span><strong>{availableModules}</strong><small>dostupných modulov</small></div>
        <div><span><Icon name="database" size={18}/></span><strong>1</strong><small>spoločná dátová vrstva</small></div>
        <div><span><Icon name="shield" size={18}/></span><strong>SSO</strong><small>jednotné oprávnenia</small></div>
      </div>
    </section>

    <div className="portal-launch-section-title">
      <div><span>PRACOVNÉ PRIESTORY</span><h2>Odbory a spoločné moduly</h2></div>
      <p>Najčastejšie používané oblasti sú dostupné jedným kliknutím.</p>
    </div>

    <section className="portal-launch-grid" aria-label="Výber pracovného priestoru">
      <PortalCard
        className="portal-launch-oris portal-launch-featured"
        eyebrow="ODBORNÝ PRIESTOR"
        subtitle="Odbor 3.2 · ORIS"
        title="Prevádzka, rozvoj IS a projektové riadenie"
        description="Riadenie ľudí, RACI, služieb, digitálneho portfólia, projektov, ITSM, IAM, rizík a rozhodnutí v jednom pracovnom priestore."
        tags={['RACI a služby','Digitálne portfólio','ITSM','Riadenie práce']}
        buttonLabel="Vstúpiť do ORIS"
        icon="dashboard"
        disabled={!canOris}
        onOpen={()=>go('dashboard')}
      />
      <PortalCard
        className="portal-launch-oit portal-launch-featured"
        eyebrow="ODBORNÝ PRIESTOR"
        subtitle="Odbor 3.1 · OIT"
        title="Správa a prevádzka IT infraštruktúry"
        description="RACI OIT, serverové lokality, sieťová architektúra, prevádzkované systémy, projekty, riziká a väzby na spoločné ITSM registre."
        tags={['79 RACI procesov','2 lokality','Sieť a systémy','53 projektov']}
        buttonLabel="Vstúpiť do OIT"
        icon="systems"
        disabled={!canOit}
        onOpen={()=>go('oit')}
      />

      {canShared && <PortalCard
        className="portal-launch-technology"
        eyebrow="SPOLOČNÝ MODUL"
        subtitle="Technology Intelligence"
        title="Technologický katalóg"
        description="Explorer infraštruktúry od lokality cez server a platformu až po informačný systém a službu, vrátane IaaS/PaaS/SaaS, kapacít a lifecycle."
        tags={['Infra explorer','IaaS / PaaS / SaaS','Lifecycle']}
        buttonLabel="Otvoriť katalóg"
        icon="systems"
        onOpen={()=>go('technology')}
      />}
      {canShared && <PortalCard
        className="portal-launch-intelligence"
        eyebrow="RIADIACE CENTRUM"
        subtitle="Management Intelligence"
        title="Service 360 · Control Tower"
        description="Manažérsky pohľad nad službami, RACI, technológiami, incidentmi, zmenami, lifecycle, dodávateľmi a forecastom kontraktových úloh."
        tags={['Service 360','Control Tower','Forecast']}
        buttonLabel="Otvoriť riadiace centrum"
        icon="shield"
        onOpen={()=>go('intelligence')}
      />}
      {canShared && <PortalCard
        className="portal-launch-costs"
        eyebrow="FINANČNÝ MODUL"
        subtitle="Finance Intelligence"
        title="IT náklady"
        description="Viacročný pohľad na IT platby, RUN/CHANGE, nákladové domény, dôkazné položky a väzby COST × SERVICE × RACI pre odbory 3.1 a 3.2."
        tags={['RUN / CHANGE','Finančný ledger','COST × RACI']}
        buttonLabel="Otvoriť IT náklady"
        icon="capacity"
        onOpen={()=>go('itCosts')}
      />}
      {canShared && <PortalCard
        className="portal-launch-assets"
        eyebrow="ASSET REGISTER"
        subtitle="Asset Intelligence"
        title="Asset Management · Asset 360"
        description="Centrálna evidencia fyzických a virtuálnych aktív s vlastníctvom, lifecycle, QR identifikáciou, inventarizáciou a väzbami na služby a technológie."
        tags={['Asset 360','Inventarizácia','Lifecycle']}
        buttonLabel="Otvoriť Asset management"
        icon="cmdb"
        onOpen={()=>go('cmdb')}
      />}
    </section>

    <section className="portal-launch-principles" aria-label="Princípy portálu">
      <div><span><Icon name="shield" size={20}/></span><p><strong>Oddelené kompetencie</strong><small>Každý odbor má vlastný riadiaci priestor a scope oprávnení.</small></p></div>
      <div><span><Icon name="database" size={20}/></span><p><strong>Spoločné dáta</strong><small>Technológie, služby, aktíva a náklady zostávajú vzájomne prepojené.</small></p></div>
      <div><span><Icon name="roadmap" size={20}/></span><p><strong>Jeden manažérsky obraz</strong><small>Spoločné moduly vytvárajú jednotný pohľad naprieč 3.1 a 3.2.</small></p></div>
    </section>
  </div>
}
