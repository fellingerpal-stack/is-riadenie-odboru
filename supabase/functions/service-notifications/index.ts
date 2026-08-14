// IS Riadenie odboru v0.45.0 - ServiceDesk email outbox worker
// This function is provider-neutral. It forwards an e-mail payload to the organization's mail gateway webhook.
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SERVICEDESK_EMAIL_WEBHOOK_URL,
// SERVICEDESK_EMAIL_WEBHOOK_TOKEN, SERVICEDESK_WORKER_SECRET. Optional: SERVICEDESK_APP_URL.

const jsonHeaders = { 'Content-Type': 'application/json' }

Deno.serve(async (request) => {
  const workerSecret = Deno.env.get('SERVICEDESK_WORKER_SECRET') || ''
  if (!workerSecret || request.headers.get('x-servicedesk-worker-secret') !== workerSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized worker invocation.' }), { status: 401, headers: jsonHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const webhookUrl = Deno.env.get('SERVICEDESK_EMAIL_WEBHOOK_URL') || ''
  const webhookToken = Deno.env.get('SERVICEDESK_EMAIL_WEBHOOK_TOKEN') || ''
  const appUrl = Deno.env.get('SERVICEDESK_APP_URL') || ''
  if (!supabaseUrl || !serviceKey || !webhookUrl) {
    return new Response(JSON.stringify({ error: 'Missing ServiceDesk worker configuration.' }), { status: 503, headers: jsonHeaders })
  }

  const rpcHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  const claim = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_service_email_batch`, {
    method: 'POST', headers: rpcHeaders, body: JSON.stringify({ p_limit: 25 }),
  })
  if (!claim.ok) return new Response(await claim.text(), { status: 500, headers: jsonHeaders })
  const batch = await claim.json() as Array<{ id: string; to_email: string; subject: string; html_body: string }>

  let sent = 0
  let failed = 0
  for (const item of batch) {
    let success = false
    let errorMessage = ''
    try {
      const html = `${item.html_body}${appUrl ? `<p><a href="${appUrl.replace(/\/$/, '')}/#/serviceDesk">Otvoriť ServiceDesk</a></p>` : ''}`
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}) },
        body: JSON.stringify({ to: item.to_email, subject: item.subject, html, source: 'CVTI ServiceDesk' }),
      })
      success = response.ok
      if (!success) errorMessage = (await response.text()).slice(0, 1800)
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
    }

    await fetch(`${supabaseUrl}/rest/v1/rpc/complete_service_email`, {
      method: 'POST', headers: rpcHeaders,
      body: JSON.stringify({ p_id: item.id, p_success: success, p_error: errorMessage }),
    })
    if (success) sent += 1
    else failed += 1
  }

  return new Response(JSON.stringify({ claimed: batch.length, sent, failed }), { status: 200, headers: jsonHeaders })
})
