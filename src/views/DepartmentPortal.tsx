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
  icon: 'dashboard' | 'systems' | 'shield' | 'capacity' | 'cmdb' | 'helpdesk' | 'projects'
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

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return <div className="portal-launch-section-title">
    <div><span>{eyebrow}</span><h2>{title}</h2></div>
    <p>{note}</p>
  </div>
}

export default function DepartmentPortal({go,canOit=true,canOris=true,canShared=true,canServiceDesk=false,canProjects=false}:{go:Go;canOit?:boolean;canOris?:boolean;canShared?:boolean;canServiceDesk?:boolean;canProjects?:boolean}){
  const availableModules = 1 + Number(canOris) + Number(canOit) + (canShared ? 5 : 0) + Number(canServiceDesk) + Number(canProjects)

  return <div className="department-portal portal-launch portal-launch-vb">
    <section className="portal-launch-hero">
      <div className="portal-launch-hero-copy">
        <span className="portal-launch-kicker">PORTÁL RIADENIA CVTI SR</span>
        <h1>Vyberte pracovný priestor</h1>
        <p>Dva odborné priestory a spoločné IT moduly v jednom prehľadnom vstupe. Dáta, oprávnenia a väzby medzi službami zostávajú spoločné.</p>
      </div>
      <div className="portal-launch-hero-status" aria-label="Stav portálu">
        <div><span><Icon name="dashboard" size={17}/></span><p><strong>{availableModules}</strong><small>modulov</small></p></div>
        <div><span><Icon name="database" size={17}/></span><p><strong>1</strong><small>dátová vrstva</small></p></div>
        <div><span><Icon name="shield" size={17}/></span><p><strong>SSO</strong><small>oprávnenia</small></p></div>
      </div>
    </section>

    {canProjects && <section className="portal-launch-supermodule" aria-label="Riadenie projektov CVTI SR">
      <article className="portal-launch-card portal-launch-supercard portal-launch-projects">
        <div className="portal-launch-card-accent" aria-hidden="true" />
        <div className="portal-launch-supercopy">
          <span className="portal-launch-card-icon"><Icon name="projects" size={26}/></span>
          <div className="portal-launch-card-body">
            <span className="portal-launch-card-eyebrow">NOVÝ MODUL · PROJECT PORTFOLIO & DELIVERY</span>
            <h2>Riadenie projektov · jeden register od zámeru po prevádzku</h2>
            <p>Stav a fáza projektu, projektový tím, financovanie, úlohy, míľniky a väzby na informačné systémy, služby, zmluvy a dodávateľov v jednom projektovom obraze.</p>
            <div className="portal-launch-tags"><span>Project portfolio</span><span>Delivery lifecycle</span><span>Tím a roly</span><span>Financovanie</span><span>Cross-module väzby</span></div>
          </div>
        </div>
        <div className="portal-launch-super-action">
          <button className="portal-launch-enter" onClick={()=>go('projectManagement')}><span>Otvoriť Riadenie projektov</span><Icon name="arrow" size={18}/></button>
          <small>Prístup: administrátor, projektový manažér a člen projektu podľa pridelenia.</small>
        </div>
      </article>
    </section>}

    {canServiceDesk && <section className="portal-launch-supermodule" aria-label="ServiceDesk CVTI SR">
      <article className="portal-launch-card portal-launch-supercard portal-launch-servicedesk">
        <div className="portal-launch-card-accent" aria-hidden="true" />
        <div className="portal-launch-supercopy">
          <span className="portal-launch-card-icon"><Icon name="helpdesk" size={26}/></span>
          <div className="portal-launch-card-body">
            <span className="portal-launch-card-eyebrow">ADMIN MODUL · ITSM · DOČASNE NEAKTÍVNY PRE POUŽÍVATEĽOV</span>
            <h2>ServiceDesk CVTI SR</h2>
            <p>ServiceDesk zostáva v aplikácii zachovaný, ale v tejto fáze je dostupný iba administrátorovi. Dáta a konfigurácia sa nemenia.</p>
            <div className="portal-launch-tags"><span>Admin only</span><span>Zachované dáta</span><span>Pripravené na neskoršiu aktiváciu</span></div>
          </div>
        </div>
        <div className="portal-launch-super-action">
          <button className="portal-launch-enter" onClick={()=>go('serviceDesk')}><span>Otvoriť ServiceDesk</span><Icon name="arrow" size={18}/></button>
          <small>Modul nie je momentálne publikovaný bežným používateľom ani riešiteľom.</small>
        </div>
      </article>
    </section>}

    {canShared && <section className="portal-launch-supermodule" aria-label="CVTI 360 Enterprise Intelligence">
      <article className="portal-launch-card portal-launch-supercard portal-launch-cvti360">
        <div className="portal-launch-card-accent" aria-hidden="true" />
        <div className="portal-launch-supercopy">
          <span className="portal-launch-card-icon"><Icon name="shield" size={26}/></span>
          <div className="portal-launch-card-body">
            <span className="portal-launch-card-eyebrow">SUPERMODUL · ENTERPRISE INTELLIGENCE</span>
            <h2>CVTI 360 · jeden obraz nad celým IT</h2>
            <p>Vyhľadaj systém alebo službu a na jednej 360° karte uvidíš financie, čerpanie, úlohy, ľudí, RACI, technológie, assety, riziká, dodávateľov, zmluvy a prevádzkové väzby.</p>
            <div className="portal-launch-tags"><span>CRZP / ANTIPLAG pilot</span><span>Finance drill-down</span><span>RACI + Asset + ITSM</span><span>Relationship map</span></div>
          </div>
        </div>
        <div className="portal-launch-super-action">
          <button className="portal-launch-enter" onClick={()=>go('enterprise360')}><span>Otvoriť CVTI 360</span><Icon name="arrow" size={18}/></button>
          <small>Read-only integračná vrstva nad existujúcimi modulmi.</small>
        </div>
      </article>
    </section>}

    {(canOris || canOit) && <>
    <SectionHeading
      eyebrow="HLAVNÉ PRACOVNÉ PRIESTORY"
      title="Odbory 3.2 a 3.1"
      note="Primárne pracovné prostredia pre každodenné riadenie."
    />

    <section className="portal-launch-primary-grid" aria-label="Hlavné pracovné priestory">
      <PortalCard
        className="portal-launch-oris portal-launch-featured"
        eyebrow="ODBORNÝ PRIESTOR"
        subtitle="Odbor 3.2 · ORIS"
        title="Prevádzka, rozvoj IS a projektové riadenie"
        description="RACI, služby, projekty, ITSM, IAM, riziká a rozhodnutia odboru 3.2."
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
        description="Infraštruktúra, siete, lokality, systémy, projekty a prevádzkové riziká odboru 3.1."
        tags={['79 RACI procesov','2 lokality','Sieť a systémy','53 projektov']}
        buttonLabel="Vstúpiť do OIT"
        icon="systems"
        disabled={!canOit}
        onOpen={()=>go('oit')}
      />
    </section>

    </>}

    {canShared && <>
      <SectionHeading
        eyebrow="SPOLOČNÉ RIADENIE"
        title="Technológie a manažérsky obraz"
        note="Spoločné moduly prepájajú oba odbory bez zmeny ich kompetencií."
      />

      <section className="portal-launch-shared-grid" aria-label="Spoločné riadiace moduly">
        <PortalCard
          className="portal-launch-technology portal-launch-shared"
          eyebrow="SPOLOČNÝ MODUL"
          subtitle="Technology Intelligence"
          title="Technologický katalóg"
          description="Systémy, platformy, infraštruktúra, kapacity a lifecycle v jednom exploreri."
          tags={['Infra explorer','IaaS / PaaS / SaaS','Lifecycle']}
          buttonLabel="Otvoriť katalóg"
          icon="systems"
          onOpen={()=>go('technology')}
        />
        <PortalCard
          className="portal-launch-intelligence portal-launch-shared"
          eyebrow="RIADIACE CENTRUM"
          subtitle="Management Intelligence"
          title="Service 360 · Control Tower"
          description="Service 360, Control Tower, forecast a manažérske signály naprieč IT."
          tags={['Service 360','Control Tower','Forecast']}
          buttonLabel="Otvoriť riadiace centrum"
          icon="shield"
          onOpen={()=>go('intelligence')}
        />
      </section>

      <SectionHeading
        eyebrow="RÝCHLY PRÍSTUP"
        title="Financie a aktíva"
        note="Podporné registre dostupné bez vizuálneho súperenia s hlavnými pracovnými priestormi."
      />

      <section className="portal-launch-utility-grid" aria-label="Podporné spoločné moduly">
        <PortalCard
          className="portal-launch-costs portal-launch-utility"
          eyebrow="FINANČNÝ MODUL"
          subtitle="Finance Intelligence"
          title="IT náklady"
          description="IT platby, RUN/CHANGE a auditný drill-down úloh 10 / 22 / 25."
          tags={['RUN / CHANGE','Finančný ledger','Drill-down']}
          buttonLabel="Otvoriť IT náklady"
          icon="capacity"
          onOpen={()=>go('itCosts')}
        />
        <PortalCard
          className="portal-launch-assets portal-launch-utility"
          eyebrow="ASSET REGISTER"
          subtitle="Asset Intelligence"
          title="Asset Management · Asset 360"
          description="Asset 360, inventarizácia, lifecycle a Network Discovery v jednom registri."
          tags={['Asset 360','Network Discovery','Lifecycle']}
          buttonLabel="Otvoriť Asset management"
          icon="cmdb"
          onOpen={()=>go('cmdb')}
        />
      </section>
    </>}

    <section className="portal-launch-principles" aria-label="Princípy portálu">
      <div><span><Icon name="shield" size={19}/></span><p><strong>Oddelené kompetencie</strong><small>3.1 a 3.2 majú vlastné scope oprávnení.</small></p></div>
      <div><span><Icon name="database" size={19}/></span><p><strong>Spoločné dáta</strong><small>Služby, technológie, aktíva a náklady sú prepojené.</small></p></div>
      <div><span><Icon name="roadmap" size={19}/></span><p><strong>Jeden manažérsky obraz</strong><small>Spoločné moduly dávajú jednotný pohľad naprieč IT.</small></p></div>
    </section>
  </div>
}
