import { useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Icon, Progress } from '../components/UI'
import {
  buildRaciIntelligence,
  intelligenceInitials,
  type AbsenceSimulation,
  type DepartmentHealth,
  type IntelligenceDepartmentCode,
} from '../lib/raciIntelligence'
import type { Employee, RaciItem, Substitution } from '../types'
import './RaciIntelligence.css'

type DepartmentFilter = 'both' | IntelligenceDepartmentCode

function scoreTone(score: number) {
  if (score >= 80) return 'success' as const
  if (score >= 60) return 'warning' as const
  return 'danger' as const
}

function riskTone(score: number) {
  if (score >= 60) return 'danger' as const
  if (score >= 30) return 'warning' as const
  return 'info' as const
}

function riskKindLabel(simulation: AbsenceSimulation) {
  if (simulation.riskKind === 'operational') return 'prevádzkový dopad'
  if (simulation.riskKind === 'governance') return 'governance dopad'
  return 'zmiešaný dopad'
}

function DepartmentHealthCard({ health }: { health: DepartmentHealth }) {
  const dimensions = [
    ['Integrita', health.integrity],
    ['Kontinuita', health.continuity],
    ['Vyváženie R', health.balance],
    ['Oddelenie R/A', health.separation],
    ['Aktívne zapojenie', health.participation],
  ] as const

  return <article className="raci-ai-health-card">
    <div className="raci-ai-health-head">
      <span className="raci-ai-dept-code">{health.code}</span>
      <div><small>{health.label}</small><strong>{health.health}/100</strong></div>
      <Badge tone={scoreTone(health.health)}>health score</Badge>
    </div>
    <div className="raci-ai-health-dimensions">
      {dimensions.map(([label, value]) => <div key={label}>
        <span><small>{label}</small><b>{value}%</b></span>
        <i><em style={{ width: `${value}%` }} /></i>
      </div>)}
    </div>
    <div className="raci-ai-health-foot">
      <span><b>{health.formalIssues}</b><small>formálne medzery</small></span>
      <span><b>{health.singleR}</b><small>jediný R</small></span>
      <span><b>{health.combinedAR}</b><small>spojené A/R</small></span>
      <span><b>{health.topRShare}%</b><small>top podiel R</small></span>
      <span><b>{health.busFactor50}</b><small>bus factor 50%</small></span>
    </div>
  </article>
}

export default function RaciIntelligence({
  orisItems,
  orisEmployees = [],
  substitutions = [],
}: {
  orisItems: RaciItem[]
  orisEmployees?: Employee[]
  substitutions?: Substitution[]
}) {
  const intelligence = useMemo(
    () => buildRaciIntelligence(orisItems, orisEmployees, substitutions),
    [orisItems, orisEmployees, substitutions],
  )
  const [department, setDepartment] = useState<DepartmentFilter>('both')
  const filteredSimulations = useMemo(
    () => intelligence.simulations.filter((simulation) => department === 'both' || simulation.person.department === department),
    [department, intelligence.simulations],
  )
  const [selectedPerson, setSelectedPerson] = useState('')
  const operationalSimulations = useMemo(
    () => [...filteredSimulations].sort((a, b) => b.operationalIndex - a.operationalIndex || b.totalIndex - a.totalIndex || b.impacted - a.impacted),
    [filteredSimulations],
  )
  const selectedSimulation = filteredSimulations.find((simulation) => simulation.person.key === selectedPerson)
    ?? operationalSimulations[0]
  const filteredPairs = intelligence.pairs.filter((pair) => department === 'both' || pair.department === department)
  const filteredDeputies = intelligence.deputies.filter((entry) => department === 'both' || entry.department === department)
  const filteredRecommendations = intelligence.recommendations.filter((entry) => department === 'both' || entry.department === 'both' || entry.department === department)
  const topOperational = [...filteredSimulations].sort((a, b) => b.operationalIndex - a.operationalIndex)[0]
  const highImpactPeople = filteredSimulations.filter((simulation) => simulation.operationalIndex >= 30 || simulation.governanceIndex >= 50).length

  function changeDepartment(next: DepartmentFilter) {
    setDepartment(next)
    setSelectedPerson('')
  }

  return <div className="raci-ai-view">
    <section className="raci-ai-hero">
      <div className="raci-ai-hero-main">
        <div className="raci-ai-eyebrow"><Icon name="decision" size={17}/> RACI Intelligence · vysvetliteľný analytický model</div>
        <h2>Čo z RACI nie je vidieť na prvý pohľad</h2>
        <p>{intelligence.executiveSignal}</p>
        <div className="raci-ai-hero-tags">
          <span><Icon name="shield" size={14}/> bez externého AI API</span>
          <span><Icon name="matrix" size={14}/> výpočet priamo z aktuálnej RACI</span>
          <span><Icon name="refresh" size={14}/> mení sa po každej úprave rolí</span>
        </div>
      </div>
      <div className="raci-ai-master-score">
        <span>Spoločný RACI health</span>
        <strong>{intelligence.combinedHealth}</strong>
        <small>/ 100</small>
        <Badge tone={scoreTone(intelligence.combinedHealth)}>3.1 + 3.2</Badge>
      </div>
    </section>

    <div className="raci-ai-filterbar">
      <div>
        <button className={department === 'both' ? 'active' : ''} onClick={() => changeDepartment('both')}>Oba odbory</button>
        <button className={department === '3.1' ? 'active' : ''} onClick={() => changeDepartment('3.1')}>3.1 · OIT</button>
        <button className={department === '3.2' ? 'active' : ''} onClick={() => changeDepartment('3.2')}>3.2 · ORIS</button>
      </div>
      <span><b>{highImpactPeople}</b> osôb s vyšším simulovaným dopadom</span>
    </div>

    <section className="raci-ai-health-grid">
      {intelligence.health.filter((health) => department === 'both' || health.code === department).map((health) => <DepartmentHealthCard health={health} key={health.code}/>)}
    </section>

    <section className="raci-ai-primary-grid">
      <article className="panel raci-ai-simulator">
        <div className="panel-heading">
          <div><span className="eyebrow">What-if simulácia</span><h3>Čo sa stane, ak konkrétny človek nie je dostupný?</h3></div>
          <Badge tone="purple">personálny stress test</Badge>
        </div>
        <label className="raci-ai-person-select">
          <span>Simulovať neprítomnosť</span>
          <select value={selectedSimulation?.person.key ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedPerson(event.target.value)}>
            {filteredSimulations.map((simulation) => <option value={simulation.person.key} key={`${simulation.person.department}-${simulation.person.key}`}>{simulation.person.department} · {simulation.person.name}</option>)}
          </select>
        </label>

        {selectedSimulation ? <>
          <div className="raci-ai-person-summary">
            <div className="avatar avatar-large">{intelligenceInitials(selectedSimulation.person)}</div>
            <div><small>Odbor {selectedSimulation.person.department} · {riskKindLabel(selectedSimulation)}</small><strong>{selectedSimulation.person.name}</strong><span>{selectedSimulation.person.area}</span></div>
            <Badge tone={riskTone(selectedSimulation.totalIndex)}>index {selectedSimulation.totalIndex}/100</Badge>
          </div>
          <div className="raci-ai-impact-kpis">
            <span><small>Zasiahnuté procesy</small><strong>{selectedSimulation.impacted}</strong><em>{selectedSimulation.impactedPercent}% matice</em></span>
            <span><small>Nové procesy bez R</small><strong>{selectedSimulation.newMissingR}</strong><em>priamy výpadok výkonu</em></span>
            <span><small>Nové procesy bez A</small><strong>{selectedSimulation.newMissingA}</strong><em>governance medzera</em></span>
            <span><small>Nový jediný R</small><strong>{selectedSimulation.newSingleR}</strong><em>sekundárne SPOF</em></span>
          </div>
          <div className="raci-ai-score-bars">
            <Progress value={selectedSimulation.operationalIndex} label="Prevádzkový index dopadu"/>
            <Progress value={selectedSimulation.governanceIndex} label="Governance index dopadu"/>
          </div>
          <div className="raci-ai-example-list">
            <h4>Príklady dotknutých procesov</h4>
            {selectedSimulation.examples.map((process) => <div key={`${process.department}-${process.id}`}>
              <span className={`raci-ai-criticality criticality-${process.criticality.toLowerCase().replace(/[^a-záäčďéíĺľňóôöŕšťúüýž]/gu, '-')}`}>{process.criticality}</span>
              <div><strong>{process.process}</strong><small>{process.area}</small></div>
            </div>)}
          </div>
        </> : null}
      </article>

      <article className="panel raci-ai-ranking-panel">
        <div className="panel-heading"><div><span className="eyebrow">Bus factor</span><h3>Najväčší dopad neprítomnosti</h3></div><Badge tone={topOperational?.operationalIndex ? 'warning' : 'success'}>podľa R a A</Badge></div>
        <div className="raci-ai-person-ranking">
          {operationalSimulations.slice(0, 9).map((simulation, index) => <button type="button" key={`${simulation.person.department}-${simulation.person.key}`} onClick={() => setSelectedPerson(simulation.person.key)}>
            <span className="raci-ai-rank">{index + 1}</span>
            <span className="avatar">{intelligenceInitials(simulation.person)}</span>
            <span className="raci-ai-rank-name"><strong>{simulation.person.name}</strong><small>{simulation.person.department} · {simulation.newMissingR}× bez R · {simulation.newMissingA}× bez A</small></span>
            <span className={`raci-ai-index index-${simulation.totalIndex >= 60 ? 'danger' : simulation.totalIndex >= 30 ? 'warning' : 'ok'}`}>{simulation.totalIndex}</span>
          </button>)}
        </div>
      </article>
    </section>

    <section className="raci-ai-secondary-grid">
      <article className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Koncentrácia väzieb</span><h3>Dvojice, cez ktoré prechádza najviac procesov</h3></div><Badge tone="info">A↔R + spoločné procesy</Badge></div>
        <div className="raci-ai-pairs">
          {filteredPairs.slice(0, 8).map((pair) => <div key={`${pair.department}-${pair.left.key}-${pair.right.key}`}>
            <span className="raci-ai-pair-avatars"><i>{intelligenceInitials(pair.left)}</i><i>{intelligenceInitials(pair.right)}</i></span>
            <span><strong>{pair.left.name} ↔ {pair.right.name}</strong><small>Odbor {pair.department} · {pair.sharedProcesses} spoločných procesov · {pair.directARLinks}× priame A↔R</small></span>
            <b>{pair.score}</b>
          </div>)}
        </div>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Zastupiteľnosť</span><h3>Najrizikovejší jediní vykonávatelia</h3></div><Badge tone="warning">návrh podľa dát</Badge></div>
        <div className="raci-ai-deputies">
          {filteredDeputies.slice(0, 8).map((entry) => <div key={`${entry.department}-${entry.owner.key}`}>
            <span className="avatar">{intelligenceInitials(entry.owner)}</span>
            <span><strong>{entry.owner.name}</strong><small>{entry.owner.uniqueR}× jediný R</small></span>
            <span className="raci-ai-deputy-arrow"><Icon name="arrow" size={16}/></span>
            <span className="raci-ai-deputy-candidate">
              <strong>{entry.registeredDeputy || entry.candidate?.name || 'Bez kandidáta'}</strong>
              <small>{entry.registeredDeputy ? 'evidovaný návrh zastupovania' : entry.candidate ? `${entry.evidenceProcesses} spoločných procesov · analytický kandidát` : 'potrebný cross-training'}</small>
            </span>
          </div>)}
        </div>
      </article>
    </section>

    <section className="panel raci-ai-actions-panel">
      <div className="panel-heading"><div><span className="eyebrow">AI-like odporúčania · vysvetliteľné pravidlá</span><h3>Najvyšší efekt na jeden manažérsky zásah</h3></div><Badge tone="purple">{filteredRecommendations.length} priorít</Badge></div>
      <div className="raci-ai-actions">
        {filteredRecommendations.map((recommendation, index) => <article className={`priority-${recommendation.priority}`} key={recommendation.id}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><small>{recommendation.department === 'both' ? 'Oba odbory' : `Odbor ${recommendation.department}`} · {recommendation.priority === 'critical' ? 'kritická priorita' : recommendation.priority === 'high' ? 'vysoká priorita' : 'stredná priorita'}</small><strong>{recommendation.title}</strong><p>{recommendation.text}</p><em><Icon name="arrow" size={13}/>{recommendation.impact}</em></div>
        </article>)}
      </div>
    </section>

    <section className="raci-ai-method-note">
      <Icon name="decision" size={20}/>
      <div><strong>Ako čítať tento pohľad</strong><p>Nejde o personálne hodnotenie ani meranie výkonu ľudí. Model analyzuje štruktúru RACI: unikátne R, chýbajúce A/R, koncentráciu rolí, spoločné väzby a simulovaný dopad odstránenia jednej osoby. OIT 3.1 zatiaľ nemá v zdrojovej RACI kritickosť jednotlivých procesov, preto sa kritickosť používa iba tam, kde ju zdrojové dáta poznajú. „Bus factor 50 %“ znamená počet ľudí, na ktorých sa sústreďuje polovica všetkých procesov s jediným R.</p></div>
    </section>
  </div>
}
