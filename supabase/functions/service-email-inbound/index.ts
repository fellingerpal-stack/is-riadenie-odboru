// IS Riadenie odboru v0.46.0 - inbound e-mail -> ServiceDesk ticket
// Provider-neutral webhook. Mail gateway posts JSON to this Edge Function.
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SERVICEDESK_INBOUND_SECRET.

type IncomingAttachment = { name?: string; filename?: string; contentType?: string; type?: string; size?: number; base64?: string; data?: string; dataUrl?: string }
type IncomingPayload = {
  messageId?: string; message_id?: string; id?: string
  from?: string; sender?: string; fromName?: string; from_name?: string
  to?: string; recipient?: string
  subject?: string; text?: string; plain?: string; html?: string
  attachments?: IncomingAttachment[]
}

const jsonHeaders = { 'Content-Type': 'application/json' }

function emailOf(value: string): string {
  const text = String(value || '').trim().toLowerCase()
  const angle = text.match(/<([^<>\s]+@[^<>\s]+)>/)
  if (angle?.[1]) return angle[1]
  const match = text.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return match?.[0]?.toLowerCase() || ''
}

function senderName(raw: string, explicit: string): string {
  if (explicit.trim()) return explicit.trim().slice(0, 200)
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*</)
  return match?.[1]?.trim().slice(0, 200) || ''
}

function plainText(payload: IncomingPayload): string {
  const direct = String(payload.text || payload.plain || '').trim()
  if (direct) return direct.slice(0, 12000)
  const html = String(payload.html || '')
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()
    .slice(0, 12000)
}

function normalizeAttachments(items: IncomingAttachment[] | undefined) {
  return (Array.isArray(items) ? items : []).slice(0, 5).flatMap((item, index) => {
    const name = String(item.name || item.filename || `email-${index + 1}`).slice(0, 180)
    const type = String(item.contentType || item.type || 'application/octet-stream').slice(0, 120)
    const raw = String(item.base64 || item.data || '').replace(/^data:[^;]+;base64,/, '')
    const providedUrl = String(item.dataUrl || '')
    const estimated = Number(item.size || (raw ? Math.floor(raw.length * 0.75) : 0))
    if (estimated > 768000) return []
    const dataUrl = providedUrl || (raw ? `data:${type};base64,${raw}` : '')
    return [{ id: crypto.randomUUID(), name, type, size: estimated, dataUrl, uploadedBy: 'E-mail', createdAt: new Date().toISOString() }]
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers: jsonHeaders })
  const secret = Deno.env.get('SERVICEDESK_INBOUND_SECRET') || ''
  if (!secret || request.headers.get('x-servicedesk-inbound-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized inbound webhook.' }), { status: 401, headers: jsonHeaders })
  }
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 4_000_000) return new Response(JSON.stringify({ error: 'Inbound payload too large.' }), { status: 413, headers: jsonHeaders })

  let payload: IncomingPayload
  try { payload = await request.json() as IncomingPayload }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), { status: 400, headers: jsonHeaders }) }

  const rawFrom = String(payload.from || payload.sender || '')
  const rawTo = String(payload.to || payload.recipient || '')
  const message = {
    messageId: String(payload.messageId || payload.message_id || payload.id || '').trim().slice(0, 500),
    from: emailOf(rawFrom),
    fromName: senderName(rawFrom, String(payload.fromName || payload.from_name || '')),
    to: emailOf(rawTo),
    subject: String(payload.subject || '').trim().slice(0, 500),
    text: plainText(payload),
    attachments: normalizeAttachments(payload.attachments),
  }
  if (!message.messageId || !message.from || !message.to) {
    return new Response(JSON.stringify({ error: 'messageId, from and to are required.' }), { status: 400, headers: jsonHeaders })
  }
  const outboundFrom = emailOf(Deno.env.get('SERVICEDESK_OUTBOUND_FROM') || '')
  if (outboundFrom && message.from === outboundFrom) {
    return new Response(JSON.stringify({ ignored: true, reason: 'outbound-loop-protection' }), { status: 200, headers: jsonHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: 'Missing Supabase service configuration.' }), { status: 503, headers: jsonHeaders })

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/ingest_service_email`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_message: message }),
  })
  const text = await response.text()
  if (!response.ok) return new Response(text || JSON.stringify({ error: 'Inbound ingestion failed.' }), { status: response.status, headers: jsonHeaders })
  return new Response(text, { status: 200, headers: jsonHeaders })
})
