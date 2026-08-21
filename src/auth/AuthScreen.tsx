import { useState, type FormEvent } from 'react'
import { Icon } from '../components/UI'
import { useAuth } from './AuthContext'

export default function AuthScreen({ resetMode = false }: { resetMode?: boolean }) {
  const {
    signIn,
    signInWithMicrosoft,
    microsoftSsoEnabled,
    sendPasswordReset,
    updatePassword,
    finishPasswordRecovery,
    signOut,
    error: authError,
    configuration,
  } = useAuth()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ssoBusy, setSsoBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (resetMode) {
        if (password.length < 8) throw new Error('Heslo musí mať aspoň 8 znakov.')
        if (password !== confirmPassword) throw new Error('Zadané heslá sa nezhodujú.')
        await updatePassword(password)
        setMessage('Heslo bolo zmenené. Aplikácia sa otvorí o chvíľu.')
        window.setTimeout(() => finishPasswordRecovery(), 700)
      } else if (mode === 'forgot') {
        await sendPasswordReset(email)
        setMessage('Odkaz na obnovu hesla bol odoslaný na zadaný pracovný e-mail.')
      } else {
        await signIn(email, password)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Operáciu sa nepodarilo dokončiť.')
    } finally {
      setBusy(false)
    }
  }

  async function submitMicrosoft() {
    setSsoBusy(true)
    setError('')
    setMessage('')
    try {
      await signInWithMicrosoft()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Microsoft prihlásenie sa nepodarilo spustiť.')
      setSsoBusy(false)
    }
  }

  const passwordType = showPassword ? 'text' : 'password'

  return <div className="auth-page">
    <div className="auth-decoration auth-decoration-one" />
    <div className="auth-decoration auth-decoration-two" />
    <section className="auth-card">
      <div className="auth-brand"><div className="brand-mark">IS</div><div><strong>IS Riadenie odboru</strong><small>CVTI SR · Odbor 3.2</small></div></div>
      <div className="auth-heading">
        <span className="eyebrow">{resetMode || mode === 'forgot' ? 'Obnova prístupu' : 'Interný informačný systém'}</span>
        <h1>{resetMode ? 'Nastavenie nového hesla' : mode === 'forgot' ? 'Zabudnuté heslo' : 'Prihlásenie'}</h1>
        <p>{resetMode ? 'Zadajte nové heslo k svojmu účtu.' : mode === 'forgot' ? 'Na pracovný e-mail vám odošleme bezpečný odkaz na obnovu hesla.' : 'Prihláste sa pracovným účtom. Dostupné moduly a oprávnenia určuje vaša aplikačná rola.'}</p>
      </div>
      {!resetMode && mode === 'login' && microsoftSsoEnabled && <>
        <button type="button" className="auth-microsoft" disabled={ssoBusy || busy} onClick={() => void submitMicrosoft()}>
          <span className="microsoft-mark" aria-hidden="true"><i/><i/><i/><i/></span>
          <span>{ssoBusy ? 'Presmerúvam na Microsoft…' : 'Prihlásiť cez Microsoft'}</span>
        </button>
        <div className="auth-divider"><span>alebo pracovným e-mailom a heslom</span></div>
      </>}
      <form className="auth-form" onSubmit={submit}>
        {!resetMode && <label><span>Pracovný e-mail</span><div className="auth-input"><Icon name="user" size={18}/><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="meno@cvtisr.sk" /></div></label>}
        {(mode === 'login' || resetMode) && <label><span>{resetMode ? 'Nové heslo' : 'Heslo'}</span><div className="auth-input"><Icon name="lock" size={18}/><input type={passwordType} required minLength={8} autoComplete={resetMode ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={17}/></button></div></label>}
        {resetMode && <label><span>Zopakovať nové heslo</span><div className="auth-input"><Icon name="lock" size={18}/><input type={passwordType} required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" /></div></label>}
        {(error || authError) && <div className="auth-message auth-error"><Icon name="warning" size={17}/><span>{error || authError}</span></div>}
        {message && <div className="auth-message auth-success"><Icon name="check" size={17}/><span>{message}</span></div>}
        <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Spracúvam…' : resetMode ? 'Uložiť nové heslo' : mode === 'forgot' ? 'Odoslať odkaz' : 'Prihlásiť sa'}<Icon name="arrow" size={18}/></button>
      </form>
      {!resetMode && <button className="auth-link" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Zabudli ste heslo?' : 'Späť na prihlásenie'}</button>}
      {resetMode && <button className="auth-link" onClick={() => void signOut()}>Zrušiť a odhlásiť sa</button>}
      <div className="auth-environment"><Icon name="database" size={14}/><span>{configuration.projectHost || 'Supabase projekt'} · {configuration.keyType === 'publishable' ? 'publishable key' : 'verejný klientsky kľúč'}</span></div>
      <footer><Icon name="shield" size={14}/><span>{microsoftSsoEnabled ? 'Firemné SSO zabezpečuje Microsoft Entra ID cez Supabase Auth' : 'Prihlásenie, relácie a heslá zabezpečuje Supabase Auth'}</span></footer>
    </section>
  </div>
}
