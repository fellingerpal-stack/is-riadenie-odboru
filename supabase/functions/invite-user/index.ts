import { createClient } from 'npm:@supabase/supabase-js@^2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

type AppRole = 'admin' | 'manager' | 'resolver' | 'employee' | 'viewer'

type ErrorDetails = {
  message: string
  code: string
  status: number
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function normalizeRole(value: unknown): AppRole {
  return value === 'admin' || value === 'manager' || value === 'resolver' || value === 'employee'
    ? value
    : 'viewer'
}

function errorDetails(error: unknown): ErrorDetails {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const raw = error instanceof Error
    ? error.message
    : [record.error_description, record.error, record.message, record.msg, record.details, record.hint]
        .find((value) => typeof value === 'string' && value.trim())
  const message = String(raw ?? '').trim()
  const code = typeof record.code === 'string' ? record.code : ''
  const parsedStatus = Number(record.status ?? 0)
  const status = Number.isFinite(parsedStatus) && parsedStatus >= 400 && parsedStatus < 600 ? parsedStatus : 400
  const normalized = `${message} ${code}`.toLowerCase()

  if (normalized.includes('already been registered') || normalized.includes('already registered')) {
    return { message: 'Používateľ s týmto e-mailom už existuje.', code: code || 'user_already_exists', status }
  }
  if (normalized.includes('rate limit') || normalized.includes('over_email_send_rate_limit')) {
    return { message: 'Bol prekročený limit odosielania e-mailov. Skúste to neskôr alebo nastavte vlastné SMTP.', code: code || 'email_rate_limit', status: 429 }
  }
  if (normalized.includes('email address not authorized') || normalized.includes('not authorized to send')) {
    return { message: 'Supabase odmietol adresáta. Nastavte vlastné SMTP alebo použite povolenú tímovú adresu.', code: code || 'email_not_authorized', status }
  }
  if (normalized.includes('smtp') || normalized.includes('error sending') || normalized.includes('failed to send email') || normalized.includes('sending confirmation email')) {
    return { message: 'E-mail sa nepodarilo odoslať. Skontrolujte SMTP prihlasovacie údaje, odosielaciu adresu a overenie domény.', code: code || 'smtp_error', status: 502 }
  }

  return {
    message: message || 'Operáciu používateľského účtu sa nepodarilo dokončiť. Supabase nevrátil podrobnosti chyby.',
    code: code || 'invite_failed',
    status,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders })
  if (request.method !== 'POST') return json({ ok: false, error: 'Povolená je iba metóda POST.', code: 'method_not_allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')
    const configuredAppUrl = (Deno.env.get('APP_URL') ?? '').trim().replace(/\/$/, '')
    const authorization = request.headers.get('Authorization')

    if (!supabaseUrl || !publicKey || !serviceRoleKey) {
      return json({ ok: false, error: 'Edge Function nemá dostupné potrebné Supabase secrets.', code: 'missing_secrets' }, 500)
    }
    if (!authorization) return json({ ok: false, error: 'Chýba prihlásenie používateľa.', code: 'missing_authorization' }, 401)

    const callerClient = createClient(supabaseUrl, publicKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerData, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerData.user) {
      return json({ ok: false, error: 'Prihlásenie nie je platné alebo relácia vypršala.', code: 'invalid_session' }, 401)
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('organization_id, full_name, role, is_active')
      .eq('id', callerData.user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!callerProfile?.is_active || callerProfile.role !== 'admin') {
      return json({ ok: false, error: 'Pozývať používateľov môže iba aktívny administrátor.', code: 'admin_required' }, 403)
    }

    const input = await request.json() as {
      action?: 'invite' | 'set-password'
      userId?: string
      password?: string
      email?: string
      fullName?: string
      department?: string
      jobTitle?: string
      phone?: string
      role?: AppRole
      appUrl?: string
    }

    const action = input.action === 'set-password' ? 'set-password' : 'invite'

    if (action === 'set-password') {
      const targetUserId = String(input.userId ?? '').trim()
      const password = String(input.password ?? '')
      if (!targetUserId) return json({ ok: false, error: 'Chýba identifikátor používateľa.', code: 'missing_user_id' }, 400)
      if (targetUserId === callerData.user.id) return json({ ok: false, error: 'Vlastné heslo si zmeňte cez Môj profil.', code: 'use_self_password_change' }, 400)
      if (password.length < 10) return json({ ok: false, error: 'Nové heslo musí mať aspoň 10 znakov.', code: 'weak_password' }, 400)

      const { data: targetProfile, error: targetProfileError } = await adminClient
        .from('profiles')
        .select('id, organization_id, full_name, email')
        .eq('id', targetUserId)
        .maybeSingle()
      if (targetProfileError) throw targetProfileError
      if (!targetProfile || targetProfile.organization_id !== callerProfile.organization_id) {
        return json({ ok: false, error: 'Používateľ nepatrí do vašej organizácie.', code: 'target_not_found' }, 404)
      }

      const { error: passwordError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password,
        email_confirm: true,
      })
      if (passwordError) {
        const detail = errorDetails(passwordError)
        return json({ ok: false, error: detail.message || 'Heslo sa nepodarilo nastaviť.', code: detail.code || 'password_update_failed' }, detail.status)
      }

      const changedAt = new Date().toISOString()
      const { error: activateError } = await adminClient.from('profiles').update({
        is_active: true,
        invite_expires_at: null,
        updated_at: changedAt,
      }).eq('id', targetUserId)
      if (activateError) console.warn('invite-user: profile activation after password change failed', activateError.message)

      const targetName = String(targetProfile.full_name ?? targetProfile.email ?? targetUserId)
      const { error: auditError } = await adminClient.from('user_admin_audit').insert({
        organization_id: callerProfile.organization_id,
        actor_id: callerData.user.id,
        actor_name: callerProfile.full_name ?? '',
        target_user_id: targetUserId,
        target_user_name: targetName,
        action: 'Heslo nastavené administrátorom',
        detail: 'Heslo bolo zmenené priamo v Supabase Auth bez odoslania e-mailu.',
      })
      if (auditError) console.warn('invite-user: password audit failed', auditError.message)

      return json({ ok: true, message: `Nové heslo používateľa ${targetName} bolo nastavené.` })
    }

    const email = String(input.email ?? '').trim().toLowerCase()
    const fullName = String(input.fullName ?? '').trim()
    const department = String(input.department ?? '').trim()
    const jobTitle = String(input.jobTitle ?? '').trim()
    const phone = String(input.phone ?? '').trim()
    const role = normalizeRole(input.role)
    const requestAppUrl = String(input.appUrl ?? '').trim().replace(/\/$/, '')
    const appUrl = configuredAppUrl || requestAppUrl

    if (!email || !email.includes('@')) return json({ ok: false, error: 'Zadajte platný e-mail.', code: 'invalid_email' }, 400)
    if (!fullName) return json({ ok: false, error: 'Zadajte meno a priezvisko.', code: 'missing_name' }, 400)

    const redirectTo = appUrl ? `${appUrl}/?reset=1` : undefined
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, department, job_title: jobTitle, phone, requested_role: role },
      redirectTo,
    })

    if (inviteError) {
      const detail = errorDetails(inviteError)
      console.error('invite-user: Supabase Auth invite failed', {
        message: detail.message,
        code: detail.code,
        status: detail.status,
      })
      return json({ ok: false, error: detail.message, code: detail.code }, detail.status)
    }
    if (!invited.user) return json({ ok: false, error: 'Supabase nevytvoril používateľa.', code: 'missing_user' }, 500)

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

    const { error: auditError } = await adminClient.from('user_admin_audit').insert({
      organization_id: callerProfile.organization_id,
      actor_id: callerData.user.id,
      actor_name: callerProfile.full_name ?? '',
      target_user_id: invited.user.id,
      target_user_name: fullName,
      action: 'Používateľ pozvaný',
      detail: `${email}; rola: ${role}`,
    })
    if (auditError) console.warn('invite-user: audit failed', auditError.message)

    return json({ ok: true, message: `Pozvanie bolo odoslané na ${email}.`, userId: invited.user.id })
  } catch (error) {
    const detail = errorDetails(error)
    console.error('invite-user fix.3 failed', { message: detail.message, code: detail.code, status: detail.status })
    return json({ ok: false, error: detail.message, code: detail.code }, detail.status)
  }
})
