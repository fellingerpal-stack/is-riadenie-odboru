import { supabase } from './supabase'

export interface OitTopologyDocuments {
  topologyUrl: string
  oobUrl: string
}

const BUCKET = 'oit-documents'
const SIGNED_URL_TTL_SECONDS = 15 * 60

async function signedUrl(path: string): Promise<string> {
  if (!supabase) throw new Error('Privátne topologické dokumenty sú dostupné iba v Supabase režime.')
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  if (!data?.signedUrl) throw new Error(`Dokument ${path} sa nepodarilo načítať.`)
  return data.signedUrl
}

export async function loadOitTopologyDocuments(): Promise<OitTopologyDocuments> {
  const [topologyUrl, oobUrl] = await Promise.all([
    signedUrl('topologia.png'),
    signedUrl('oob.png'),
  ])
  return { topologyUrl, oobUrl }
}
