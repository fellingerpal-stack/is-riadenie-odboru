import type { EntityFinancialAllocation } from '../types'
import { supabase } from './supabase'

function rows(value: unknown): EntityFinancialAllocation[] {
  return Array.isArray(value) ? value as EntityFinancialAllocation[] : []
}

function friendly(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()
  if (lower.includes('entity_finance')) return new Error('Finančné mapovanie CVTI 360 ešte nie je pripravené v databáze. Spustite migráciu v0.56.2.')
  if (lower.includes('opravnen') || lower.includes('permission') || lower.includes('denied')) return new Error('Na zmenu finančného mapovania CVTI 360 nemáte oprávnenie.')
  return error instanceof Error ? error : new Error(message || 'Operácia finančného mapovania zlyhala.')
}

export async function loadEntityFinancialAllocations(): Promise<EntityFinancialAllocation[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.rpc('entity_finance_allocation_read')
    if (error) throw error
    return rows(data)
  } catch (error) {
    throw friendly(error)
  }
}

export async function saveEntityFinancialAllocation(item: EntityFinancialAllocation): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.rpc('entity_finance_allocation_upsert', { p_item: item })
    if (error) throw error
  } catch (error) {
    throw friendly(error)
  }
}

export async function deleteEntityFinancialAllocation(itemId: string): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.rpc('entity_finance_allocation_delete', { p_item_id: itemId })
    if (error) throw error
  } catch (error) {
    throw friendly(error)
  }
}
