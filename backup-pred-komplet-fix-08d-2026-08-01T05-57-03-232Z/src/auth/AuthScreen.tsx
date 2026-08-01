import { useState, type FormEvent } from 'react'
import { Icon } from '../components/UI'
import { useAuth } from './AuthContext'

export default function AuthScreen({ resetMode = false }: { resetMode?: boolean }) {
  const { signIn, sendPasswordReset, updatePassword, signOut, error: authError } = useAuth()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
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
        setTimeout(() => {
          window.history.replaceState({}, '', `${window.location.pathname}#/dashboard`)
          window.dispatchEvent(new HashChangeEvent('hashchange'))
        }, 800)
      } else if (mode === 'forgot') {
        await sendPasswordReset(email)
        setMessage('Odkaz na obnovu hesla bol odoslaný na zadaný e-mail.')
      } else {
        await signIn(email, password)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Operáciu sa nepodarilo dokončiť.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-page">
    <div className="auth-decoration auth-decoration-one" />
    <div className="auth-decoration auth-decoration-two" />
    <section className="auth-card">
      <div className="auth-brand"><div className="brand-mark">IS</div><div><strong>Riadenie odboru</strong><small>CVTI SR · Odbor 3.2</small></div></div>
      <div className="auth-heading">
        <span className="eyebrow">{resetMode || mode === 'forgot' ? 'Obnova prístupu' : 'Interný informačný systém'}</span>
        <h1>{resetMode ? 'Nastavenie nového hesla' : mode === 'forgot' ? 'Zabudnuté heslo' : 'Prihlásenie'}</h1>
        <p>{resetMode ? 'Zadajte nové heslo k svojmu účtu.' : mode === 'forgot' ? 'Na pracovný e-mail vám odošleme bezpečný odkaz na obnovu hesla.' : 'Prihláste sa pracovným účtom. Oprávnenia sa riadia rolou evidovanou v Supabase.'}</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        {!resetMode && <label><span>E-mail</span><div className="auth-input"><Icon name="user" size={18}/><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="meno@cvtisr.sk" /></div></label>}
        {mode === 'login' && <label><span>{resetMode ? 'Nové heslo' : 'Heslo'}</span><div className="auth-input"><Icon name="lock" size={18}/><input type="password" required minLength={8} autoComplete={resetMode ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></div></label>}
        {resetMode && <label><span>Zopakovať nové heslo</span><div className="auth-input"><Icon name="lock" size={18}/><input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" /></div></label>}
        {(error || authError) && <div className="auth-message auth-error"><Icon name="warning" size={17}/><span>{error || authError}</span></div>}
        {message && <div className="auth-message auth-success"><Icon name="check" size={17}/><span>{message}</span></div>}
        <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Spracúvam…' : resetMode ? 'Uložiť nové heslo' : mode === 'forgot' ? 'Odoslať odkaz' : 'Prihlásiť sa'}<Icon name="arrow" size={18}/></button>
      </form>
      {!resetMode && <button className="auth-link" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Zabudli ste heslo?' : 'Späť na prihlásenie'}</button>}
      {resetMode && <button className="auth-link" onClick={() => void signOut()}>Zrušiť a odhlásiť sa</button>}
      <footer><Icon name="lock" size={14}/><span>Chránené prihlásením a pravidlami prístupu Supabase</span></footer>
    </section>
  </div>
}
