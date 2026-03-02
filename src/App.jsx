import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { QRCodeCanvas } from 'qrcode.react';
import emailjs from '@emailjs/browser';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Download, Users, Eye, EyeOff, Check, Phone, Mail,
  Settings, Save, X, LogOut, Home, FileText, QrCode,
  ChevronRight, Bed, Bath, Maximize, Calendar, Clock,
  Printer, Trash2, Plus, ArrowLeft, RefreshCw, Star,
  MessageSquare, ChevronLeft, BarChart2, Palette, Lock,
  List, AlertCircle, CheckCircle, Image
} from 'lucide-react';

// ─── EmailJS Config (fill in your IDs from emailjs.com) ─────────────────────
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_AGENT_TEMPLATE = 'YOUR_AGENT_TEMPLATE_ID';   // notifies you
const EMAILJS_VISITOR_TEMPLATE = 'YOUR_VISITOR_TEMPLATE_ID'; // thanks visitor
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const EMAILJS_ENABLED = false; // ← flip to true once you add your IDs above

// ─── Helpers ────────────────────────────────────────────────────────────────

function getListingId() {
  const p = new URLSearchParams(window.location.search);
  return p.get('listing') || 'default';
}
function sKey(lid, f) { return `oh_${lid}_${f}`; }
function loadLocal(lid, f, fb) {
  try { const v = localStorage.getItem(sKey(lid, f)); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
}
function saveLocal(lid, f, v) { localStorage.setItem(sKey(lid, f), JSON.stringify(v)); }

const BRAND_COLORS = [
  { name: 'Blue',   value: '#2563eb' },
  { name: 'Slate',  value: '#1e293b' },
  { name: 'Green',  value: '#16a34a' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Rose',   value: '#e11d48' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Teal',   value: '#0d9488' },
];

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
  photos: '',          // comma-separated URLs
  brand_color: '#2563eb',
  admin_password: 'openhouse2026',
};
const DEFAULT_DOCS = [];

const RESET_SECONDS = 30;

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const listingId = getListingId();

  const [view, setView]           = useState('home');
  const [authenticated, setAuthenticated] = useState(false);
  const [property, setProperty]   = useState(() => loadLocal(listingId, 'property', DEFAULT_PROPERTY));
  const [docs, setDocs]           = useState(() => loadLocal(listingId, 'docs', DEFAULT_DOCS));
  const [leads, setLeads]         = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [signedInVisitor, setSignedInVisitor] = useState(null);
  const [allListings, setAllListings] = useState(() => loadLocal('global', 'listings', ['default']));

  // Inject brand color CSS var whenever it changes
  useEffect(() => {
    document.documentElement.style.setProperty('--brand', property.brand_color || '#2563eb');
  }, [property.brand_color]);

  useEffect(() => { saveLocal(listingId, 'property', property); }, [property]);
  useEffect(() => { saveLocal(listingId, 'docs', docs); }, [docs]);

  useEffect(() => {
    if ((view === 'dashboard' || view === 'analytics') && authenticated) fetchLeads();
  }, [view, authenticated]);

  async function fetchLeads() {
    setLeadsLoading(true);
    const { data, error } = await supabase
      .from('leads').select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (!error) setLeads(data || []);
    setLeadsLoading(false);
  }

  async function submitLead(formData) {
    // Check if already signed in
    const existing = leads.find(l => l.email?.toLowerCase() === formData.email?.toLowerCase());
    if (existing) {
      setSignedInVisitor({ ...formData, returning: true });
      setView('thankyou');
      return;
    }

    const payload = { ...formData, listing_id: listingId };
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) {
      const local = loadLocal(listingId, 'local_leads', []);
      local.unshift({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
      saveLocal(listingId, 'local_leads', local);
    }

    // Send emails
    if (EMAILJS_ENABLED) {
      // Notify agent
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_AGENT_TEMPLATE, {
        agent_name:    property.agent_name,
        agent_email:   property.agent_email,
        visitor_name:  formData.name,
        visitor_email: formData.email,
        visitor_phone: formData.phone || 'Not provided',
        interest:      formData.interest || 'Not specified',
        property:      property.address,
        time:          new Date().toLocaleString(),
      }, EMAILJS_PUBLIC_KEY).catch(() => {});

      // Thank visitor
      if (formData.email) {
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_VISITOR_TEMPLATE, {
          visitor_name:   formData.name,
          visitor_email:  formData.email,
          agent_name:     property.agent_name,
          agent_phone:    property.agent_phone,
          agent_email:    property.agent_email,
          property:       property.address,
          price:          property.price,
        }, EMAILJS_PUBLIC_KEY).catch(() => {});
      }
    }

    setSignedInVisitor(formData);
    setView('thankyou');
  }

  function logout() { setAuthenticated(false); setView('home'); }

  function addListing(id) {
    const trimmed = id.trim().replace(/\s+/g, '');
    if (!trimmed || allListings.includes(trimmed)) return;
    const updated = [...allListings, trimmed];
    setAllListings(updated);
    saveLocal('global', 'listings', updated);
  }

  // ── Router ────────────────────────────────────────────────────────────────
  if (view === 'home')        return <ListingsHome allListings={allListings} onAddListing={addListing} onSelect={id => { window.location.href = `${window.location.pathname}?listing=${id}`; }} currentListing={listingId} />;
  if (view === 'admin_login') return <AdminLogin password={property.admin_password} onSuccess={() => { setAuthenticated(true); setView('dashboard'); }} onBack={() => setView('signin')} />;
  if (view === 'dashboard' && authenticated)  return <Dashboard property={property} leads={leads} loading={leadsLoading} listingId={listingId} onRefresh={fetchLeads} onSettings={() => setView('settings')} onQR={() => setView('qr')} onAnalytics={() => setView('analytics')} onLogout={logout} />;
  if (view === 'settings' && authenticated)   return <SettingsPanel property={property} docs={docs} onSave={(p,d) => { setProperty(p); setDocs(d); setView('dashboard'); }} onBack={() => setView('dashboard')} />;
  if (view === 'qr' && authenticated)         return <QRGenerator listingId={listingId} property={property} onBack={() => setView('dashboard')} />;
  if (view === 'analytics' && authenticated)  return <Analytics leads={leads} property={property} onBack={() => setView('dashboard')} />;
  if (view === 'thankyou')    return <ThankYou visitor={signedInVisitor} property={property} docs={docs} onBack={() => { setSignedInVisitor(null); setView('signin'); }} />;

  // Default: sign-in
  return <SignInForm property={property} leads={leads} onSubmit={submitLead} onAdminClick={() => setView('admin_login')} />;
}

// ─── Listings Home Screen ─────────────────────────────────────────────────────

function ListingsHome({ allListings, onAddListing, onSelect, currentListing }) {
  const [newId, setNewId] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function goSignIn(id) {
    window.location.href = `${window.location.pathname}?listing=${id}`;
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-logo"><Home size={24}/></div>
        <h1>Open House Sign-In</h1>
        <p>Select a listing or create a new one</p>
      </div>

      <div className="home-body">
        <div className="listings-grid">
          {allListings.map(id => {
            const prop = loadLocal(id, 'property', DEFAULT_PROPERTY);
            return (
              <div key={id} className="listing-card" onClick={() => goSignIn(id)}>
                <div className="listing-card-color" style={{ background: prop.brand_color || '#2563eb' }}/>
                <div className="listing-card-body">
                  <p className="listing-card-address">{prop.address}</p>
                  <p className="listing-card-city">{prop.city}</p>
                  <div className="listing-card-meta">
                    <span>{prop.price}</span>
                    {prop.bedrooms && <span><Bed size={12}/> {prop.bedrooms}</span>}
                    {prop.bathrooms && <span><Bath size={12}/> {prop.bathrooms}</span>}
                  </div>
                  <p className="listing-card-id">ID: {id}</p>
                </div>
                <ChevronRight size={16} className="listing-card-arrow"/>
              </div>
            );
          })}
        </div>

        {showAdd ? (
          <div className="add-listing-row">
            <input
              placeholder="Listing ID (e.g. 1234MainSt)"
              value={newId}
              onChange={e => setNewId(e.target.value.replace(/\s/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') { onAddListing(newId); setNewId(''); setShowAdd(false); }}}
              autoFocus
            />
            <button className="btn-primary-sm" onClick={() => { onAddListing(newId); setNewId(''); setShowAdd(false); }}>
              <Plus size={14}/> Create
            </button>
            <button className="btn-icon" onClick={() => setShowAdd(false)}><X size={14}/></button>
          </div>
        ) : (
          <button className="btn-outline add-listing-btn" onClick={() => setShowAdd(true)}>
            <Plus size={15}/> New Listing
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sign-In Form ─────────────────────────────────────────────────────────────

function SignInForm({ property, leads, onSubmit, onAdminClick }) {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', interest: 'browsing', first_time_buyer: false });
  const [errors, setErrors]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [alreadySeen, setAlreadySeen] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    return e;
  }

  function checkEmail(val) {
    if (!val) { setAlreadySeen(false); return; }
    const found = leads.find(l => l.email?.toLowerCase() === val.toLowerCase());
    setAlreadySeen(!!found);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  }

  const photos = property.photos ? property.photos.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="signin-page">
      <div className="signin-hero" style={{ background: `linear-gradient(135deg, ${property.brand_color}cc 0%, ${property.brand_color} 100%)` }}>
        {property.hero_image && <img src={property.hero_image} alt="Property" className="hero-img"/>}
        <div className="hero-overlay">
          <div className="hero-badge">Open House</div>
          <h1 className="hero-address">{property.address}</h1>
          <p className="hero-city">{property.city}</p>
          <p className="hero-price">{property.price}</p>
          <div className="hero-stats">
            {property.bedrooms  && <span><Bed size={14}/> {property.bedrooms} bd</span>}
            {property.bathrooms && <span><Bath size={14}/> {property.bathrooms} ba</span>}
            {property.sqft      && <span><Maximize size={14}/> {property.sqft} sqft</span>}
          </div>
          <div className="hero-time">
            <span><Calendar size={13}/> {property.open_house_date}</span>
            <span><Clock size={13}/> {property.open_house_time}</span>
          </div>
        </div>
      </div>

      <div className="signin-card">
        <h2 className="signin-title">Welcome! Sign In to Continue</h2>
        <p className="signin-sub">Get access to listing details &amp; documents</p>

        <form onSubmit={handleSubmit} className="signin-form">
          <div className="field-group">
            <label>Full Name *</label>
            <input type="text" placeholder="John Doe" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className={errors.name ? 'input-error' : ''}/>
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>

          <div className="field-group">
            <label>Email Address *</label>
            <div className="input-icon-wrap">
              <input type="email" placeholder="john@example.com" value={form.email}
                onChange={e => { setForm({...form, email: e.target.value}); checkEmail(e.target.value); }}
                className={errors.email ? 'input-error' : ''}/>
              {alreadySeen && <span className="returning-badge"><CheckCircle size={13}/> Welcome back!</span>}
            </div>
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <div className="field-group">
            <label>Phone Number <span className="optional">(optional)</span></label>
            <input type="tel" placeholder="(555) 000-0000" value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}/>
          </div>

          {/* Interest level */}
          <div className="field-group">
            <label>Are you interested in purchasing?</label>
            <div className="interest-grid">
              {[
                { val: 'just_looking',  label: 'Just Looking',    icon: '👀' },
                { val: 'browsing',      label: 'Actively Browsing', icon: '🏘️' },
                { val: 'very_interested', label: 'Very Interested', icon: '🔥' },
                { val: 'ready_to_buy', label: 'Ready to Buy',    icon: '✅' },
              ].map(opt => (
                <button
                  type="button" key={opt.val}
                  className={`interest-btn${form.interest === opt.val ? ' active' : ''}`}
                  onClick={() => setForm({...form, interest: opt.val})}
                >
                  <span className="interest-emoji">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* First-time buyer */}
          <label className="checkbox-row">
            <input type="checkbox" checked={form.first_time_buyer}
              onChange={e => setForm({...form, first_time_buyer: e.target.checked})}/>
            <span>I am a first-time home buyer</span>
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}
            style={{ background: property.brand_color }}>
            {submitting ? 'Signing in…' : <>View Property Details <ChevronRight size={16}/></>}
          </button>
        </form>

        {property.agent_name && (
          <div className="agent-strip">
            <div className="agent-avatar" style={{ background: property.brand_color }}>{property.agent_name.charAt(0)}</div>
            <div>
              <p className="agent-name">{property.agent_name}</p>
              <p className="agent-brokerage">{property.agent_brokerage}</p>
            </div>
            <div className="agent-contact">
              {property.agent_phone && <a href={`tel:${property.agent_phone}`} className="contact-link"><Phone size={14}/></a>}
              {property.agent_email && <a href={`mailto:${property.agent_email}`} className="contact-link"><Mail size={14}/></a>}
            </div>
          </div>
        )}

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

function ThankYou({ visitor, property, docs, onBack }) {
  const [countdown, setCountdown] = useState(RESET_SECONDS);
  const [photoIdx, setPhotoIdx]   = useState(0);

  useEffect(() => {
    if (countdown <= 0) { onBack(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleActivity() { setCountdown(RESET_SECONDS); }

  const photos = property.photos ? property.photos.split(',').map(s => s.trim()).filter(Boolean) : [];

  const interestLabels = {
    just_looking: '👀 Just Looking',
    browsing: '🏘️ Actively Browsing',
    very_interested: '🔥 Very Interested',
    ready_to_buy: '✅ Ready to Buy',
  };

  return (
    <div className="thankyou-page" onClick={handleActivity} onTouchStart={handleActivity}>
      <div className="thankyou-header" style={{ background: `linear-gradient(135deg, ${property.brand_color}dd, ${property.brand_color})` }}>
        <div className="check-circle"><Check size={28} strokeWidth={3}/></div>
        {visitor?.returning
          ? <><h2>Welcome back, {visitor?.name?.split(' ')[0]}!</h2><p>You're already signed in.</p></>
          : <><h2>Thanks, {visitor?.name?.split(' ')[0]}!</h2><p>You're signed in. Enjoy the open house!</p></>
        }
        <div className="countdown-wrap">
          <div className="countdown-bar" style={{ width: `${(countdown / RESET_SECONDS) * 100}%`, background: 'rgba(255,255,255,.85)' }}/>
        </div>
        <p className="countdown-label">Returning to sign-in in {countdown}s — tap anywhere to reset timer</p>
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div className="photo-gallery">
          <img src={photos[photoIdx]} alt={`Photo ${photoIdx + 1}`} className="gallery-img"/>
          {photos.length > 1 && (
            <div className="gallery-controls">
              <button className="gallery-btn" onClick={e => { e.stopPropagation(); handleActivity(); setPhotoIdx(i => (i - 1 + photos.length) % photos.length); }}>
                <ChevronLeft size={18}/>
              </button>
              <span className="gallery-counter">{photoIdx + 1} / {photos.length}</span>
              <button className="gallery-btn" onClick={e => { e.stopPropagation(); handleActivity(); setPhotoIdx(i => (i + 1) % photos.length); }}>
                <ChevronRight size={18}/>
              </button>
            </div>
          )}
          <div className="gallery-dots">
            {photos.map((_, i) => (
              <button key={i} className={`gallery-dot${i === photoIdx ? ' active' : ''}`}
                onClick={e => { e.stopPropagation(); handleActivity(); setPhotoIdx(i); }}/>
            ))}
          </div>
        </div>
      )}

      <div className="property-detail-card">
        <h3 className="section-title"><Home size={16}/> Property Details</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Address</span>
            <span className="detail-value">{property.address}, {property.city}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Price</span>
            <span className="detail-value price-tag" style={{ color: property.brand_color }}>{property.price}</span>
          </div>
          <div className="detail-row-3">
            {property.bedrooms  && <div className="stat-box"><Bed size={18}/><strong>{property.bedrooms}</strong><span>Beds</span></div>}
            {property.bathrooms && <div className="stat-box"><Bath size={18}/><strong>{property.bathrooms}</strong><span>Baths</span></div>}
            {property.sqft      && <div className="stat-box"><Maximize size={18}/><strong>{property.sqft}</strong><span>Sq Ft</span></div>}
          </div>
          {property.description && (
            <div className="detail-item full">
              <span className="detail-label">About</span>
              <span className="detail-value">{property.description}</span>
            </div>
          )}
        </div>

        {docs?.filter(d => d.url).length > 0 && (
          <div className="docs-section">
            <h3 className="section-title"><FileText size={16}/> Documents</h3>
            <div className="docs-list">
              {docs.filter(d => d.url).map((doc, i) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="doc-link"
                  onClick={handleActivity}>
                  <FileText size={16}/>
                  <span>{doc.label || 'Document'}</span>
                  <Download size={14} className="doc-dl"/>
                </a>
              ))}
            </div>
          </div>
        )}

        {property.agent_name && (
          <div className="agent-card">
            <div className="agent-avatar large" style={{ background: property.brand_color }}>{property.agent_name.charAt(0)}</div>
            <div className="agent-info">
              <p className="agent-name">{property.agent_name}</p>
              <p className="agent-brokerage">{property.agent_brokerage}</p>
              <div className="agent-links">
                {property.agent_phone && <a href={`tel:${property.agent_phone}`} className="btn-outline-sm"><Phone size={13}/> {property.agent_phone}</a>}
                {property.agent_email && <a href={`mailto:${property.agent_email}`} className="btn-outline-sm"><Mail size={13}/> {property.agent_email}</a>}
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

function AdminLogin({ password: correctPassword, onSuccess, onBack }) {
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState('');

  function handleLogin(e) {
    e.preventDefault();
    if (password === correctPassword) { onSuccess(); }
    else { setError('Incorrect password'); }
  }

  return (
    <div className="admin-login-page">
      <form onSubmit={handleLogin} className="login-card">
        <div className="login-logo"><Settings size={28}/></div>
        <h2>Agent Login</h2>
        <p className="login-sub">Enter your password to manage this listing</p>
        <div className="field-group">
          <label>Password</label>
          <div className="password-wrap">
            <input type={show ? 'text' : 'password'} placeholder="Password" value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }} autoFocus/>
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

function Dashboard({ property, leads, loading, listingId, onRefresh, onSettings, onQR, onAnalytics, onLogout }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [filter, setFilter] = useState('all');

  function exportCSV() {
    if (!leads.length) return;
    const rows = [
      ['Name','Email','Phone','Interest','First-Time Buyer','Date'],
      ...leads.map(l => [l.name, l.email, l.phone||'', l.interest||'', l.first_time_buyer ? 'Yes':'No', new Date(l.created_at).toLocaleString()])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = `leads-${listingId}.csv`; a.click();
  }

  const FILTERS = [
    { val: 'all',           label: 'All' },
    { val: 'ready_to_buy',  label: '✅ Ready' },
    { val: 'very_interested', label: '🔥 Hot' },
    { val: 'browsing',      label: '🏘️ Browsing' },
    { val: 'just_looking',  label: '👀 Looking' },
    { val: 'first_time',    label: '⭐ First-Time' },
  ];

  const filtered = leads.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'first_time') return l.first_time_buyer;
    return l.interest === filter;
  });

  const interestColor = { ready_to_buy: '#16a34a', very_interested: '#ea580c', browsing: '#2563eb', just_looking: '#64748b' };
  const interestLabel = { ready_to_buy: '✅ Ready to Buy', very_interested: '🔥 Very Interested', browsing: '🏘️ Browsing', just_looking: '👀 Just Looking' };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo-badge" style={{ background: property.brand_color }}><Home size={18}/></div>
          <div>
            <h1 className="admin-title">Dashboard</h1>
            <p className="admin-subtitle">{property.address} · {property.city}</p>
          </div>
        </div>
        <div className="admin-header-actions">
          <button className="btn-icon" title="Analytics" onClick={onAnalytics}><BarChart2 size={18}/></button>
          <button className="btn-icon" title="QR Code" onClick={onQR}><QrCode size={18}/></button>
          <button className="btn-icon" title="Settings" onClick={onSettings}><Settings size={18}/></button>
          <button className="btn-icon danger" title="Logout" onClick={onLogout}><LogOut size={18}/></button>
        </div>
      </header>

      <div className="admin-body">
        {/* Stat cards */}
        <div className="stat-cards">
          <div className="stat-card" style={{ borderLeftColor: property.brand_color }}>
            <Users size={22} style={{ color: property.brand_color }}/>
            <div><p className="stat-num">{leads.length}</p><p className="stat-label">Total Leads</p></div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
            <CheckCircle size={22} style={{ color: '#16a34a' }}/>
            <div><p className="stat-num">{leads.filter(l => l.interest === 'ready_to_buy' || l.interest === 'very_interested').length}</p><p className="stat-label">Hot Leads</p></div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#7c3aed' }}>
            <Star size={22} style={{ color: '#7c3aed' }}/>
            <div><p className="stat-num">{leads.filter(l => l.first_time_buyer).length}</p><p className="stat-label">First-Time Buyers</p></div>
          </div>
        </div>

        {/* EmailJS notice if not configured */}
        {!EMAILJS_ENABLED && (
          <div className="info-banner">
            <AlertCircle size={15}/>
            <span>Email notifications are disabled. <a href="https://emailjs.com" target="_blank" rel="noreferrer">Set up EmailJS</a> and add your IDs to App.jsx to enable them.</span>
          </div>
        )}

        <div className="leads-card">
          <div className="leads-card-header">
            <h2>Leads <span className="badge">{leads.length}</span></h2>
            <div className="leads-actions">
              <button className="btn-outline" onClick={onRefresh} disabled={loading}><RefreshCw size={14}/> Refresh</button>
              <button className="btn-primary-sm" onClick={exportCSV} disabled={!leads.length}><Download size={14}/> CSV</button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="filter-tabs">
            {FILTERS.map(f => (
              <button key={f.val} className={`filter-tab${filter === f.val ? ' active' : ''}`}
                onClick={() => setFilter(f.val)}
                style={filter === f.val ? { borderBottomColor: property.brand_color, color: property.brand_color } : {}}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><RefreshCw size={24} className="spin"/> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Users size={40} className="empty-icon"/><p>No leads yet</p></div>
          ) : (
            <div className="table-wrap">
              <table className="leads-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Interest</th><th>Notes</th><th>Signed In</th></tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => (
                    <tr key={l.id} className="lead-row" onClick={() => setSelectedLead(l)}>
                      <td className="lead-num">{i + 1}</td>
                      <td className="lead-name">
                        <div className="lead-avatar" style={{ background: property.brand_color }}>{l.name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          {l.name}
                          {l.first_time_buyer && <span className="ftb-badge">1st time</span>}
                        </div>
                      </td>
                      <td><a href={`mailto:${l.email}`} className="table-link" onClick={e => e.stopPropagation()}>{l.email}</a></td>
                      <td>{l.phone || <span className="muted">—</span>}</td>
                      <td>
                        {l.interest && (
                          <span className="interest-pill" style={{ background: interestColor[l.interest] + '22', color: interestColor[l.interest] }}>
                            {interestLabel[l.interest] || l.interest}
                          </span>
                        )}
                      </td>
                      <td>
                        {l.notes
                          ? <span className="has-note"><MessageSquare size={13}/></span>
                          : <span className="add-note muted"><Plus size={12}/> note</span>
                        }
                      </td>
                      <td className="muted">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedLead && (
        <LeadModal lead={selectedLead} brandColor={property.brand_color}
          onClose={() => setSelectedLead(null)}
          onSaveNote={async (note) => {
            await supabase.from('leads').update({ notes: note }).eq('id', selectedLead.id);
            setSelectedLead({ ...selectedLead, notes: note });
          }}
        />
      )}
    </div>
  );
}

// ─── Lead Modal (Notes) ───────────────────────────────────────────────────────

function LeadModal({ lead, brandColor, onClose, onSaveNote }) {
  const [note, setNote]   = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]  = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSaveNote(note);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const interestLabel = { ready_to_buy: '✅ Ready to Buy', very_interested: '🔥 Very Interested', browsing: '🏘️ Browsing', just_looking: '👀 Just Looking' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="lead-avatar large" style={{ background: brandColor }}>{lead.name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <h2 className="modal-name">{lead.name}</h2>
            {lead.first_time_buyer && <span className="ftb-badge">First-Time Buyer</span>}
          </div>
          <button className="btn-icon modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="modal-body">
          <div className="modal-row"><Mail size={14}/> <a href={`mailto:${lead.email}`} className="table-link">{lead.email}</a></div>
          {lead.phone && <div className="modal-row"><Phone size={14}/> <a href={`tel:${lead.phone}`} className="table-link">{lead.phone}</a></div>}
          {lead.interest && <div className="modal-row"><Star size={14}/> {interestLabel[lead.interest] || lead.interest}</div>}
          <div className="modal-row"><Clock size={14}/> Signed in {new Date(lead.created_at).toLocaleString()}</div>

          <div className="field-group" style={{ marginTop: 16 }}>
            <label><MessageSquare size={13}/> Private Notes</label>
            <textarea rows={4} placeholder="Add a private note about this lead…" value={note} onChange={e => setNote(e.target.value)}/>
          </div>

          <button className="btn-primary" style={{ background: brandColor }} onClick={handleSave} disabled={saving}>
            {saved ? <><Check size={14}/> Saved!</> : saving ? 'Saving…' : <><Save size={14}/> Save Note</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function Analytics({ leads, property, onBack }) {
  // Sign-ins by hour
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}`,
    count: leads.filter(l => new Date(l.created_at).getHours() === h).length
  })).filter((_, h) => leads.some(l => new Date(l.created_at).getHours() === h));

  // By interest
  const interestData = [
    { name: '✅ Ready', count: leads.filter(l => l.interest === 'ready_to_buy').length },
    { name: '🔥 Hot',   count: leads.filter(l => l.interest === 'very_interested').length },
    { name: '🏘️ Browse', count: leads.filter(l => l.interest === 'browsing').length },
    { name: '👀 Looking', count: leads.filter(l => l.interest === 'just_looking').length },
  ].filter(d => d.count > 0);

  const hotLeads    = leads.filter(l => l.interest === 'ready_to_buy' || l.interest === 'very_interested');
  const firstTimers = leads.filter(l => l.first_time_buyer);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <button className="btn-icon" onClick={onBack}><ArrowLeft size={18}/></button>
          <div>
            <h1 className="admin-title">Analytics</h1>
            <p className="admin-subtitle">{property.address}</p>
          </div>
        </div>
      </header>

      <div className="admin-body">
        <div className="stat-cards">
          <div className="stat-card" style={{ borderLeftColor: property.brand_color }}>
            <Users size={22} style={{ color: property.brand_color }}/>
            <div><p className="stat-num">{leads.length}</p><p className="stat-label">Total Leads</p></div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
            <CheckCircle size={22} style={{ color: '#16a34a' }}/>
            <div><p className="stat-num">{hotLeads.length}</p><p className="stat-label">Hot Leads</p></div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#7c3aed' }}>
            <Star size={22} style={{ color: '#7c3aed' }}/>
            <div><p className="stat-num">{firstTimers.length}</p><p className="stat-label">First-Time Buyers</p></div>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="analytics-empty">
            <BarChart2 size={48}/>
            <p>No data yet — analytics will appear after visitors sign in.</p>
          </div>
        ) : (
          <>
            {hourData.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">Sign-ins by Hour</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }}/>
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }}/>
                    <Tooltip/>
                    <Bar dataKey="count" fill={property.brand_color} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {interestData.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">Buyer Interest Breakdown</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={interestData} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }}/>
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }}/>
                    <Tooltip/>
                    <Bar dataKey="count" fill={property.brand_color} radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hot leads list */}
            {hotLeads.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">🔥 Hot Leads to Follow Up</h3>
                <div className="hot-leads-list">
                  {hotLeads.map(l => (
                    <div key={l.id} className="hot-lead-row">
                      <div className="lead-avatar sm" style={{ background: property.brand_color }}>{l.name?.charAt(0)}</div>
                      <div className="hot-lead-info">
                        <p className="hot-lead-name">{l.name} {l.first_time_buyer && <span className="ftb-badge">1st time</span>}</p>
                        <p className="hot-lead-contact">{l.email}{l.phone ? ` · ${l.phone}` : ''}</p>
                      </div>
                      <div className="hot-lead-actions">
                        {l.phone && <a href={`tel:${l.phone}`} className="btn-outline-sm"><Phone size={12}/></a>}
                        <a href={`mailto:${l.email}`} className="btn-outline-sm"><Mail size={12}/></a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ property, docs, onSave, onBack }) {
  const [p, setP]       = useState({ ...property });
  const [d, setD]       = useState(docs.length ? [...docs] : [{ label: '', url: '' }]);
  const [saved, setSaved] = useState(false);
  const [tab, setTab]   = useState('property');

  function updateDoc(i, field, val) { const nd=[...d]; nd[i]={...nd[i],[field]:val}; setD(nd); }
  function addDoc() { setD([...d, { label: '', url: '' }]); }
  function removeDoc(i) { setD(d.filter((_,idx) => idx !== i)); }

  function handleSave() {
    onSave(p, d.filter(doc => doc.label || doc.url));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const TABS = [
    { id: 'property', label: 'Property', icon: <Home size={14}/> },
    { id: 'agent',    label: 'Agent',    icon: <Users size={14}/> },
    { id: 'docs',     label: 'Docs',     icon: <FileText size={14}/> },
    { id: 'photos',   label: 'Photos',   icon: <Image size={14}/> },
    { id: 'branding', label: 'Branding', icon: <Palette size={14}/> },
    { id: 'security', label: 'Security', icon: <Lock size={14}/> },
  ];

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={18}/></button>
        <h1>Settings</h1>
        <button className="btn-primary-sm" style={{ background: p.brand_color }} onClick={handleSave}>
          {saved ? <><Check size={14}/> Saved!</> : <><Save size={14}/> Save</>}
        </button>
      </header>

      {/* Tabs */}
      <div className="settings-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`settings-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            style={tab === t.id ? { borderBottomColor: p.brand_color, color: p.brand_color } : {}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {tab === 'property' && (
          <div className="settings-section">
            <div className="settings-grid">
              <div className="field-group"><label>Street Address</label><input value={p.address} onChange={e=>setP({...p,address:e.target.value})} placeholder="1234 Main St"/></div>
              <div className="field-group"><label>City, State ZIP</label><input value={p.city} onChange={e=>setP({...p,city:e.target.value})} placeholder="Flagstaff, AZ 86001"/></div>
              <div className="field-group"><label>List Price</label><input value={p.price} onChange={e=>setP({...p,price:e.target.value})} placeholder="$450,000"/></div>
              <div className="field-group"><label>Bedrooms</label><input value={p.bedrooms} onChange={e=>setP({...p,bedrooms:e.target.value})} placeholder="3"/></div>
              <div className="field-group"><label>Bathrooms</label><input value={p.bathrooms} onChange={e=>setP({...p,bathrooms:e.target.value})} placeholder="2"/></div>
              <div className="field-group"><label>Square Footage</label><input value={p.sqft} onChange={e=>setP({...p,sqft:e.target.value})} placeholder="2,100"/></div>
              <div className="field-group full"><label>Description</label><textarea rows={3} value={p.description} onChange={e=>setP({...p,description:e.target.value})}/></div>
              <div className="field-group"><label>Open House Date</label><input value={p.open_house_date} onChange={e=>setP({...p,open_house_date:e.target.value})} placeholder="Saturday, Jan 25th"/></div>
              <div className="field-group"><label>Open House Time</label><input value={p.open_house_time} onChange={e=>setP({...p,open_house_time:e.target.value})} placeholder="1:00 PM – 4:00 PM"/></div>
              <div className="field-group full"><label>Hero Image URL <span className="optional">(banner photo)</span></label><input value={p.hero_image} onChange={e=>setP({...p,hero_image:e.target.value})} placeholder="https://…/photo.jpg"/></div>
            </div>
          </div>
        )}

        {tab === 'agent' && (
          <div className="settings-section">
            <div className="settings-grid">
              <div className="field-group"><label>Agent Name</label><input value={p.agent_name} onChange={e=>setP({...p,agent_name:e.target.value})} placeholder="Austin Prettyman"/></div>
              <div className="field-group"><label>Brokerage</label><input value={p.agent_brokerage} onChange={e=>setP({...p,agent_brokerage:e.target.value})} placeholder="Premier Realty"/></div>
              <div className="field-group"><label>Phone</label><input value={p.agent_phone} onChange={e=>setP({...p,agent_phone:e.target.value})} placeholder="928-710-8027"/></div>
              <div className="field-group"><label>Email</label><input value={p.agent_email} onChange={e=>setP({...p,agent_email:e.target.value})} placeholder="austinprettyman9@gmail.com"/></div>
            </div>
          </div>
        )}

        {tab === 'docs' && (
          <div className="settings-section">
            <div className="settings-section-header">
              <p className="settings-hint">Paste direct links to PDFs (Google Drive, Dropbox, etc.) Visitors see these after signing in.</p>
              <button className="btn-outline-sm" onClick={addDoc}><Plus size={13}/> Add Doc</button>
            </div>
            {d.map((doc, i) => (
              <div key={i} className="doc-row">
                <input className="doc-label-input" placeholder="Label (e.g. MLS Sheet)" value={doc.label} onChange={e=>updateDoc(i,'label',e.target.value)}/>
                <input className="doc-url-input" placeholder="https://drive.google.com/…" value={doc.url} onChange={e=>updateDoc(i,'url',e.target.value)}/>
                <button className="btn-icon danger" onClick={()=>removeDoc(i)}><Trash2 size={15}/></button>
              </div>
            ))}
          </div>
        )}

        {tab === 'photos' && (
          <div className="settings-section">
            <p className="settings-hint">Add photo URLs for the gallery shown to visitors after signing in. One URL per line, or comma-separated.</p>
            <div className="field-group">
              <label>Photo URLs</label>
              <textarea
                rows={6}
                placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg"}
                value={(p.photos||'').replace(/,/g,'\n')}
                onChange={e => setP({...p, photos: e.target.value.split('\n').map(s=>s.trim()).filter(Boolean).join(',')})}
              />
            </div>
            {p.photos && (
              <div className="photo-preview-strip">
                {p.photos.split(',').filter(Boolean).map((url,i) => (
                  <img key={i} src={url.trim()} alt={`Preview ${i+1}`} className="photo-preview-thumb" onError={e=>e.target.style.display='none'}/>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'branding' && (
          <div className="settings-section">
            <h3 className="settings-section-title"><Palette size={15}/> Brand Color</h3>
            <p className="settings-hint">This color is used throughout the app — buttons, header, accents.</p>
            <div className="color-grid">
              {BRAND_COLORS.map(c => (
                <button key={c.value}
                  className={`color-swatch${p.brand_color === c.value ? ' active' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => setP({...p, brand_color: c.value})}
                  title={c.name}
                >
                  {p.brand_color === c.value && <Check size={16} color="white" strokeWidth={3}/>}
                </button>
              ))}
              <div className="field-group" style={{ marginTop: 12 }}>
                <label>Custom Hex Color</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="color" value={p.brand_color} onChange={e=>setP({...p,brand_color:e.target.value})} style={{ width:48, height:40, padding:2, cursor:'pointer' }}/>
                  <input value={p.brand_color} onChange={e=>setP({...p,brand_color:e.target.value})} placeholder="#2563eb" style={{ flex:1 }}/>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="settings-section">
            <h3 className="settings-section-title"><Lock size={15}/> Change Admin Password</h3>
            <p className="settings-hint">Update the password used to access the admin dashboard. Make sure to remember it!</p>
            <div className="settings-grid">
              <div className="field-group full">
                <label>New Password</label>
                <input type="text" value={p.admin_password} onChange={e=>setP({...p,admin_password:e.target.value})} placeholder="Enter new password"/>
              </div>
            </div>
            <div className="security-note">
              <AlertCircle size={14}/> Current password: <strong>{p.admin_password}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QR Generator ─────────────────────────────────────────────────────────────

function QRGenerator({ listingId, property, onBack }) {
  const qrRef = useRef(null);
  const base  = window.location.origin + window.location.pathname;
  const [customListing, setCustomListing] = useState(listingId === 'default' ? '' : listingId);
  const [finalUrl, setFinalUrl] = useState(listingId === 'default' ? base : `${base}?listing=${listingId}`);
  const [qrSize, setQrSize]     = useState(256);

  function regenerate() {
    const id = customListing.trim() || 'default';
    setFinalUrl(id === 'default' ? base : `${base}?listing=${id}`);
  }

  function printQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>QR Code</title>
      <style>body{font-family:system-ui;text-align:center;padding:40px}img{display:block;margin:0 auto 20px}h2{margin:0;font-size:22px}p{color:#555;margin:4px 0}.url{font-size:11px;color:#999;word-break:break-all;margin-top:10px}@media print{button{display:none}}</style>
      </head><body>
      <img src="${dataUrl}" width="${qrSize}" height="${qrSize}"/>
      <h2>Scan to Sign In</h2>
      <p>${property.address}</p>
      <p>${property.open_house_date} · ${property.open_house_time}</p>
      <p class="url">${finalUrl}</p>
      <br/><button onclick="window.print()">🖨️ Print</button>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function downloadQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `qr-${customListing || 'default'}.png`;
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
            <QRCodeCanvas value={finalUrl} size={qrSize} bgColor="#ffffff" fgColor={property.brand_color} level="H" includeMargin={true}/>
          </div>
          <p className="qr-url-label">{finalUrl}</p>
          <div className="qr-actions">
            <button className="btn-primary" style={{ background: property.brand_color }} onClick={printQR}><Printer size={15}/> Print</button>
            <button className="btn-outline" onClick={downloadQR}><Download size={15}/> Download PNG</button>
          </div>
        </div>

        <div className="qr-options-card">
          <h3>Listing ID</h3>
          <p className="settings-hint">Each listing ID = separate leads &amp; settings.</p>
          <div className="qr-id-row">
            <input placeholder="e.g. 1234MainSt" value={customListing} onChange={e => setCustomListing(e.target.value.replace(/\s/g,''))}/>
            <button className="btn-primary-sm" style={{ background: property.brand_color }} onClick={regenerate}><RefreshCw size={14}/> Update</button>
          </div>
          <h3 style={{ marginTop:20 }}>Size</h3>
          <div className="qr-size-row">
            {[128,192,256,320].map(s => (
              <button key={s} className={qrSize===s?'size-btn active':'size-btn'}
                style={qrSize===s?{borderColor:property.brand_color,color:property.brand_color}:{}}
                onClick={()=>setQrSize(s)}>{s}px</button>
            ))}
          </div>
          <div className="qr-tip"><strong>Tip:</strong> Print and display at your open house. Visitors scan with their phone camera to sign in.</div>
        </div>
      </div>
    </div>
  );
}
