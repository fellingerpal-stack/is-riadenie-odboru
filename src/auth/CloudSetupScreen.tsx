import { Icon } from '../components/UI'
import { supabaseConfiguration } from '../lib/supabase'

export default function CloudSetupScreen() {
  return <div className="auth-page cloud-setup-page">
    <div className="auth-decoration auth-decoration-one" />
    <div className="auth-decoration auth-decoration-two" />
    <section className="auth-card cloud-setup-card">
      <div className="auth-brand"><div className="brand-mark">IS</div><div><strong>IS Riadenie odboru</strong><small>CVTI SR · Odbor 3.2</small></div></div>
      <div className="auth-heading">
        <span className="eyebrow">Cloudové prostredie</span>
        <h1>Supabase ešte nie je pripojený</h1>
        <p>Aplikácia je nastavená do režimu <strong>cloud</strong>, ale chýba URL projektu alebo verejný klientsky kľúč.</p>
      </div>
      <div className="setup-status-list">
        <div className={supabaseConfiguration.urlConfigured ? 'is-ok' : 'is-missing'}><Icon name={supabaseConfiguration.urlConfigured ? 'check' : 'warning'} size={18}/><span><strong>VITE_SUPABASE_URL</strong><small>{supabaseConfiguration.urlConfigured ? supabaseConfiguration.projectHost : 'premenná chýba'}</small></span></div>
        <div className={supabaseConfiguration.keyConfigured ? 'is-ok' : 'is-missing'}><Icon name={supabaseConfiguration.keyConfigured ? 'check' : 'warning'} size={18}/><span><strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong><small>{supabaseConfiguration.keyConfigured ? `nastavený ${supabaseConfiguration.keyType} kľúč` : 'premenná chýba'}</small></span></div>
      </div>
      <div className="setup-code"><code>VITE_APP_MODE=cloud</code><code>VITE_SUPABASE_URL=https://...supabase.co</code><code>VITE_SUPABASE_PUBLISHABLE_KEY=...</code><code>VITE_APP_URL=https://adresa-aplikacie</code></div>
      <div className="auth-message auth-error"><Icon name="shield" size={17}/><span>Service-role alebo secret kľúč nikdy nevkladajte do klientskych premenných aplikácie.</span></div>
      <footer><Icon name="database" size={14}/><span>Po doplnení premenných reštartujte Vite alebo vytvorte nový deployment.</span></footer>
    </section>
  </div>
}
