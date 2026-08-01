import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type AppRole = 'admin' | 'manager' | 'resolver' | 'employee' | 'viewer'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function normalizeRole(value: unknown): AppRole {
  return value === 'admin' || value === 'manager' || value === 'resolver' || value === 'employee' ? value : 'viewer'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ ok: false, error: 'Povolená je iba metóda POST.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
    const authorization = request.headers.get('Authorization')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ ok: false, error: 'Edge Function nemá potrebné Supabase secrets.' }, 500)
    }
    if (!authorization) return json({ ok: false, error: 'Chýba prihlásenie používateľa.' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerData, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerData.user) return json({ ok: false, error: 'Prihlásenie nie je platné.' }, 401)

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('organization_id, full_name, role, is_active')
      .eq('id', callerData.user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!callerProfile?.is_active || callerProfile.role !== 'admin') {
      return json({ ok: false, error: 'Pozývať používateľov môže iba aktívny administrátor.' }, 403)
    }

    const input = await request.json() as {
      email?: string
      fullName?: string
      department?: string
      jobTitle?: string
      phone?: string
      role?: AppRole
    }
    const email = String(input.email ?? '').trim().toLowerCase()
    const fullName = String(input.fullName ?? '').trim()
    const department = String(input.department ?? '').trim()
    const jobTitle = String(input.jobTitle ?? '').trim()
    const phone = String(input.phone ?? '').trim()
    const role = normalizeRole(input.role)

    if (!email || !email.includes('@')) return json({ ok: false, error: 'Zadajte platný e-mail.' }, 400)
    if (!fullName) return json({ ok: false, error: 'Zadajte meno a priezvisko.' }, 400)

    const redirectTo = appUrl ? `${appUrl}/?reset=1` : undefined
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, department, job_title: jobTitle, phone },
      redirectTo,
    })
    if (inviteError) throw inviteError
    if (!invited.user) throw new Error('Supabase nevytvoril používateľa.')

    const invitedAt = new Date().toISOString()
    const { error: upsertError } = await adminClient.from('profiles').upsert({
      id: invited.user.id,
      organization_id: callerProfile.organization_id,
      full_name: fullName,
      email,
      department,
      job_title: jobTitle,
      phone,
      role,
      is_active: true,
      invited_at: invitedAt,
      updated_at: invitedAt,
    }, { onConflict: 'id' })
    if (upsertError) throw upsertError

    await adminClient.from('user_admin_audit').insert({
      organization_id: callerProfile.organization_id,
      actor_id: callerData.user.id,
      actor_name: callerProfile.full_name ?? '',
      target_user_id: invited.user.id,
      target_user_name: fullName,
      action: 'Používateľ pozvaný',
      detail: `${email}; rola: ${role}`,
    })

    return json({ ok: true, message: `Pozvanie bolo odoslané na ${email}.` })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pozvanie sa nepodarilo odoslať.'
    return json({ ok: false, error: message }, 400)
  }
})
