import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { RaciCode, RaciItem } from '../types'
import { Badge, Empty, Icon, Modal, PageHeader } from '../components/UI'
import './Raci.css'

const codes: RaciCode[] = ['', 'R', 'A', 'C', 'I', 'R/A']

const PROCESS_COLUMN_WIDTH = 330
const CONTROL_COLUMN_WIDTH = 96
const PARTICIPANT_COLUMN_WIDTH = 108
const SETTINGS_KEY = 'cvti-raci-insight-settings-v1'
const externalParticipants = new Set([
  'Vecný garant / MŠVVaM',
  'Iné útvary CVTI SR',
  'Dodávateľ / partner',
])

type ViewMode = 'overview' | 'matrix' | 'rules'
type InsightTone = 'danger' | 'warning' | 'info'

interface InsightSettings {
  ownerLimitPercent: number
  includeHigh: boolean
  requireInformedForCritical: boolean
  flagCombinedRA: boolean
}

interface InsightIssue {
  key: string
  label: string
  description: string
  recommendation: string
  weight: number
  tone: InsightTone
}

interface ProcessInsight {
  item: RaciItem
  issues: InsightIssue[]
  score: number
  owners: string[]
  responsible: string[]
}

const defaultInsightSettings: InsightSettings = {
  ownerLimitPercent: 25,
  includeHigh: true,
  requireInformedForCritical: true,
  flagCombinedRA: true,
}

const shortNames: Record<string, string> = {
  'Pavol Horváth': 'P. Horváth',
  'Peter Modrák': 'P. Modrák',
  'Ladislav Turányi': 'L. Turányi',
  'Miroslav Kozel': 'M. Kozel',
  'Martin Vozák': 'M. Vozák',
  'Csongor Mészáros': 'C. Mészáros',
  'Martin Korének': 'M. Korének',
  'Roman Vápeník': 'R. Vápeník',
  'Dávid Cymbalák': 'D. Cymbalák',
  'Lukáš Visokai': 'L. Visokai',
  'Michelle Kožuchová Bajema': 'M. Kožuchová',
  'Vecný garant / MŠVVaM': 'Vecný garant',
  'Iné útvary CVTI SR': 'Iné útvary',
  'Dodávateľ / partner': 'Dodávateľ',
}

function initials(name: string) {
  const clean = name.replace(/\/.*/, '').trim()
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function participantParts(name: string) {
  const compact = shortNames[name] || name
  const parts = compact.trim().split(/\s+/)
  const first = parts[0] || ''

  if (/^[A-ZÁÄČĎÉÍĹĽŇÓÔÖŔŠŤÚÜÝŽ]\.$/u.test(first) && parts.length > 1) {
    return {
      prefix: first,
      label: parts.slice(1).join(' '),
    }
  }

  return {
    prefix: '',
    label: compact,
  }
}

function assignedTo(item: RaciItem, accepted: string[]) {
  return Object.entries(item.assignments)
    .filter(([, value]) => accepted.includes(String(value)))
    .map(([participant]) => participant)
}

function validation(item: RaciItem) {
  const values = Object.values(item.assignments)
  const accountable = values.filter((value) => value === 'A' || value === 'R/A').length
  const responsible = values.filter((value) => value === 'R' || value === 'R/A').length

  if (accountable === 0) return { text: 'Chýba A', tone: 'danger' as const }
  if (accountable > 1) return { text: 'Viac A', tone: 'danger' as const }
  if (responsible === 0) return { text: 'Chýba R', tone: 'warning' as const }
  return { text: 'OK', tone: 'success' as const }
}

function criticalityWeight(criticality: string) {
  if (criticality === 'Kritická') return 4
  if (criticality === 'Vysoká') return 3
  if (criticality === 'Stredná') return 2
  return 1
}

function loadInsightSettings(): InsightSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultInsightSettings
    const parsed = JSON.parse(raw) as Partial<InsightSettings>
    return {
      ownerLimitPercent:
        typeof parsed.ownerLimitPercent === 'number'
          ? Math.min(50, Math.max(15, parsed.ownerLimitPercent))
          : defaultInsightSettings.ownerLimitPercent,
      includeHigh:
        typeof parsed.includeHigh === 'boolean'
          ? parsed.includeHigh
          : defaultInsightSettings.includeHigh,
      requireInformedForCritical:
        typeof parsed.requireInformedForCritical === 'boolean'
          ? parsed.requireInformedForCritical
          : defaultInsightSettings.requireInformedForCritical,
      flagCombinedRA:
        typeof parsed.flagCombinedRA === 'boolean'
          ? parsed.flagCombinedRA
          : defaultInsightSettings.flagCombinedRA,
    }
  } catch {
    return defaultInsightSettings
  }
}

function processInsight(item: RaciItem, settings: InsightSettings): ProcessInsight | null {
  const owners = assignedTo(item, ['A', 'R/A'])
  const responsible = assignedTo(item, ['R', 'R/A'])
  const informed = assignedTo(item, ['I'])
  const combined = assignedTo(item, ['R/A'])
  const isPriority =
    item.criticality === 'Kritická' ||
    (settings.includeHigh && item.criticality === 'Vysoká')
  const issues: InsightIssue[] = []

  if (owners.length === 0) {
    issues.push({
      key: 'missing-a',
      label: 'Chýba vlastník A',
      description: 'Proces nemá určenú osobu s konečnou zodpovednosťou.',
      recommendation: 'Určiť jedného vlastníka A a potvrdiť jeho mandát.',
      weight: 7,
      tone: 'danger',
    })
  } else if (owners.length > 1) {
    issues.push({
      key: 'multi-a',
      label: 'Viac vlastníkov A',
      description: 'Rozhodovacia zodpovednosť je rozdelená medzi viacerých vlastníkov.',
      recommendation: 'Ponechať presne jedného A, ostatných presunúť do C alebo I.',
      weight: 7,
      tone: 'danger',
    })
  }

  if (responsible.length === 0) {
    issues.push({
      key: 'missing-r',
      label: 'Chýba vykonávateľ R',
      description: 'Nie je určená osoba, ktorá proces reálne vykonáva.',
      recommendation: 'Priradiť minimálne jedného vykonávateľa R.',
      weight: 6,
      tone: 'danger',
    })
  }

  if (settings.flagCombinedRA && isPriority && combined.length > 0) {
    issues.push({
      key: 'combined-ra',
      label: 'Spojené R/A',
      description: 'Výkon aj konečná zodpovednosť sú pri prioritnom procese na jednej osobe.',
      recommendation: 'Preveriť oddelenie výkonu R a vlastníctva A alebo doplniť zastupiteľnosť.',
      weight: 3,
      tone: item.criticality === 'Kritická' ? 'warning' : 'info',
    })
  }

  if (
    settings.requireInformedForCritical &&
    item.criticality === 'Kritická' &&
    informed.length === 0
  ) {
    issues.push({
      key: 'missing-i',
      label: 'Bez informovaného I',
      description: 'Kritický proces nemá definovanú komunikačnú alebo informačnú stopu.',
      recommendation: 'Doplniť rolu I pre vedenie, dotknutý útvar alebo prevádzkového partnera.',
      weight: 2,
      tone: 'info',
    })
  }

  if (owners.some((owner) => externalParticipants.has(owner))) {
    issues.push({
      key: 'external-a',
      label: 'Externý vlastník A',
      description: 'Konečná zodpovednosť je mimo odboru alebo organizácie.',
      recommendation: 'Potvrdiť eskalačný mechanizmus, SLA a interného koordinátora.',
      weight: 4,
      tone: 'warning',
    })
  }

  if (issues.length === 0) return null

  return {
    item,
    issues,
    score: criticalityWeight(item.criticality) + issues.reduce((sum, issue) => sum + issue.weight, 0),
    owners,
    responsible,
  }
}

function insightTone(score: number): InsightTone {
  if (score >= 10) return 'danger'
  if (score >= 7) return 'warning'
  return 'info'
}

export default function Raci({
  items,
  canEdit,
  onChange,
}: {
  items: RaciItem[]
  canEdit: boolean
  onChange: (items: RaciItem[]) => void
}) {
  const participants = Object.keys(items[0]?.assignments || {})
  const [view, setView] = useState<ViewMode>('overview')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('Všetky')
  const [criticality, setCriticality] = useState('Všetky')
  const [selected, setSelected] = useState<RaciItem | null>(null)
  const [insightSettings, setInsightSettings] = useState<InsightSettings>(loadInsightSettings)
  const tableWidth =
    PROCESS_COLUMN_WIDTH +
    CONTROL_COLUMN_WIDTH +
    participants.length * PARTICIPANT_COLUMN_WIDTH

  const areas = ['Všetky', ...Array.from(new Set(items.map((item) => item.area))).sort()]
  const hasActiveFilters = search.length > 0 || area !== 'Všetky' || criticality !== 'Všetky'

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (area === 'Všetky' || item.area === area) &&
          (criticality === 'Všetky' || item.criticality === criticality) &&
          `${item.id} ${item.area} ${item.process} ${item.output}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [items, area, criticality, search],
  )

  const insights = useMemo(
    () =>
      items
        .map((item) => processInsight(item, insightSettings))
        .filter((item): item is ProcessInsight => item !== null)
        .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id)),
    [items, insightSettings],
  )

  const metrics = useMemo(() => {
    const formalIssueItems = items.filter((item) => validation(item).text !== 'OK')
    const priorityItems = items.filter(
      (item) =>
        item.criticality === 'Kritická' ||
        (insightSettings.includeHigh && item.criticality === 'Vysoká'),
    )
    const combinedItems = items.filter(
      (item) =>
        (item.criticality === 'Kritická' ||
          (insightSettings.includeHigh && item.criticality === 'Vysoká')) &&
        Object.values(item.assignments).some((value) => value === 'R/A'),
    )
    const uninformedCritical = items.filter(
      (item) =>
        item.criticality === 'Kritická' &&
        !Object.values(item.assignments).some((value) => value === 'I'),
    )
    const externalOwnerItems = items.filter((item) =>
      assignedTo(item, ['A', 'R/A']).some((owner) => externalParticipants.has(owner)),
    )

    const ownerMap = new Map<string, { owner: string; accountable: number; responsible: number }>()
    participants.forEach((participant) =>
      ownerMap.set(participant, { owner: participant, accountable: 0, responsible: 0 }),
    )
    items.forEach((item) => {
      Object.entries(item.assignments).forEach(([participant, code]) => {
        const current = ownerMap.get(participant) ?? {
          owner: participant,
          accountable: 0,
          responsible: 0,
        }
        if (code === 'A' || code === 'R/A') current.accountable += 1
        if (code === 'R' || code === 'R/A') current.responsible += 1
        ownerMap.set(participant, current)
      })
    })

    const ownerLoad = Array.from(ownerMap.values())
      .filter((entry) => entry.accountable > 0 || entry.responsible > 0)
      .map((entry) => ({
        ...entry,
        accountablePercent: items.length ? Math.round((entry.accountable / items.length) * 100) : 0,
      }))
      .sort((a, b) => b.accountable - a.accountable || b.responsible - a.responsible)

    const concentratedOwners = ownerLoad.filter(
      (entry) => entry.accountablePercent >= insightSettings.ownerLimitPercent,
    )
    const formalIssueCount = formalIssueItems.length
    const penalty =
      formalIssueCount * 12 +
      (insightSettings.flagCombinedRA ? combinedItems.length * 2 : 0) +
      (insightSettings.requireInformedForCritical ? uninformedCritical.length : 0) +
      externalOwnerItems.length * 3 +
      concentratedOwners.length * 2
    const readiness = Math.max(0, Math.min(100, 100 - penalty))

    return {
      formalIssueItems,
      priorityItems,
      combinedItems,
      uninformedCritical,
      externalOwnerItems,
      ownerLoad,
      concentratedOwners,
      readiness,
    }
  }, [items, participants, insightSettings])

  const actionRecommendations = useMemo(() => {
    const actions = [
      metrics.formalIssueItems.length
        ? {
            count: metrics.formalIssueItems.length,
            title: 'Uzavrieť formálne medzery',
            text: 'Proces musí mať presne jedného A a minimálne jedného R.',
            tone: 'danger' as InsightTone,
          }
        : null,
      insightSettings.flagCombinedRA && metrics.combinedItems.length
        ? {
            count: metrics.combinedItems.length,
            title: 'Preveriť spojené R/A',
            text: 'Pri prioritných procesoch oddeliť výkon od konečnej zodpovednosti alebo doplniť zastupiteľnosť.',
            tone: 'warning' as InsightTone,
          }
        : null,
      insightSettings.requireInformedForCritical && metrics.uninformedCritical.length
        ? {
            count: metrics.uninformedCritical.length,
            title: 'Doplniť informačnú stopu',
            text: 'Kritické procesy bez I potrebujú jasne určené informovanie a eskaláciu.',
            tone: 'info' as InsightTone,
          }
        : null,
      metrics.externalOwnerItems.length
        ? {
            count: metrics.externalOwnerItems.length,
            title: 'Potvrdiť externé vlastníctvo',
            text: 'Doplniť interného koordinátora, SLA a eskalačný kontakt.',
            tone: 'warning' as InsightTone,
          }
        : null,
      metrics.concentratedOwners.length
        ? {
            count: metrics.concentratedOwners.length,
            title: 'Znížiť koncentráciu vlastníctva',
            text: `Vlastníci nad ${insightSettings.ownerLimitPercent} % procesov predstavujú riadiacu závislosť.`,
            tone: 'warning' as InsightTone,
          }
        : null,
    ]

    return actions.filter((action): action is NonNullable<typeof action> => action !== null).slice(0, 4)
  }, [metrics, insightSettings])

  function cycle(itemId: string, participant: string) {
    if (!canEdit) return

    onChange(
      items.map((item) => {
        if (item.id !== itemId) return item

        const current = (item.assignments[participant] || '') as RaciCode
        const next = codes[(codes.indexOf(current) + 1) % codes.length]

        return {
          ...item,
          assignments: {
            ...item.assignments,
            [participant]: next,
          },
        }
      }),
    )
  }

  function clearFilters() {
    setSearch('')
    setArea('Všetky')
    setCriticality('Všetky')
  }

  function updateInsightSettings(patch: Partial<InsightSettings>) {
    const next = { ...insightSettings, ...patch }
    setInsightSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  }

  function resetInsightSettings() {
    setInsightSettings(defaultInsightSettings)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultInsightSettings))
  }

  return (
    <div className="raci-page">
      <PageHeader
        eyebrow="Governance"
        title="RACI matica"
        description="Matica zodpovedností doplnená o manažérsky pohľad na formálne medzery, koncentráciu vlastníctva, komunikačné riziká a externé závislosti."
      />

      <div className="raci-view-tabs" role="tablist" aria-label="Pohľady RACI">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'overview'}
          className={view === 'overview' ? 'active' : ''}
          onClick={() => setView('overview')}
        >
          <Icon name="dashboard" size={18} />
          Manažérsky pohľad
          <span>{insights.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'matrix'}
          className={view === 'matrix' ? 'active' : ''}
          onClick={() => setView('matrix')}
        >
          <Icon name="matrix" size={18} />
          RACI matica
          <span>{items.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'rules'}
          className={view === 'rules' ? 'active' : ''}
          onClick={() => setView('rules')}
        >
          <Icon name="shield" size={18} />
          Pravidlá hodnotenia
        </button>
      </div>

      {view === 'overview' ? (
        <div className="raci-insight-view">
          <section className="raci-insight-hero">
            <div>
              <div className="raci-insight-eyebrow">Riadiaci signál</div>
              <h2>
                {metrics.formalIssueItems.length === 0
                  ? 'Matica je formálne úplná, no zostávajú riadiace riziká.'
                  : `${metrics.formalIssueItems.length} procesov má formálnu medzeru v R alebo A.`}
              </h2>
              <p>
                Hodnotenie zvýrazňuje najmä spojené roly R/A, chýbajúce informovanie pri kritických procesoch,
                externé vlastníctvo a vysokú koncentráciu zodpovednosti na jednotlivcoch.
              </p>
            </div>
            <div className={`raci-readiness readiness-${metrics.readiness >= 75 ? 'good' : metrics.readiness >= 55 ? 'watch' : 'risk'}`}>
              <span>Orientačná pripravenosť</span>
              <strong>{metrics.readiness}%</strong>
              <small>podľa aktívnych pravidiel</small>
            </div>
          </section>

          <div className="raci-insight-kpis">
            <article>
              <span className="raci-kpi-icon tone-success"><Icon name="check" size={20} /></span>
              <div><small>Formálne úplné</small><strong>{items.length - metrics.formalIssueItems.length}/{items.length}</strong><p>presne jeden A a minimálne jeden R</p></div>
            </article>
            <article>
              <span className="raci-kpi-icon tone-danger"><Icon name="warning" size={20} /></span>
              <div><small>Prioritné procesy</small><strong>{metrics.priorityItems.length}</strong><p>kritické{insightSettings.includeHigh ? ' a vysoké' : ''}</p></div>
            </article>
            <article>
              <span className="raci-kpi-icon tone-warning"><Icon name="people" size={20} /></span>
              <div><small>Spojené R/A</small><strong>{metrics.combinedItems.length}</strong><p>výkon a vlastníctvo na jednej osobe</p></div>
            </article>
            <article>
              <span className="raci-kpi-icon tone-info"><Icon name="decision" size={20} /></span>
              <div><small>Kritické bez I</small><strong>{metrics.uninformedCritical.length}</strong><p>chýba informačná alebo eskalačná stopa</p></div>
            </article>
            <article>
              <span className="raci-kpi-icon tone-purple"><Icon name="services" size={20} /></span>
              <div><small>Externý vlastník</small><strong>{metrics.externalOwnerItems.length}</strong><p>A je mimo odboru alebo organizácie</p></div>
            </article>
          </div>

          <div className="raci-insight-layout">
            <section className="raci-insight-panel raci-risk-panel">
              <div className="raci-panel-heading">
                <div>
                  <span>Priorita preverenia</span>
                  <h3>Procesy s najsilnejším riadiacim signálom</h3>
                </div>
                <Badge tone={insights.length ? 'warning' : 'success'}>{insights.length} procesov</Badge>
              </div>

              {insights.length === 0 ? (
                <div className="raci-all-good">
                  <Icon name="check" size={28} />
                  <strong>Bez identifikovaných medzier</strong>
                  <p>Aktívne pravidlá nenašli proces vyžadujúci preverenie.</p>
                </div>
              ) : (
                <div className="raci-risk-list">
                  {insights.slice(0, 10).map((insight) => {
                    const tone = insightTone(insight.score)
                    return (
                      <button
                        type="button"
                        key={insight.item.id}
                        className={`raci-risk-item risk-${tone}`}
                        onClick={() => setSelected(insight.item)}
                      >
                        <span className="raci-risk-rank">{insight.score}</span>
                        <span className="raci-risk-main">
                          <span className="raci-risk-meta">
                            {insight.item.id} · {insight.item.area}
                            <em className={`criticality-${insight.item.criticality.toLowerCase()}`}>{insight.item.criticality}</em>
                          </span>
                          <strong>{insight.item.process}</strong>
                          <span className="raci-risk-tags">
                            {insight.issues.map((issue) => (
                              <em key={issue.key} className={`issue-${issue.tone}`}>{issue.label}</em>
                            ))}
                          </span>
                          <small>
                            A: {insight.owners.join(', ') || 'neurčený'} · R: {insight.responsible.join(', ') || 'neurčený'}
                          </small>
                        </span>
                        <Icon name="chevron" size={18} />
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <div className="raci-insight-side">
              <section className="raci-insight-panel">
                <div className="raci-panel-heading compact">
                  <div>
                    <span>Koncentrácia</span>
                    <h3>Vlastníctvo procesov A</h3>
                  </div>
                  <Badge tone={metrics.concentratedOwners.length ? 'warning' : 'success'}>
                    limit {insightSettings.ownerLimitPercent}%
                  </Badge>
                </div>
                <div className="raci-owner-load">
                  {metrics.ownerLoad.slice(0, 7).map((entry) => (
                    <div key={entry.owner} className={entry.accountablePercent >= insightSettings.ownerLimitPercent ? 'over-limit' : ''}>
                      <span className="raci-owner-avatar">{initials(entry.owner)}</span>
                      <span className="raci-owner-data">
                        <span><strong>{shortNames[entry.owner] || entry.owner}</strong><em>{entry.accountablePercent}%</em></span>
                        <span className="raci-owner-bar"><i style={{ width: `${Math.min(100, entry.accountablePercent)}%` }} /></span>
                        <small>{entry.accountable}× A · {entry.responsible}× R</small>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="raci-insight-panel">
                <div className="raci-panel-heading compact">
                  <div>
                    <span>Odporúčané kroky</span>
                    <h3>Čo riešiť ako prvé</h3>
                  </div>
                </div>
                <div className="raci-action-list">
                  {actionRecommendations.length ? actionRecommendations.map((action) => (
                    <article key={action.title} className={`action-${action.tone}`}>
                      <strong>{action.count}</strong>
                      <div><h4>{action.title}</h4><p>{action.text}</p></div>
                    </article>
                  )) : (
                    <div className="raci-all-good small"><Icon name="check" size={22} /><strong>Bez otvorených krokov</strong></div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {view === 'rules' ? (
        <div className="raci-rules-view">
          <section className="raci-rules-settings">
            <div className="raci-panel-heading">
              <div>
                <span>Nastavenie pohľadu</span>
                <h3>Pravidlá manažérskeho hodnotenia</h3>
                <p>Zmeny sa ukladajú iba pre tento prehliadač a nemenia samotnú RACI maticu.</p>
              </div>
              <button type="button" className="button button-secondary" onClick={resetInsightSettings}>
                <Icon name="refresh" size={16} /> Obnoviť predvolené
              </button>
            </div>

            <div className="raci-settings-grid">
              <label className="raci-range-setting">
                <span><strong>Limit koncentrácie vlastníctva</strong><em>{insightSettings.ownerLimitPercent}%</em></span>
                <input
                  type="range"
                  min="15"
                  max="50"
                  step="5"
                  value={insightSettings.ownerLimitPercent}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateInsightSettings({ ownerLimitPercent: Number(event.target.value) })}
                />
                <small>Vlastník s podielom A nad limitom sa zobrazí ako riadiaca závislosť.</small>
              </label>

              <label className="raci-switch-setting">
                <input
                  type="checkbox"
                  checked={insightSettings.includeHigh}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateInsightSettings({ includeHigh: event.target.checked })}
                />
                <span><strong>Zahrnúť vysokú kritickosť</strong><small>Prioritné hodnotenie použije kritické aj vysoké procesy.</small></span>
              </label>

              <label className="raci-switch-setting">
                <input
                  type="checkbox"
                  checked={insightSettings.flagCombinedRA}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateInsightSettings({ flagCombinedRA: event.target.checked })}
                />
                <span><strong>Upozorniť na spojené R/A</strong><small>Zvýrazní výkon a konečnú zodpovednosť na jednej osobe.</small></span>
              </label>

              <label className="raci-switch-setting">
                <input
                  type="checkbox"
                  checked={insightSettings.requireInformedForCritical}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateInsightSettings({ requireInformedForCritical: event.target.checked })}
                />
                <span><strong>Vyžadovať I pri kritických procesoch</strong><small>Kontroluje existenciu informačnej alebo eskalačnej stopy.</small></span>
              </label>
            </div>
          </section>

          <div className="raci-rule-cards">
            <article className="rule-danger"><span>01</span><div><h3>Formálna integrita</h3><p>Každý proces musí mať presne jedného vlastníka A a aspoň jedného vykonávateľa R.</p></div></article>
            <article className="rule-warning"><span>02</span><div><h3>Oddelenie zodpovednosti</h3><p>Spojené R/A nie je automaticky chyba, ale pri prioritnom procese vyžaduje vedomé potvrdenie a zastupiteľnosť.</p></div></article>
            <article className="rule-info"><span>03</span><div><h3>Komunikácia kritického procesu</h3><p>Kritický proces bez I nemá jasne určeného príjemcu informácií pri zmene, výpadku alebo eskalácii.</p></div></article>
            <article className="rule-purple"><span>04</span><div><h3>Externá závislosť</h3><p>Externý A vyžaduje interného koordinátora, dohodnuté SLA a jednoznačný eskalačný mechanizmus.</p></div></article>
            <article className="rule-neutral"><span>05</span><div><h3>Koncentrácia vlastníctva</h3><p>Vysoký podiel procesov A na jednej osobe signalizuje rozhodovaciu závislosť a potrebu delegovania alebo zástupcu.</p></div></article>
          </div>
        </div>
      ) : null}

      {view === 'matrix' ? (
        <div className="raci-matrix-view">
          <div className="raci-legend" aria-label="Vysvetlenie RACI rolí">
            <div className="raci-legend-item">
              <span className="raci-code code-r">R</span>
              <span><strong>Vykonávateľ</strong><small>vykonáva a realizuje činnosť</small></span>
            </div>
            <div className="raci-legend-item">
              <span className="raci-code code-a">A</span>
              <span><strong>Vlastník</strong><small>nesie konečnú zodpovednosť</small></span>
            </div>
            <div className="raci-legend-item">
              <span className="raci-code code-c">C</span>
              <span><strong>Konzultovaný</strong><small>poskytuje odborný vstup</small></span>
            </div>
            <div className="raci-legend-item">
              <span className="raci-code code-i">I</span>
              <span><strong>Informovaný</strong><small>dostáva potrebné informácie</small></span>
            </div>
          </div>

          <div className="toolbar raci-toolbar">
            <label className="raci-search-field">
              <span>Vyhľadávanie</span>
              <div className="search-box">
                <Icon name="search" size={18} />
                <input
                  value={search}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                  placeholder="Proces, služba, výstup alebo kód…"
                />
              </div>
            </label>

            <label className="raci-filter-field">
              <span>Oblasť</span>
              <select value={area} onChange={(event: ChangeEvent<HTMLSelectElement>) => setArea(event.target.value)}>
                {areas.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="raci-filter-field">
              <span>Kritickosť</span>
              <select
                value={criticality}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setCriticality(event.target.value)}
              >
                <option>Všetky</option>
                <option>Kritická</option>
                <option>Vysoká</option>
                <option>Stredná</option>
                <option>Nízka</option>
              </select>
            </label>

            <div className="raci-toolbar-summary">
              <Badge tone="info">{filtered.length} procesov</Badge>
              {hasActiveFilters ? (
                <button type="button" className="raci-clear-button" onClick={clearFilters}>
                  Zrušiť filtre
                </button>
              ) : null}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Empty title="Žiadny proces" text="Zmeň filtre alebo vyhľadávanie." />
          ) : (
            <div className="table-shell raci-shell">
              <table
                className="data-table raci-table"
                style={{ width: tableWidth, minWidth: tableWidth }}
              >
                <colgroup>
                  <col className="raci-col-process" />
                  <col className="raci-col-control" />
                  {participants.map((participant) => (
                    <col className="raci-col-person" key={`col-${participant}`} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky-col sticky-1 raci-process-head">
                      <strong>Proces / služba</strong>
                      <small>Kliknutím otvoríte detail</small>
                    </th>
                    <th className="sticky-col sticky-2 raci-control-head">
                      <strong>Kontrola</strong>
                      <small>Validácia R/A</small>
                    </th>
                    {participants.map((participant) => {
                      const parts = participantParts(participant)

                      return (
                        <th className="raci-person-column" key={participant} title={participant}>
                          <div className="raci-person-head">
                            <span className="raci-person-avatar">{initials(participant)}</span>
                            <span className="raci-person-label">
                              {parts.prefix ? (
                                <span className="raci-person-prefix">{parts.prefix}</span>
                              ) : null}
                              <strong className="raci-person-name">{parts.label}</strong>
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const check = validation(item)

                    return (
                      <tr key={item.id}>
                        <td className="sticky-col sticky-1 process-cell">
                          <button type="button" onClick={() => setSelected(item)}>
                            <span>{item.id} · {item.area}</span>
                            <strong>{item.process}</strong>
                            <small className={`criticality-${item.criticality.toLowerCase()}`}>
                              {item.criticality}
                            </small>
                          </button>
                        </td>
                        <td className="sticky-col sticky-2 raci-control-cell">
                          <Badge tone={check.tone}>{check.text}</Badge>
                        </td>
                        {participants.map((participant) => {
                          const code = item.assignments[participant] || ''

                          return (
                            <td key={participant}>
                              <button
                                type="button"
                                disabled={!canEdit}
                                className={`raci-cell ${
                                  code ? `code-${code.toLowerCase().replace('/', '')}` : ''
                                }`}
                                onClick={() => cycle(item.id, participant)}
                                title={`${participant}: ${code || 'bez priradenia'}`}
                              >
                                {code || '·'}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {selected ? (
        <Modal
          title={`${selected.id} · ${selected.process}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="detail-grid">
            <section>
              <h4>Oblasť</h4>
              <p>{selected.area}</p>
            </section>
            <section>
              <h4>Kritickosť</h4>
              <p>{selected.criticality}</p>
            </section>
            <section className="full">
              <h4>Hlavný výstup</h4>
              <p>{selected.output}</p>
            </section>
            <section className="full">
              <h4>Poznámka / čo potvrdiť</h4>
              <p>{selected.note || 'Bez poznámky'}</p>
            </section>
          </div>

          {processInsight(selected, insightSettings) ? (
            <>
              <h4 className="section-title">Manažérske signály</h4>
              <div className="raci-modal-insights">
                {processInsight(selected, insightSettings)?.issues.map((issue) => (
                  <article key={issue.key} className={`issue-${issue.tone}`}>
                    <Icon name={issue.tone === 'danger' ? 'warning' : issue.tone === 'warning' ? 'risk' : 'decision'} size={18} />
                    <div><strong>{issue.label}</strong><p>{issue.description}</p><small>{issue.recommendation}</small></div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          <h4 className="section-title">Priradenia</h4>
          <div className="assignment-list">
            {participants
              .filter((participant) => selected.assignments[participant])
              .map((participant) => (
                <div key={participant}>
                  <span
                    className={`raci-code code-${String(
                      selected.assignments[participant],
                    )
                      .toLowerCase()
                      .replace('/', '')}`}
                  >
                    {selected.assignments[participant]}
                  </span>
                  <strong>{participant}</strong>
                </div>
              ))}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
