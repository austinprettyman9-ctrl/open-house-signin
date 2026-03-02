import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Download, Users, Eye, EyeOff, Check, Phone, Mail,
  Settings, Save, X, LogOut, Home, FileText, QrCode,
  ChevronRight, Bed, Bath, Maximize, Calendar, Clock,
  Printer, Edit3, Trash2, Plus, ArrowLeft, RefreshCw
} from 'lucide-react';

const ADMIN_PASSWORD = 'openhouse2026';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getListingId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('listing') || 'default';
}

function storageKey(listingId, field) {
  return `oh_${listingId}_${field}`;
}

function loadLocal(listingId, field, fallback) {
  try {
    const v = localStorage.getItem(storageKey(listingId, field));
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(listingId, field, value) {
  localStorage.setItem(storageKey(listingId, field), JSON.stringify(value));
}

const DEFAULT_PROPERTY = {
  address: '1234 Main Street',
  city: 'Flagstaff, AZ 86001',
  price: '$450,000',
  bedrooms: '3',
  bathrooms: '2',
  sqft: '2,100',
  description: 'Beautiful home in a quiet neighborhood with mountain views, updated kitchen, and spacious backyard.',
  open_house_date: 'Saturday, Jan 25th',
  open_house_time: '1:00 PM – 4:00 PM',
  agent_name: 'Austin Prettyman',
  agent_phone: '928-710-8027',
  agent_email: 'austinprettyman9@gmail.com',
  agent_brokerage: '',
  hero_image: '',
};

const DEFAULT_DOCS = [
  // { label: 'MLS Sheet', url: '' },
  // { label: 'Floor Plan', url: '' },
];

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const listingId = getListingId();

  const [view, setView] = useState('signin');          // signin | thankyou | admin_login | dashboard | settings | qr
  const [authenticated, setAuthenticated] = useState(false);
  const [property, setProperty] = useState(() => loadLocal(listingId, 'property', DEFAULT_PROPERTY));
  const [docs, setDocs] = useState(() => loadLocal(listingId, 'docs', DEFAULT_DOCS));
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [signedInVisitor, setSignedInVisitor] = useState(null);

  function goToAdmin() {
    setView('admin_login');
  }

  // Persist property + docs whenever they change
  useEffect(() => { saveLocal(listingId, 'property', property); }, [property]);
  useEffect(() => { saveLocal(listingId, 'docs', docs); }, [docs]);

  // Load leads when dashboard opens
  useEffect(() => {
    if (view === 'dashboard' && authenticated) fetchLeads();
  }, [view, authenticated]);

  async function fetchLeads() {
    setLeadsLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (!error) setLeads(data || []);
    setLeadsLoading(false);
  }

  async function submitLead(formData) {
    const payload = { ...formData, listing_id: listingId };
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) {
      // Fallback: store locally
      const local = loadLocal(listingId, 'local_leads', []);
      local.unshift({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
      saveLocal(listingId, 'local_leads', local);
    }
    setSignedInVisitor(formData);
    setView('thankyou');
  }

  function logout() {
    setAuthenticated(false);
    setView('signin');
  }

  // ── Router ────────────────────────────────────────────────────────────────

  if (view === 'admin_login') return (
    <AdminLogin
      onSuccess={() => { setAuthenticated(true); setView('dashboard'); }}
      onBack={() => setView('signin')}
    />
  );

  if (view === 'dashboard' && authenticated) return (
    <Dashboard
      property={property}
      leads={leads}
      loading={leadsLoading}
      listingId={listingId}
      onRefresh={fetchLeads}
      onSettings={() => setView('settings')}
      onQR={() => setView('qr')}
      onLogout={logout}
    />
  );

  if (view === 'settings' && authenticated) return (
    <SettingsPanel
      property={property}
      docs={docs}
      onSave={(p, d) => { setProperty(p); setDocs(d); setView('dashboard'); }}
      onBack={() => setView('dashboard')}
    />
  );

  if (view === 'qr' && authenticated) return (
    <QRGenerator
      listingId={listingId}
      onBack={() => setView('dashboard')}
    />
  );

  if (view === 'thankyou') return (
    <ThankYou
      visitor={signedInVisitor}
      property={property}
      docs={docs}
      onBack={() => { setSignedInVisitor(null); setView('signin'); }}
    />
  );

  // Default: sign-in form
  return (
    <SignInForm
      property={property}
      onSubmit={submitLead}
      onAdminClick={goToAdmin}
    />
  );
}

// ─── Sign-In Form ─────────────────────────────────────────────────────────────

function SignInForm({ property, onSubmit, onAdminClick }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  }

  return (
    <div className="signin-page">
      {/* Hero / Property Card */}
      <div className="signin-hero">
        {property.hero_image && (
          <img src={property.hero_image} alt="Property" className="hero-img" />
        )}
        <div className="hero-overlay">
          <div className="hero-badge">Open House</div>
          <h1 className="hero-address">{property.address}</h1>
          <p className="hero-city">{property.city}</p>
          <p className="hero-price">{property.price}</p>
          <div className="hero-stats">
            {property.bedrooms && <span><Bed size={14}/> {property.bedrooms} bd</span>}
            {property.bathrooms && <span><Bath size={14}/> {property.bathrooms} ba</span>}
            {property.sqft && <span><Maximize size={14}/> {property.sqft} sqft</span>}
          </div>
          <div className="hero-time">
            <span><Calendar size={13}/> {property.open_house_date}</span>
            <span><Clock size={13}/> {property.open_house_time}</span>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="signin-card">
        <h2 className="signin-title">Welcome! Sign In to Continue</h2>
        <p className="signin-sub">Get access to listing details & documents</p>

        <form onSubmit={handleSubmit} className="signin-form">
          <div className="field-group">
            <label>Full Name *</label>
            <input
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>

          <div className="field-group">
            <label>Email Address *</label>
            <input
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <div className="field-group">
            <label>Phone Number <span className="optional">(optional)</span></label>
            <input
              type="tel"
              placeholder="(555) 000-0000"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : <>View Property Details <ChevronRight size={16}/></>}
          </button>
        </form>

        {/* Agent info */}
        {property.agent_name && (
          <div className="agent-strip">
            <div className="agent-avatar">{property.agent_name.charAt(0)}</div>
            <div>
              <p className="agent-name">{property.agent_name}</p>
              <p className="agent-brokerage">{property.agent_brokerage}</p>
            </div>
            <div className="agent-contact">
              {property.agent_phone && (
                <a href={`tel:${property.agent_phone}`} className="contact-link"><Phone size={14}/></a>
              )}
              {property.agent_email && (
                <a href={`mailto:${property.agent_email}`} className="contact-link"><Mail size={14}/></a>
              )}
            </div>
          </div>
        )}

        {/* Admin link */}
        <div className="admin-footer-link">
          <button className="admin-tiny-btn" onClick={onAdminClick}>
            <Settings size={11}/> Agent Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thank You / Property Details ─────────────────────────────────────────────

const RESET_SECONDS = 30;

function ThankYou({ visitor, property, docs, onBack }) {
  const [countdown, setCountdown] = useState(RESET_SECONDS);

  // Auto-reset countdown
  useEffect(() => {
    if (countdown <= 0) { onBack(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Reset timer whenever user taps anywhere on the page
  function handleActivity() {
    setCountdown(RESET_SECONDS);
  }

  return (
    <div className="thankyou-page" onClick={handleActivity} onTouchStart={handleActivity}>
      <div className="thankyou-header">
        <div className="check-circle"><Check size={28} strokeWidth={3}/></div>
        <h2>Thanks, {visitor?.name?.split(' ')[0]}!</h2>
        <p>You're signed in. Enjoy the open house!</p>
        {/* Countdown bar */}
        <div className="countdown-wrap">
          <div
            className="countdown-bar"
            style={{ width: `${(countdown / RESET_SECONDS) * 100}%` }}
          />
        </div>
        <p className="countdown-label">Returning to sign-in in {countdown}s — tap anywhere to reset timer</p>
      </div>

      <div className="property-detail-card">
        <h3 className="section-title"><Home size={16}/> Property Details</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Address</span>
            <span className="detail-value">{property.address}, {property.city}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Price</span>
            <span className="detail-value price-tag">{property.price}</span>
          </div>
          <div className="detail-row-3">
            {property.bedrooms && (
              <div className="stat-box"><Bed size={18}/><strong>{property.bedrooms}</strong><span>Beds</span></div>
            )}
            {property.bathrooms && (
              <div className="stat-box"><Bath size={18}/><strong>{property.bathrooms}</strong><span>Baths</span></div>
            )}
            {property.sqft && (
              <div className="stat-box"><Maximize size={18}/><strong>{property.sqft}</strong><span>Sq Ft</span></div>
            )}
          </div>
          {property.description && (
            <div className="detail-item full">
              <span className="detail-label">About</span>
              <span className="detail-value">{property.description}</span>
            </div>
          )}
        </div>

        {/* Documents */}
        {docs && docs.filter(d => d.url).length > 0 && (
          <div className="docs-section">
            <h3 className="section-title"><FileText size={16}/> Documents</h3>
            <div className="docs-list">
              {docs.filter(d => d.url).map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="doc-link"
                >
                  <FileText size={16}/>
                  <span>{doc.label || 'Document'}</span>
                  <Download size={14} className="doc-dl"/>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Agent contact */}
        {property.agent_name && (
          <div className="agent-card">
            <div className="agent-avatar large">{property.agent_name.charAt(0)}</div>
            <div className="agent-info">
              <p className="agent-name">{property.agent_name}</p>
              <p className="agent-brokerage">{property.agent_brokerage}</p>
              <div className="agent-links">
                {property.agent_phone && (
                  <a href={`tel:${property.agent_phone}`} className="btn-outline-sm">
                    <Phone size={13}/> {property.agent_phone}
                  </a>
                )}
                {property.agent_email && (
                  <a href={`mailto:${property.agent_email}`} className="btn-outline-sm">
                    <Mail size={13}/> {property.agent_email}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <button className="btn-ghost back-btn" onClick={onBack}>
        <ArrowLeft size={14}/> Sign in another person
      </button>
    </div>
  );
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess, onBack }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  function handleLogin(e) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError('Incorrect password');
    }
  }

  return (
    <div className="admin-login-page">
      <form onSubmit={handleLogin} className="login-card">
        <div className="login-logo"><Settings size={28}/></div>
        <h2>Admin Access</h2>
        <p className="login-sub">Enter your password to manage this listing</p>
        <div className="field-group">
          <label>Password</label>
          <div className="password-wrap">
            <input
              type={show ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoFocus
            />
            <button type="button" className="eye-btn" onClick={() => setShow(!show)}>
              {show ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {error && <span className="error-msg">{error}</span>}
        </div>
        <button type="submit" className="btn-primary">Login</button>
        <button type="button" className="btn-ghost" onClick={onBack}>← Back to Sign-In</button>
      </form>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function Dashboard({ property, leads, loading, listingId, onRefresh, onSettings, onQR, onLogout }) {
  function exportCSV() {
    if (!leads.length) return;
    const rows = [
      ['Name', 'Email', 'Phone', 'Date'],
      ...leads.map(l => [
        l.name, l.email, l.phone || '', new Date(l.created_at).toLocaleString()
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `leads-${listingId}.csv`;
    a.click();
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo-badge"><Home size={18}/></div>
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">{property.address} · {property.city}</p>
          </div>
        </div>
        <div className="admin-header-actions">
          <button className="btn-icon" title="QR Code" onClick={onQR}><QrCode size={18}/></button>
          <button className="btn-icon" title="Settings" onClick={onSettings}><Settings size={18}/></button>
          <button className="btn-icon danger" title="Logout" onClick={onLogout}><LogOut size={18}/></button>
        </div>
      </header>

      <div className="admin-body">
        {/* Stat cards */}
        <div className="stat-cards">
          <div className="stat-card blue">
            <Users size={22}/>
            <div>
              <p className="stat-num">{leads.length}</p>
              <p className="stat-label">Total Leads</p>
            </div>
          </div>
          <div className="stat-card green">
            <Mail size={22}/>
            <div>
              <p className="stat-num">{leads.filter(l => l.email).length}</p>
              <p className="stat-label">With Email</p>
            </div>
          </div>
          <div className="stat-card purple">
            <Phone size={22}/>
            <div>
              <p className="stat-num">{leads.filter(l => l.phone).length}</p>
              <p className="stat-label">With Phone</p>
            </div>
          </div>
        </div>

        {/* Leads table */}
        <div className="leads-card">
          <div className="leads-card-header">
            <h2>Leads <span className="badge">{leads.length}</span></h2>
            <div className="leads-actions">
              <button className="btn-outline" onClick={onRefresh} disabled={loading}>
                <RefreshCw size={14}/> Refresh
              </button>
              <button className="btn-primary-sm" onClick={exportCSV} disabled={!leads.length}>
                <Download size={14}/> Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><RefreshCw size={24} className="spin"/> Loading…</div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <Users size={40} className="empty-icon"/>
              <p>No leads yet. Share the QR code to get started!</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Signed In</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l, i) => (
                    <tr key={l.id}>
                      <td className="lead-num">{i + 1}</td>
                      <td className="lead-name">
                        <div className="lead-avatar">{l.name?.charAt(0)?.toUpperCase()}</div>
                        {l.name}
                      </td>
                      <td><a href={`mailto:${l.email}`} className="table-link">{l.email}</a></td>
                      <td>{l.phone || <span className="muted">—</span>}</td>
                      <td className="muted">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ property, docs, onSave, onBack }) {
  const [p, setP] = useState({ ...property });
  const [d, setD] = useState(docs.length ? [...docs] : [{ label: '', url: '' }]);
  const [saved, setSaved] = useState(false);

  function updateDoc(i, field, val) {
    const nd = [...d];
    nd[i] = { ...nd[i], [field]: val };
    setD(nd);
  }
  function addDoc() { setD([...d, { label: '', url: '' }]); }
  function removeDoc(i) { setD(d.filter((_, idx) => idx !== i)); }

  function handleSave() {
    onSave(p, d.filter(doc => doc.label || doc.url));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={18}/></button>
        <h1>Settings</h1>
        <button className="btn-primary-sm" onClick={handleSave}>
          {saved ? <><Check size={14}/> Saved!</> : <><Save size={14}/> Save</>}
        </button>
      </header>

      <div className="settings-body">

        {/* Property Info */}
        <div className="settings-section">
          <h2 className="settings-section-title"><Home size={15}/> Property Info</h2>
          <div className="settings-grid">
            <div className="field-group">
              <label>Street Address</label>
              <input value={p.address} onChange={e => setP({ ...p, address: e.target.value })} placeholder="1234 Main St"/>
            </div>
            <div className="field-group">
              <label>City, State ZIP</label>
              <input value={p.city} onChange={e => setP({ ...p, city: e.target.value })} placeholder="Flagstaff, AZ 86001"/>
            </div>
            <div className="field-group">
              <label>List Price</label>
              <input value={p.price} onChange={e => setP({ ...p, price: e.target.value })} placeholder="$450,000"/>
            </div>
            <div className="field-group">
              <label>Bedrooms</label>
              <input value={p.bedrooms} onChange={e => setP({ ...p, bedrooms: e.target.value })} placeholder="3"/>
            </div>
            <div className="field-group">
              <label>Bathrooms</label>
              <input value={p.bathrooms} onChange={e => setP({ ...p, bathrooms: e.target.value })} placeholder="2"/>
            </div>
            <div className="field-group">
              <label>Square Footage</label>
              <input value={p.sqft} onChange={e => setP({ ...p, sqft: e.target.value })} placeholder="2,100"/>
            </div>
            <div className="field-group full">
              <label>Description</label>
              <textarea rows={3} value={p.description} onChange={e => setP({ ...p, description: e.target.value })} placeholder="Short description of the property…"/>
            </div>
            <div className="field-group">
              <label>Open House Date</label>
              <input value={p.open_house_date} onChange={e => setP({ ...p, open_house_date: e.target.value })} placeholder="Saturday, Jan 25th"/>
            </div>
            <div className="field-group">
              <label>Open House Time</label>
              <input value={p.open_house_time} onChange={e => setP({ ...p, open_house_time: e.target.value })} placeholder="1:00 PM – 4:00 PM"/>
            </div>
            <div className="field-group full">
              <label>Hero Image URL <span className="optional">(optional)</span></label>
              <input value={p.hero_image} onChange={e => setP({ ...p, hero_image: e.target.value })} placeholder="https://…/photo.jpg"/>
            </div>
          </div>
        </div>

        {/* Agent Info */}
        <div className="settings-section">
          <h2 className="settings-section-title"><Users size={15}/> Agent Info</h2>
          <div className="settings-grid">
            <div className="field-group">
              <label>Agent Name</label>
              <input value={p.agent_name} onChange={e => setP({ ...p, agent_name: e.target.value })} placeholder="Jane Smith"/>
            </div>
            <div className="field-group">
              <label>Brokerage</label>
              <input value={p.agent_brokerage} onChange={e => setP({ ...p, agent_brokerage: e.target.value })} placeholder="Premier Realty"/>
            </div>
            <div className="field-group">
              <label>Phone</label>
              <input value={p.agent_phone} onChange={e => setP({ ...p, agent_phone: e.target.value })} placeholder="(928) 555-0100"/>
            </div>
            <div className="field-group">
              <label>Email</label>
              <input value={p.agent_email} onChange={e => setP({ ...p, agent_email: e.target.value })} placeholder="jane@realestate.com"/>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title"><FileText size={15}/> Documents / PDFs</h2>
            <button className="btn-outline-sm" onClick={addDoc}><Plus size={13}/> Add</button>
          </div>
          <p className="settings-hint">Paste direct links to PDFs (Google Drive, Dropbox, etc.)</p>
          {d.map((doc, i) => (
            <div key={i} className="doc-row">
              <input
                className="doc-label-input"
                placeholder="Label (e.g. MLS Sheet)"
                value={doc.label}
                onChange={e => updateDoc(i, 'label', e.target.value)}
              />
              <input
                className="doc-url-input"
                placeholder="https://drive.google.com/…"
                value={doc.url}
                onChange={e => updateDoc(i, 'url', e.target.value)}
              />
              <button className="btn-icon danger" onClick={() => removeDoc(i)}><Trash2 size={15}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── QR Generator ─────────────────────────────────────────────────────────────

function QRGenerator({ listingId, onBack }) {
  const qrRef = useRef(null);
  const baseUrl = window.location.origin + window.location.pathname;
  const qrUrl = listingId === 'default'
    ? baseUrl
    : `${baseUrl}?listing=${listingId}`;

  const [customListing, setCustomListing] = useState(listingId === 'default' ? '' : listingId);
  const [finalUrl, setFinalUrl] = useState(qrUrl);
  const [qrSize, setQrSize] = useState(256);

  function regenerate() {
    const id = customListing.trim().replace(/\s+/g, '') || 'default';
    const url = id === 'default' ? baseUrl : `${baseUrl}?listing=${id}`;
    setFinalUrl(url);
  }

  function printQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Code – Open House</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 40px; }
        img { display: block; margin: 0 auto 20px; }
        h2 { margin: 0; font-size: 22px; }
        p { color: #555; margin: 4px 0; }
        .url { font-size: 11px; color: #999; word-break: break-all; margin-top: 10px; }
        @media print { button { display: none; } }
      </style></head><body>
        <img src="${dataUrl}" width="${qrSize}" height="${qrSize}"/>
        <h2>Scan to Sign In</h2>
        <p>Open House – ${listingId !== 'default' ? listingId : 'Welcome'}</p>
        <p class="url">${finalUrl}</p>
        <br/>
        <button onclick="window.print()">🖨️ Print</button>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function downloadQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `qr-${listingId}.png`;
    a.click();
  }

  return (
    <div className="qr-page">
      <header className="settings-header">
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={18}/></button>
        <h1>QR Code Generator</h1>
        <div/>
      </header>

      <div className="qr-body">
        <div className="qr-card">
          <div ref={qrRef} className="qr-canvas-wrap">
            <QRCodeCanvas
              value={finalUrl}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#1e293b"
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="qr-url-label">{finalUrl}</p>

          <div className="qr-actions">
            <button className="btn-primary" onClick={printQR}><Printer size={15}/> Print QR Code</button>
            <button className="btn-outline" onClick={downloadQR}><Download size={15}/> Download PNG</button>
          </div>
        </div>

        <div className="qr-options-card">
          <h3>Listing ID</h3>
          <p className="settings-hint">Each listing ID creates a separate set of leads and settings. Use something like the property address shorthand.</p>
          <div className="qr-id-row">
            <input
              placeholder="e.g. 1234MainSt (no spaces)"
              value={customListing}
              onChange={e => setCustomListing(e.target.value.replace(/\s/g, ''))}
            />
            <button className="btn-primary-sm" onClick={regenerate}><RefreshCw size={14}/> Update</button>
          </div>

          <h3 style={{ marginTop: 20 }}>QR Size</h3>
          <div className="qr-size-row">
            {[128, 192, 256, 320].map(s => (
              <button
                key={s}
                className={qrSize === s ? 'size-btn active' : 'size-btn'}
                onClick={() => setQrSize(s)}
              >{s}px</button>
            ))}
          </div>

          <div className="qr-tip">
            <strong>Tip:</strong> Print this QR code and display it at your open house. Visitors scan it with their phone camera and are taken directly to the sign-in page.
          </div>
        </div>
      </div>
    </div>
  );
}
