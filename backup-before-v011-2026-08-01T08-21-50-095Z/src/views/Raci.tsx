import { useMemo, useState } from 'react'
import type { RaciCode, RaciItem } from '../types'
import { Badge, Empty, Icon, Modal, PageHeader } from '../components/UI'
import './Raci.css'

const codes: RaciCode[] = ['', 'R', 'A', 'C', 'I', 'R/A']

const PROCESS_COLUMN_WIDTH = 330
const CONTROL_COLUMN_WIDTH = 96
const PARTICIPANT_COLUMN_WIDTH = 108

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

function validation(item: RaciItem) {
  const values = Object.values(item.assignments)
  const accountable = values.filter((value) => value === 'A' || value === 'R/A').length
  const responsible = values.filter((value) => value === 'R' || value === 'R/A').length

  if (accountable === 0) return { text: 'Chýba A', tone: 'danger' as const }
  if (accountable > 1) return { text: 'Viac A', tone: 'danger' as const }
  if (responsible === 0) return { text: 'Chýba R', tone: 'warning' as const }
  return { text: 'OK', tone: 'success' as const }
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
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('Všetky')
  const [criticality, setCriticality] = useState('Všetky')
  const [selected, setSelected] = useState<RaciItem | null>(null)
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

  return (
    <div className="raci-page">
      <PageHeader
        eyebrow="Governance"
        title="RACI matica"
        description="Pri každom procese určte jedného vlastníka A a aspoň jedného vykonávateľa R. C poskytuje odborný vstup a I dostáva potrebné informácie."
      />

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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Proces, služba, výstup alebo kód…"
            />
          </div>
        </label>

        <label className="raci-filter-field">
          <span>Oblasť</span>
          <select value={area} onChange={(event) => setArea(event.target.value)}>
            {areas.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="raci-filter-field">
          <span>Kritickosť</span>
          <select
            value={criticality}
            onChange={(event) => setCriticality(event.target.value)}
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
