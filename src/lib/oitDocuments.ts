import { supabase } from './supabase'

export interface OitTopologyDocuments {
  topologyUrl: string
  oobUrl: string
  lamacskaTopologyUrl: string
  softwareCatalogUrl: string
  missing: string[]
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
  if (!supabase) throw new Error('Privátne topologické dokumenty sú dostupné iba v Supabase režime.')

  const definitions = [
    ['topologyUrl', 'topologia.png'],
    ['oobUrl', 'oob.png'],
    ['lamacskaTopologyUrl', 'topologia-la.png'],
    ['softwareCatalogUrl', 'sw-serverovna.png'],
  ] as const

  const results = await Promise.allSettled(definitions.map(([, path]) => signedUrl(path)))
  const documents: OitTopologyDocuments = {
    topologyUrl: '',
    oobUrl: '',
    lamacskaTopologyUrl: '',
    softwareCatalogUrl: '',
    missing: [],
  }

  results.forEach((result, index) => {
    const [key, path] = definitions[index]
    if (result.status === 'fulfilled') documents[key] = result.value
    else documents.missing.push(path)
  })

  return documents
}
