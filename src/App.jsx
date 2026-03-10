import { useState, useEffect, useRef, useCallback } from 'react';
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
  List, AlertCircle, CheckCircle, Image, Upload, Link,
  Clipboard, Scan, Sparkles, Loader, Camera, Copy, Moon,
  Sun, UserCircle, Tag, Timer, Bell
} from 'lucide-react';

// ─── EmailJS Config ──────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID       = 'service_t2c7gf4';
const EMAILJS_AGENT_TEMPLATE   = 'template_15grhmx';
const EMAILJS_VISITOR_TEMPLATE = 'template_psedv49';
const EMAILJS_PUBLIC_KEY       = '96jrWedilcz0BqW1q';
const EMAILJS_ENABLED          = true;

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  agent_brokerage: 'Re/Max Fine Properties',
  agent_photo: '',
  nickname: '',
  hero_image: '',
  photos: '',
  brand_color: '#2563eb',
  admin_password: 'openhouse2026',
};
const DEFAULT_DOCS = [];
const RESET_SECONDS = 30;

// ─── MLS Parser ──────────────────────────────────────────────────────────────
function parseMlsText(rawText) {
  let t = rawText
    .replace(/\r\n/g, '\n')
    .replace(/  +/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const found = {};

  function fmtPrice(raw) {
    const n = parseInt(raw.replace(/[,$]/g, ''), 10);
    return isNaN(n) ? raw : '$' + n.toLocaleString('en-US');
  }
  function fmtNum(raw) {
    const n = parseInt(raw.replace(/,/g, ''), 10);
    return isNaN(n) ? raw : n.toLocaleString('en-US');
  }
  function field(patterns) {
    for (const pat of patterns) {
      const re = new RegExp('(?:^|\\n)\\s*' + pat + '\\s*[:#]+\\s*([^\\n]+)', 'im');
      const m = t.match(re);
      if (m) return m[1].trim();
    }
    return null;
  }

  const priceRaw = field(['list(?:ing)?\\s*price', 'asking\\s*price', 'sold\\s*price']);
  if (priceRaw) {
    const priceNum = priceRaw.match(/\$?([\d,]+(?:\.\d{2})?)/);
    if (priceNum) found.price = fmtPrice(priceNum[1]);
  } else {
    const m = t.match(/\$\s*([\d,]{5,})/);
    if (m) found.price = fmtPrice(m[1]);
  }

  const bedRaw = field(['#\\s*bed(?:room)?s?', 'bed(?:room)?s?', 'br', 'bd']);
  if (bedRaw) {
    const m = bedRaw.match(/^(\d+)/);
    if (m) found.bedrooms = m[1];
  } else {
    const m = t.match(/\b(\d+)\s*bed(?:room)?s?\b/i);
    if (m) found.bedrooms = m[1];
  }

  const bathFullField = field(['#\\s*bath(?:room)?s?', 'baths?\\s*full', 'bath(?:room)?s?', 'baths?']);
  const bathHalfField = field(['baths?\\s*(?:half|partial|1\\/2)', 'half\\s*baths?']);
  if (bathFullField) {
    const full = parseInt(bathFullField.match(/^(\d+)/)?.[1] || '0', 10);
    const half = bathHalfField ? parseInt(bathHalfField.match(/^(\d+)/)?.[1] || '0', 10) : 0;
    if (!isNaN(full) && full > 0) {
      found.bathrooms = half > 0 ? `${full}.5` : `${full}`;
    }
  } else {
    const m = t.match(/\b(\d+(?:\.\d)?)\s*ba(?:th(?:room)?s?)?\b/i);
    if (m) found.bathrooms = m[1];
  }

  const sqftRaw = field(['approx\.?\\s*sq\.?\\s*ft', 'sq\.?\\s*ft\.?(?:\\s*(?:heated|living|total))?', 'sqft', 'square\\s*feet?']);
  if (sqftRaw) {
    const m = sqftRaw.match(/^([\d,]+)/);
    if (m) found.sqft = fmtNum(m[1]);
  } else {
    const m = t.match(/\b([\d,]{4,})\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet?)\b/i);
    if (m) found.sqft = fmtNum(m[1]);
  }

  const addrRaw = field(['address', 'property\\s*address', 'street\\s*address']);
  if (addrRaw) {
    const commaIdx = addrRaw.indexOf(',');
    if (commaIdx > 0) {
      found.address = addrRaw.substring(0, commaIdx).trim();
      const cityPart = addrRaw.substring(commaIdx + 1).trim();
      const cityM = cityPart.match(/^([A-Za-z][A-Za-z ]+?)[,\s]+([A-Z]{2})\s+(\d{5})/);
      if (cityM) found._cityFromAddr = `${cityM[1].trim()}, ${cityM[2]} ${cityM[3]}`;
    } else {
      found.address = addrRaw.trim();
    }
  } else {
    const m = t.match(/(?:^|\b)(\d{2,5}\s+(?:[NSEW]\s+)?[A-Za-z][A-Za-z0-9 .#]{3,}(?:Street|Avenue|Boulevard|Drive|Road|Lane|Court|Way|Place|Circle|Trail|Loop|Highway|Parkway|St|Ave|Blvd|Dr|Rd|Ln|Ct|Pl|Cir|Trl|Hwy|Pkwy)\b[^,\n]{0,25})/i);
    if (m) found.address = m[1].trim();
  }

  if (found._cityFromAddr) {
    found.city = found._cityFromAddr;
    delete found._cityFromAddr;
  } else {
    const cityLabelMatch = t.match(/(?:^|\n)\s*(?:city[\s/]*state[\s/]*zip(?:code)?|city\s*[,/]\s*state|city)\s*[:#\t ]+([^\n]+)/im);
    if (cityLabelMatch) {
      let raw = cityLabelMatch[1].trim();
      const inlineFull = raw.match(/^([A-Za-z][A-Za-z ]+?)[,\s]+([A-Z]{2})\s+(\d{5})/);
      if (inlineFull) {
        raw = `${inlineFull[1].trim()}, ${inlineFull[2]} ${inlineFull[3]}`;
      } else {
        const stateM = t.match(/(?:^|\n)\s*State\s*[:#]+\s*([A-Z]{2})/im);
        const zipM   = t.match(/(?:^|\n)\s*Zip(?:\s*Code)?\s*[:#]+\s*(\d{5})/im);
        if (stateM && zipM) raw = `${raw}, ${stateM[1]} ${zipM[1]}`;
      }
      found.city = raw;
    } else {
      const m = t.match(/\b([A-Za-z][A-Za-z ]{2,}(?:,\s*|\s+)[A-Z]{2}\s+\d{5})\b/);
      if (m) found.city = m[1].trim();
    }
  }

  const descRaw = field(['public\\s*remarks?', 'agent\\s*remarks?', 'remarks?', 'description']);
  if (descRaw) found.description = descRaw.replace(/\s+/g, ' ').trim();

  const agentPresentedMatch = t.match(/(?:^|\n)\s*Presented\s*By\s*:?\s*([A-Za-z][A-Za-z .,''-]+?)(?=\n|$)/im);
  const agentLabelRaw = field(['listing\\s*agent', 'agent\\s*name', 'listed\\s*by', 'co[\\s-]?list(?:ing)?\\s*agent']);
  if (agentPresentedMatch) {
    found.agent_name = agentPresentedMatch[1].trim().replace(/[,\s]+$/, '');
  } else if (agentLabelRaw) {
    const stopIdx = agentLabelRaw.search(/\s{2,}[A-Za-z]+\s*:/);
    found.agent_name = (stopIdx > 0 ? agentLabelRaw.substring(0, stopIdx) : agentLabelRaw).trim().replace(/[,\s]+$/, '');
  }

  const phoneLabelRaw = field(['agent\\s*phone', 'listing\\s*agent\\s*phone', 'cell(?:ular)?', 'mobile', 'office\\s*phone', 'phone', 'contact(?:\\s*#)?']);
  if (phoneLabelRaw) {
    const m = phoneLabelRaw.match(/[\d()+.\s-]{7,}/);
    if (m) found.agent_phone = m[0].trim().replace(/\s+/g, ' ');
  } else {
    const m = t.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/);
    if (m) found.agent_phone = m[0].trim();
  }

  const emailM = t.match(/[\w.+\-]+@[\w.\-]+\.[a-z]{2,}/i);
  if (emailM) found.agent_email = emailM[0];

  const brokerRaw = field(['listing\\s*(?:broker(?:age)?|office|firm)', 'brokerage', 'broker(?!age)', 'company', 'office']);
  if (brokerRaw) {
    found.agent_brokerage = brokerRaw.trim();
  } else if (agentPresentedMatch) {
    const afterAgent = t.substring(t.indexOf(agentPresentedMatch[0]) + agentPresentedMatch[0].length);
    const nextLine = afterAgent.match(/^\s*([^\n]+)/);
    if (nextLine && nextLine[1].trim() && !nextLine[1].match(/\d{5}|@|\d{3}[.\-]\d{3}/)) {
      found.agent_brokerage = nextLine[1].trim();
    }
  }

  const ohDateLabelRaw   = field(['open\\s*house\\s*date']);
  const ohDateCombinedRaw = field(['open\\s*house']);
  if (ohDateLabelRaw) {
    let d = ohDateLabelRaw.replace(/\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM).*/i, '').trim();
    found.open_house_date = d;
  } else if (ohDateCombinedRaw) {
    let d = ohDateCombinedRaw;
    const timeIdx = d.search(/\d{1,2}(?::\d{2})?\s*(?:AM|PM)/i);
    if (timeIdx > 0) d = d.substring(0, timeIdx).trim().replace(/[,\s]+$/, '');
    found.open_house_date = d;
  }

  const ohTimeLabelRaw  = field(['open\\s*house\\s*time']);
  const ohTimeInlineM   = t.match(/\b(\d{1,2}(?::\d{2})?\s*(?:AM|PM)\s*(?:–|—|-|to)\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM))\b/i);
  if (ohTimeLabelRaw) found.open_house_time = ohTimeLabelRaw.trim();
  else if (ohTimeInlineM) found.open_house_time = ohTimeInlineM[1].trim();

  return found;
}

// ─── PDF Text Extractor ──────────────────────────────────────────────────────
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

async function extractTextFromPdf(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join('  ') + '\n';
    }
    return fullText;
  } catch (err) {
    console.error('PDF parse error:', err);
    return null;
  }
}

// ─── Image → Base64 helper ───────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── #4 Countdown Timer Hook ─────────────────────────────────────────────────
// Parses "1:00 PM – 4:00 PM" and returns a live status string
function useOpenHouseCountdown(dateStr, timeStr) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function parse() {
      if (!timeStr) return '';
      // Try to extract start & end times from timeStr e.g. "1:00 PM – 4:00 PM"
      const m = timeStr.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:–|—|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
      if (!m) return '';

      function toDate(tstr) {
        const now = new Date();
        const d = new Date(now.toDateString() + ' ' + tstr.trim());
        return isNaN(d) ? null : d;
      }

      const start = toDate(m[1]);
      const end   = toDate(m[2]);
      if (!start || !end) return '';

      const now  = Date.now();
      const diff = start - now;
      const diffEnd = end - now;

      if (diffEnd < 0) return ''; // over
      if (diff > 0) {
        // hasn't started
        const totalMin = Math.floor(diff / 60000);
        const h = Math.floor(totalMin / 60);
        const min = totalMin % 60;
        if (h > 0) return `Starts in ${h}h ${min}m`;
        if (min > 0) return `Starts in ${min}m`;
        return 'Starting now!';
      }
      // in progress
      const totalMin = Math.floor(diffEnd / 60000);
      const h = Math.floor(totalMin / 60);
      const min = totalMin % 60;
      if (h > 0) return `Ends in ${h}h ${min}m`;
      if (min > 0) return `Ends in ${min}m`;
      return 'Ending soon!';
    }

    setLabel(parse());
    const interval = setInterval(() => setLabel(parse()), 30000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  return label;
}

// ─── #1 Toast System ─────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
          <div className="toast-icon">
            {t.type === 'success' ? <CheckCircle size={16}/> :
             t.type === 'lead'    ? <Bell size={16}/> :
             <AlertCircle size={16}/>}
          </div>
          <div className="toast-body">
            <p className="toast-title">{t.title}</p>
            {t.message && <p className="toast-msg">{t.message}</p>}
          </div>
          {t.action && (
            <a href={t.action.href} className="toast-action-btn">{t.action.label}</a>
          )}
          <button className="toast-close" onClick={() => onDismiss(t.id)}><X size={13}/></button>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), toast.duration || 5000);
    return id;
  }, []);
  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, push, dismiss };
}

// ─── #5 Dark Mode Hook ───────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => loadLocal('global', 'darkMode', false));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    saveLocal('global', 'darkMode', dark);
  }, [dark]);
  return [dark, setDark];
}

// ─── #10 Skeleton Rows ───────────────────────────────────────────────────────
function SkeletonRows({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skel skel-sm"/></td>
          <td>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="skel skel-avatar"/>
              <div className="skel skel-md"/>
            </div>
          </td>
          <td><div className="skel skel-lg"/></td>
          <td><div className="skel skel-sm"/></td>
          <td><div className="skel skel-pill"/></td>
          <td><div className="skel skel-sm"/></td>
          <td><div className="skel skel-md"/></td>
        </tr>
      ))}
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const listingId = getListingId();
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  const [dark, setDark] = useDarkMode();

  const [view, setView] = useState(
    new URLSearchParams(window.location.search).has('listing') ? 'signin' : 'home'
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [property, setProperty]   = useState(() => {
    const stored = loadLocal(listingId, 'property', DEFAULT_PROPERTY);
    // Migrate: backfill defaults that were added after initial release
    if (!stored.agent_brokerage) stored.agent_brokerage = DEFAULT_PROPERTY.agent_brokerage;
    if (!stored.agent_phone)     stored.agent_phone     = DEFAULT_PROPERTY.agent_phone;
    return stored;
  });
  const [docs, setDocs]           = useState(() => loadLocal(listingId, 'docs', DEFAULT_DOCS));
  const [leads, setLeads]         = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [signedInVisitor, setSignedInVisitor] = useState(null);
  const [allListings, setAllListings] = useState(() => loadLocal('global', 'listings', ['default']));

  useEffect(() => {
    document.documentElement.style.setProperty('--brand', property.brand_color || '#2563eb');
  }, [property.brand_color]);

  useEffect(() => { saveLocal(listingId, 'property', property); }, [property]);
  useEffect(() => { saveLocal(listingId, 'docs', docs); }, [docs]);

  useEffect(() => {
    if ((view === 'dashboard' || view === 'analytics') && authenticated) fetchLeads();
  }, [view, authenticated]);

  // ── #1 Supabase Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    if (!authenticated) return;
    const channel = supabase
      .channel(`leads-${listingId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'leads',
        filter: `listing_id=eq.${listingId}`
      }, (payload) => {
        const l = payload.new;
        setLeads(prev => [l, ...prev]);
        const interestLabel = {
          ready_to_buy: '✅ Ready to Buy', very_interested: '🔥 Very Interested',
          browsing: '🏘️ Browsing', just_looking: '👀 Just Looking'
        };
        pushToast({
          type: 'lead',
          title: `New sign-in: ${l.name}`,
          message: interestLabel[l.interest] || l.interest || '',
          action: l.phone ? { href: `tel:${l.phone}`, label: '📞 Call' } : undefined,
          duration: 7000,
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [authenticated, listingId]);

  const [dbError, setDbError] = useState(null);

  async function fetchLeads() {
    setLeadsLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('leads').select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });
      if (error) {
        setDbError(error.message || 'Supabase error');
        // Fall back to local leads
        const local = loadLocal(listingId, 'local_leads', []);
        setLeads(local);
      } else {
        setLeads(data || []);
        // Also merge any local leads that may have been saved while offline
        const local = loadLocal(listingId, 'local_leads', []);
        if (local.length > 0) {
          setLeads(prev => {
            const emails = new Set(prev.map(l => l.email?.toLowerCase()));
            const extras = local.filter(l => !emails.has(l.email?.toLowerCase()));
            return extras.length ? [...prev, ...extras] : prev;
          });
        }
      }
    } catch (e) {
      setDbError(e.message);
      const local = loadLocal(listingId, 'local_leads', []);
      setLeads(local);
    }
    setLeadsLoading(false);
  }

  async function submitLead(formData) {
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
    if (EMAILJS_ENABLED) {
      const interestLabels = {
        ready_to_buy:    '✅ Ready to Buy',
        very_interested: '🔥 Very Interested',
        browsing:        '🏘️ Actively Browsing',
        just_looking:    '👀 Just Looking',
      };
      const interestLabel = interestLabels[formData.interest] || formData.interest || 'Not specified';
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_AGENT_TEMPLATE, {
        agent_name: property.agent_name, agent_email: property.agent_email,
        visitor_name: formData.name, visitor_email: formData.email,
        visitor_phone: formData.phone || 'Not provided',
        interest: interestLabel,
        property: property.address, time: new Date().toLocaleString(),
      }, EMAILJS_PUBLIC_KEY).catch(() => {});
      if (formData.email) {
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_VISITOR_TEMPLATE, {
          visitor_name: formData.name, visitor_email: formData.email,
          agent_name: property.agent_name, agent_phone: property.agent_phone,
          agent_email: property.agent_email, property: property.address, price: property.price,
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

  // ── Router ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast}/>
      {view === 'home'        && <ListingsHome allListings={allListings} onAddListing={addListing} onSelect={() => {}} currentListing={listingId} onViewSignIn={() => setView('signin')}/>}
      {view === 'admin_login' && <AdminLogin password={property.admin_password} onSuccess={() => { setAuthenticated(true); setView('dashboard'); }} onBack={() => setView('signin')}/>}
      {view === 'dashboard'  && authenticated && <Dashboard property={property} leads={leads} loading={leadsLoading} dbError={dbError} listingId={listingId} onRefresh={fetchLeads} onSettings={() => setView('settings')} onQR={() => setView('qr')} onAnalytics={() => setView('analytics')} onLogout={logout} dark={dark} setDark={setDark}/>}
      {view === 'settings'   && authenticated && <SettingsPanel property={property} docs={docs} onSave={(p, d) => { setProperty(p); setDocs(d); setView('dashboard'); }} onBack={() => setView('dashboard')} dark={dark} setDark={setDark}/>}
      {view === 'qr'         && authenticated && <QRGenerator listingId={listingId} property={property} onBack={() => setView('dashboard')}/>}
      {view === 'analytics'  && authenticated && <Analytics leads={leads} property={property} onBack={() => setView('dashboard')}/>}
      {view === 'thankyou'   && <ThankYou visitor={signedInVisitor} property={property} docs={docs} onBack={() => { setSignedInVisitor(null); setView('signin'); }}/>}
      {view === 'signin'     && <SignInForm property={property} leads={leads} onSubmit={submitLead} onAdminClick={() => setView('admin_login')}/>}
    </>
  );
}

// ─── Listings Home ────────────────────────────────────────────────────────────
function ListingsHome({ allListings, onAddListing, onViewSignIn, currentListing }) {
  const [newId, setNewId] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function goSignIn(id) {
    const url = new URL(window.location.href);
    url.searchParams.set('listing', id);
    window.location.href = url.toString();
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
                  {/* #7 Nickname */}
                  {prop.nickname && <p className="listing-card-nickname"><Tag size={10}/> {prop.nickname}</p>}
                  <p className="listing-card-address">{prop.address}</p>
                  <p className="listing-card-city">{prop.city}</p>
                  <div className="listing-card-meta">
                    <span>{prop.price}</span>
                    {prop.bedrooms  && <span><Bed size={12}/> {prop.bedrooms}</span>}
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
              onKeyDown={e => { if (e.key === 'Enter') { onAddListing(newId); goSignIn(newId); }}}
              autoFocus
            />
            <button className="btn-primary-sm" onClick={() => { onAddListing(newId); goSignIn(newId); }}>
              <Plus size={14}/> Create &amp; Open
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
  const [form, setForm]     = useState({ name: '', email: '', phone: '', interest: 'browsing', first_time_buyer: false });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [alreadySeen, setAlreadySeen] = useState(false);

  // #4 countdown
  const countdown = useOpenHouseCountdown(property.open_house_date, property.open_house_time);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    return e;
  }

  function checkEmail(val) {
    if (!val) { setAlreadySeen(false); return; }
    setAlreadySeen(!!leads.find(l => l.email?.toLowerCase() === val.toLowerCase()));
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
      <div className="signin-hero" style={{ background: `linear-gradient(135deg, ${property.brand_color}cc 0%, ${property.brand_color} 100%)` }}>
        {property.hero_image && <img src={property.hero_image} alt="Property" className="hero-img"/>}
        <div className="hero-overlay">
          <div className="hero-top-row">
            <div className="hero-badge">Open House</div>
            {/* #3 Social proof badge */}
            {leads.length > 0 && (
              <div className="hero-social-proof">
                <Users size={12}/> {leads.length} {leads.length === 1 ? 'person has' : 'people have'} visited
              </div>
            )}
          </div>
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
            {/* #4 Live countdown */}
            {countdown && <span className="hero-countdown"><Timer size={12}/> {countdown}</span>}
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
          <div className="field-group">
            <label>Are you interested in purchasing?</label>
            <div className="interest-grid">
              {[
                { val: 'just_looking',    label: 'Just Looking',     icon: '👀' },
                { val: 'browsing',        label: 'Actively Browsing', icon: '🏘️' },
                { val: 'very_interested', label: 'Very Interested',  icon: '🔥' },
                { val: 'ready_to_buy',   label: 'Ready to Buy',     icon: '✅' },
              ].map(opt => (
                <button type="button" key={opt.val}
                  className={`interest-btn${form.interest === opt.val ? ' active' : ''}`}
                  onClick={() => setForm({...form, interest: opt.val})}>
                  <span className="interest-emoji">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
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
            {/* #8 Agent photo */}
            {property.agent_photo
              ? <img src={property.agent_photo} alt={property.agent_name} className="agent-avatar agent-photo-img"/>
              : <div className="agent-avatar" style={{ background: property.brand_color }}>{property.agent_name.charAt(0)}</div>
            }
            <div>
              <p className="agent-name">{property.agent_name}</p>
              <p className="agent-brokerage">{property.agent_brokerage}</p>
            </div>
            <div className="agent-contact">
              {property.agent_phone && (
                <a href={`tel:${property.agent_phone}`} className="contact-link"
                  onClick={e => e.stopPropagation()}>
                  <Phone size={14}/>
                </a>
              )}
              {property.agent_email && (
                <a href={`mailto:${property.agent_email}`} className="contact-link"
                  onClick={e => e.stopPropagation()}>
                  <Mail size={14}/>
                </a>
              )}
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

// ─── Doc Viewer (inline PDF / image with save-to-gallery) ────────────────────
function DocViewer({ doc, onActivity }) {
  const [expanded, setExpanded] = useState(true); // open by default so visitors see docs immediately
  const label = doc.label || doc.name || 'Document';
  const isImage = doc.type === 'image';
  const isPdf   = doc.type === 'pdf' || (!isImage && (doc.data || doc.url));
  const src     = doc.data || doc.url;

  // Determine if it's an uploaded file (base64) or an external URL
  const isBase64 = src && src.startsWith('data:');

  // "Save to Photos" — creates a temporary <a download> click
  async function saveToGallery(e) {
    e.stopPropagation();
    if (onActivity) onActivity();

    if (isBase64) {
      // Direct download from base64
      const a = document.createElement('a');
      a.href = src;
      a.download = doc.name || (isImage ? `${label}.jpg` : `${label}.pdf`);
      a.click();
      return;
    }

    // For external URLs — try fetch then download (may be blocked by CORS)
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = doc.name || label;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      // Fallback: just open in new tab
      window.open(src, '_blank');
    }
  }

  function toggle(e) {
    e.stopPropagation();
    if (onActivity) onActivity();
    setExpanded(x => !x);
  }

  return (
    <div className={`doc-viewer-card${expanded ? ' doc-viewer-card--open' : ''}`}>
      {/* Header row — always visible */}
      <div className="doc-viewer-header" onClick={toggle}>
        <div className="doc-viewer-icon">
          {isImage ? <Image size={18}/> : <FileText size={18}/>}
        </div>
        <span className="doc-viewer-label">{label}</span>
        <div className="doc-viewer-actions" onClick={e => e.stopPropagation()}>
          <button className="doc-save-btn" onClick={saveToGallery} title="Save to device">
            <Download size={14}/> Save
          </button>
          {!isBase64 && src && (
            <a className="doc-open-btn" href={src} target="_blank" rel="noopener noreferrer"
               onClick={e => { e.stopPropagation(); if (onActivity) onActivity(); }}>
              <Link size={14}/> Open
            </a>
          )}
        </div>
        <ChevronRight size={15} className={`doc-viewer-chevron${expanded ? ' doc-viewer-chevron--open' : ''}`}/>
      </div>

      {/* Expanded inline preview */}
      {expanded && src && (
        <div className="doc-viewer-body">
          {isImage ? (
            <img src={src} alt={label} className="doc-viewer-img"
              onError={e => { e.target.style.display='none'; }}/>
          ) : (
            <iframe
              src={isBase64 ? src : `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`}
              title={label}
              className="doc-viewer-iframe"
              frameBorder="0"
            />
          )}
        </div>
      )}
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

  const photos = property.photos
    ? property.photos.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="thankyou-page" onClick={handleActivity} onTouchStart={handleActivity}>
      <div className="thankyou-header" style={{ background: `linear-gradient(135deg, ${property.brand_color}dd, ${property.brand_color})` }}>
        <div className="check-circle"><Check size={28} strokeWidth={3}/></div>
        {visitor?.returning
          ? <><h2>Welcome back, {visitor?.name?.split(' ')[0]}!</h2><p>You're already signed in.</p></>
          : <><h2>Thanks, {visitor?.name?.split(' ')[0]}!</h2><p>You're signed in. Enjoy the open house!</p></>}
        <div className="countdown-wrap">
          <div className="countdown-bar" style={{ width: `${(countdown / RESET_SECONDS) * 100}%`, background: 'rgba(255,255,255,.85)' }}/>
        </div>
        <p className="countdown-label">Returning to sign-in in {countdown}s — tap anywhere to reset timer</p>
      </div>

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
        {docs?.filter(d => d.url || d.data).length > 0 && (
          <div className="docs-section">
            <h3 className="section-title"><FileText size={16}/> Documents &amp; Resources</h3>
            <div className="docs-viewer-list">
              {docs.filter(d => d.url || d.data).map((doc, i) => (
                <DocViewer key={i} doc={doc} onActivity={handleActivity}/>
              ))}
            </div>
          </div>
        )}
        {property.agent_name && (
          <div className="agent-card">
            {property.agent_photo
              ? <img src={property.agent_photo} alt={property.agent_name} className="agent-avatar large agent-photo-img"/>
              : <div className="agent-avatar large" style={{ background: property.brand_color }}>{property.agent_name.charAt(0)}</div>
            }
            <div className="agent-info">
              <p className="agent-name">{property.agent_name}</p>
              <p className="agent-brokerage">{property.agent_brokerage}</p>
              <div className="agent-links">
                {property.agent_phone && (
                  <a href={`tel:${property.agent_phone}`} className="btn-outline-sm"
                    onClick={e => e.stopPropagation()}>
                    <Phone size={13}/> {property.agent_phone}
                  </a>
                )}
                {property.agent_email && (
                  <a href={`mailto:${property.agent_email}`} className="btn-outline-sm"
                    onClick={e => e.stopPropagation()}>
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
function AdminLogin({ password: correctPassword, onSuccess, onBack }) {
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState('');

  function handleLogin(e) {
    e.preventDefault();
    if (password === correctPassword) onSuccess();
    else setError('Incorrect password');
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
function Dashboard({ property, leads, loading, dbError, listingId, onRefresh, onSettings, onQR, onAnalytics, onLogout, dark, setDark }) {
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
    { val: 'all',             label: 'All' },
    { val: 'ready_to_buy',   label: '✅ Ready' },
    { val: 'very_interested', label: '🔥 Hot' },
    { val: 'browsing',        label: '🏘️ Browsing' },
    { val: 'just_looking',   label: '👀 Looking' },
    { val: 'first_time',     label: '⭐ First-Time' },
  ];

  const filtered = leads.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'first_time') return l.first_time_buyer;
    return l.interest === filter;
  });

  const interestColor = { ready_to_buy: '#16a34a', very_interested: '#ea580c', browsing: '#2563eb', just_looking: '#64748b' };
  const interestLabel = { ready_to_buy: '✅ Ready to Buy', very_interested: '🔥 Very Interested', browsing: '🏘️ Browsing', just_looking: '👀 Just Looking' };

  // #6 Summary counts
  const summaryCounts = {
    hot:        leads.filter(l => l.interest === 'ready_to_buy' || l.interest === 'very_interested').length,
    browsing:   leads.filter(l => l.interest === 'browsing').length,
    looking:    leads.filter(l => l.interest === 'just_looking').length,
    firstTime:  leads.filter(l => l.first_time_buyer).length,
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo-badge" style={{ background: property.brand_color }}><Home size={18}/></div>
          <div>
            <h1 className="admin-title">
              {property.nickname || 'Dashboard'}
            </h1>
            <p className="admin-subtitle">{property.address} · {property.city}</p>
          </div>
        </div>
        <div className="admin-header-actions">
          {/* #5 Dark mode toggle */}
          <button className="btn-icon" title={dark ? 'Light mode' : 'Dark mode'} onClick={() => setDark(d => !d)}>
            {dark ? <Sun size={17}/> : <Moon size={17}/>}
          </button>
          <button className="btn-icon" title="Analytics" onClick={onAnalytics}><BarChart2 size={18}/></button>
          <button className="btn-icon" title="QR Code" onClick={onQR}><QrCode size={18}/></button>
          <button className="btn-icon" title="Settings" onClick={onSettings}><Settings size={18}/></button>
          <button className="btn-icon danger" title="Logout" onClick={onLogout}><LogOut size={18}/></button>
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
            <div><p className="stat-num">{leads.filter(l => l.interest === 'ready_to_buy' || l.interest === 'very_interested').length}</p><p className="stat-label">Hot Leads</p></div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#7c3aed' }}>
            <Star size={22} style={{ color: '#7c3aed' }}/>
            <div><p className="stat-num">{leads.filter(l => l.first_time_buyer).length}</p><p className="stat-label">First-Time Buyers</p></div>
          </div>
        </div>
        {dbError && (
          <div className="info-banner info-banner--error">
            <AlertCircle size={15}/>
            <span><strong>Database error:</strong> {dbError} — leads shown are from local storage only. Go to <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a> and make sure your project is active and the leads table exists.</span>
          </div>
        )}
        {!dbError && leads.length === 0 && !loading && (
          <div className="info-banner info-banner--ok">
            <CheckCircle size={15}/>
            <span>Database connected ✓ — No sign-ins yet for this listing.</span>
          </div>
        )}
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

          {/* #6 Interest summary bar */}
          {leads.length > 0 && (
            <div className="interest-summary-bar">
              {summaryCounts.hot       > 0 && <span className="isb-chip isb-hot"><span>🔥</span> {summaryCounts.hot} Hot</span>}
              {summaryCounts.browsing  > 0 && <span className="isb-chip isb-browsing"><span>🏘️</span> {summaryCounts.browsing} Browsing</span>}
              {summaryCounts.looking   > 0 && <span className="isb-chip isb-looking"><span>👀</span> {summaryCounts.looking} Looking</span>}
              {summaryCounts.firstTime > 0 && <span className="isb-chip isb-first"><span>⭐</span> {summaryCounts.firstTime} First-Time</span>}
            </div>
          )}

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
            // #10 Skeleton loading
            <div className="table-wrap">
              <table className="leads-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Interest</th><th>Notes</th><th>Signed In</th></tr>
                </thead>
                <tbody><SkeletonRows count={5}/></tbody>
              </table>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Users size={40} className="empty-icon"/><p>No leads yet</p></div>
          ) : (
            <div className="table-wrap">
              <table className="leads-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Interest</th><th>Notes</th><th>Signed In</th></tr>
                </thead>
                <tbody>
                  {/* #9 Staggered row animations */}
                  {filtered.map((l, i) => (
                    <tr key={l.id} className="lead-row" onClick={() => setSelectedLead(l)}
                      style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="lead-num">{i + 1}</td>
                      <td className="lead-name">
                        <div className="lead-avatar" style={{ background: property.brand_color }}>{l.name?.charAt(0)?.toUpperCase()}</div>
                        <div>{l.name}{l.first_time_buyer && <span className="ftb-badge">1st time</span>}</div>
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
                      <td>{l.notes ? <span className="has-note"><MessageSquare size={13}/></span> : <span className="add-note muted"><Plus size={12}/> note</span>}</td>
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

// ─── Lead Modal ───────────────────────────────────────────────────────────────
function LeadModal({ lead, brandColor, onClose, onSaveNote }) {
  const [note, setNote]     = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

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
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}`,
    count: leads.filter(l => new Date(l.created_at).getHours() === h).length
  })).filter((_, h) => leads.some(l => new Date(l.created_at).getHours() === h));

  const interestData = [
    { name: '✅ Ready',    count: leads.filter(l => l.interest === 'ready_to_buy').length },
    { name: '🔥 Hot',     count: leads.filter(l => l.interest === 'very_interested').length },
    { name: '🏘️ Browse',  count: leads.filter(l => l.interest === 'browsing').length },
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
            <Users size={22} style={{ color: property.brand_color }}/><div><p className="stat-num">{leads.length}</p><p className="stat-label">Total Leads</p></div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
            <CheckCircle size={22} style={{ color: '#16a34a' }}/><div><p className="stat-num">{hotLeads.length}</p><p className="stat-label">Hot Leads</p></div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#7c3aed' }}>
            <Star size={22} style={{ color: '#7c3aed' }}/><div><p className="stat-num">{firstTimers.length}</p><p className="stat-label">First-Time Buyers</p></div>
          </div>
        </div>
        {leads.length === 0 ? (
          <div className="analytics-empty"><BarChart2 size={48}/><p>No data yet — analytics will appear after visitors sign in.</p></div>
        ) : (
          <>
            {hourData.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">Sign-ins by Hour</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/>
                    <Tooltip/><Bar dataKey="count" fill={property.brand_color} radius={[4,4,0,0]}/>
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
                    <Tooltip/><Bar dataKey="count" fill={property.brand_color} radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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

// ─── MLS Analyzer Modal ───────────────────────────────────────────────────────
function MlsAnalyzer({ onApply, onClose, brandColor }) {
  const [mode, setMode]       = useState('paste');
  const [text, setText]       = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult]   = useState(null);
  const [applied, setApplied] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const FIELD_LABELS = {
    address: 'Street Address', city: 'City / State / ZIP', price: 'List Price',
    bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', sqft: 'Square Feet',
    description: 'Description', agent_name: 'Agent Name', agent_phone: 'Phone',
    agent_email: 'Email', agent_brokerage: 'Brokerage',
    open_house_date: 'Open House Date', open_house_time: 'Open House Time',
  };

  async function analyze() {
    const src = text.trim();
    if (!src) return;
    setParsing(true); setResult(null);
    await new Promise(r => setTimeout(r, 400));
    const parsed = parseMlsText(src);
    setResult(Object.keys(parsed).length ? parsed : {});
    setParsing(false);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setParsing(true); setResult(null); setText('');
    if (file.type === 'application/pdf') {
      const extracted = await extractTextFromPdf(file);
      if (extracted) {
        setText(extracted);
        const parsed = parseMlsText(extracted);
        setResult(Object.keys(parsed).length ? parsed : {});
      } else { setResult({}); }
    } else if (file.type.startsWith('image/')) {
      const b64 = await fileToBase64(file);
      setText(''); setResult(null); setMode('image_loaded'); setFileName(b64);
    }
    setParsing(false);
  }

  function handleApply() {
    if (!result || !Object.keys(result).length) return;
    onApply(result); setApplied(true);
    setTimeout(() => { setApplied(false); onClose(); }, 1200);
  }

  const fieldCount = result ? Object.keys(result).length : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mls-modal" onClick={e => e.stopPropagation()}>
        <div className="mls-modal-header" style={{ background: `linear-gradient(135deg, ${brandColor}dd, ${brandColor})` }}>
          <div className="mls-modal-title-row">
            <div className="mls-modal-icon"><Scan size={22}/></div>
            <div>
              <h2>MLS Info Sheet Analyzer</h2>
              <p>Paste MLS text, upload a PDF, or type in details — fields will auto-fill</p>
            </div>
            <button className="mls-close-btn" onClick={onClose}><X size={18}/></button>
          </div>
          <div className="mls-tabs">
            {[
              { id: 'paste', icon: <Clipboard size={14}/>, label: 'Paste Text' },
              { id: 'pdf',   icon: <FileText size={14}/>, label: 'Upload PDF' },
            ].map(m => (
              <button key={m.id}
                className={`mls-tab${mode === m.id || (mode === 'image_loaded' && m.id === 'pdf') ? ' active' : ''}`}
                onClick={() => { setMode(m.id); setResult(null); setText(''); setFileName(''); }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mls-modal-body">
          {mode === 'paste' && (
            <div className="mls-paste-area">
              <textarea rows={10} placeholder={`Paste your MLS listing info here…`}
                value={text} onChange={e => { setText(e.target.value); setResult(null); }} className="mls-textarea"/>
              <button className="btn-primary mls-analyze-btn" style={{ background: brandColor }}
                onClick={analyze} disabled={!text.trim() || parsing}>
                {parsing ? <><Loader size={15} className="spin"/> Analyzing…</> : <><Sparkles size={15}/> Analyze &amp; Fill Fields</>}
              </button>
            </div>
          )}
          {(mode === 'pdf' || mode === 'image_loaded') && (
            <div className="mls-upload-area">
              <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display:'none' }} onChange={handleFile}/>
              {!fileName || mode === 'pdf' ? (
                <div className="mls-drop-zone" onClick={() => fileRef.current?.click()}>
                  <Upload size={32} style={{ color: brandColor, opacity: .7 }}/>
                  <p className="mls-drop-title">Upload MLS PDF or Image</p>
                  <p className="mls-drop-sub">Click to browse • PDF text extracted automatically</p>
                  <button className="btn-outline-sm" type="button" style={{ marginTop:8 }} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                    <Upload size={13}/> Choose File
                  </button>
                </div>
              ) : mode === 'image_loaded' ? (
                <div className="mls-image-preview-wrap">
                  <img src={fileName} alt="Uploaded MLS" className="mls-image-preview"/>
                  <div className="mls-image-note">
                    <AlertCircle size={14}/>
                    <span>Image uploaded — please switch to <strong>Paste Text</strong> mode to enter details manually.</span>
                  </div>
                  <button className="btn-outline-sm" style={{ marginTop:8 }} onClick={() => { setMode('paste'); setFileName(''); }}>
                    Switch to Paste Text
                  </button>
                </div>
              ) : null}
              {parsing && <div className="mls-loading"><Loader size={20} className="spin" style={{ color: brandColor }}/> <span>Extracting text from PDF…</span></div>}
              {text && !parsing && mode !== 'image_loaded' && (
                <div className="mls-pdf-extracted">
                  <p className="mls-extracted-label"><CheckCircle size={13} style={{ color:'#16a34a' }}/> PDF text extracted — {text.length} characters</p>
                  <button className="btn-primary mls-analyze-btn" style={{ background: brandColor }} onClick={analyze} disabled={parsing}>
                    <Sparkles size={15}/> Analyze &amp; Fill Fields
                  </button>
                </div>
              )}
            </div>
          )}
          {result !== null && (
            <div className="mls-results">
              <div className={`mls-results-header ${fieldCount > 0 ? 'success' : 'warn'}`}>
                {fieldCount > 0
                  ? <><CheckCircle size={15}/> Found <strong>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</strong> — review &amp; apply below</>
                  : <><AlertCircle size={15}/> No recognizable fields detected</>
                }
              </div>
              {fieldCount > 0 && (
                <>
                  <div className="mls-fields-grid">
                    {Object.entries(result).map(([key, val]) => (
                      <div key={key} className="mls-field-row">
                        <span className="mls-field-label">{FIELD_LABELS[key] || key}</span>
                        <span className="mls-field-value">{val}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn-primary" style={{ background: brandColor, marginTop: 16 }} onClick={handleApply}>
                    {applied ? <><Check size={15}/> Applied!</> : <><Sparkles size={15}/> Apply {fieldCount} Field{fieldCount !== 1 ? 's' : ''} to Listing</>}
                  </button>
                  <p className="mls-apply-note">Only detected fields are updated — empty fields stay as-is.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Enhanced Photo Upload ────────────────────────────────────────────────────
function PhotoUploader({ photos, onChange, brandColor }) {
  const [urlInput, setUrlInput]   = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const [tab, setTab]             = useState('upload');
  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const list = photos;

  function addUrl() {
    const urls = urlInput.split('\n').map(s => s.trim()).filter(s => s.startsWith('http'));
    if (!urls.length) return;
    onChange([...list, ...urls]); setUrlInput('');
  }

  function removePhoto(idx) { onChange(list.filter((_, i) => i !== idx)); }

  async function addImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const b64 = await fileToBase64(file);
    onChange([...list, b64]);
  }

  async function handleFileInput(e) {
    const files = Array.from(e.target.files || []);
    for (const f of files) await addImageFile(f);
    e.target.value = '';
  }

  function handleDragOver(e) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave()  { setDragOver(false); }
  async function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    for (const f of files) await addImageFile(f);
    const items = Array.from(e.dataTransfer.items || []);
    for (const item of items) {
      if (item.kind === 'string' && item.type === 'text/uri-list') {
        item.getAsString(url => { if (url.startsWith('http')) onChange(prev => [...prev, url]); });
      }
    }
  }

  useEffect(() => {
    function handlePaste(e) {
      if (!dropRef.current) return;
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(i => i.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) { addImageFile(file); setPasteHint(true); setTimeout(() => setPasteHint(false), 2000); }
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="photo-uploader">
      <div className="photo-upload-tabs">
        <button className={`photo-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}
          style={tab === 'upload' ? { color: brandColor, borderBottomColor: brandColor } : {}}>
          <Upload size={13}/> Upload / Paste
        </button>
        <button className={`photo-tab${tab === 'url' ? ' active' : ''}`} onClick={() => setTab('url')}
          style={tab === 'url' ? { color: brandColor, borderBottomColor: brandColor } : {}}>
          <Link size={13}/> Add by URL
        </button>
      </div>
      {tab === 'upload' && (
        <div ref={dropRef} className={`photo-drop-zone${dragOver ? ' drag-over' : ''}`}
          style={dragOver ? { borderColor: brandColor, background: `color-mix(in srgb, ${brandColor} 6%, white)` } : {}}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileInput}/>
          <Camera size={28} style={{ color: brandColor, opacity: .6 }}/>
          <p className="photo-drop-title">Drop photos here, click to browse, or paste a screenshot</p>
          <p className="photo-drop-sub"><kbd>Ctrl+V</kbd> / <kbd>⌘+V</kbd> to paste · JPG, PNG, WEBP supported</p>
          {pasteHint && <div className="paste-success"><CheckCircle size={14}/> Screenshot pasted!</div>}
        </div>
      )}
      {tab === 'url' && (
        <div className="photo-url-area">
          <textarea rows={4} placeholder={"https://example.com/photo1.jpg\n\nOne URL per line"}
            value={urlInput} onChange={e => setUrlInput(e.target.value)} className="photo-url-textarea"/>
          <button className="btn-primary-sm" style={{ background: brandColor }} onClick={addUrl} disabled={!urlInput.trim()}>
            <Plus size={14}/> Add URLs
          </button>
        </div>
      )}
      {list.length > 0 && (
        <div className="photo-thumb-grid">
          {list.map((src, i) => (
            <div key={i} className="photo-thumb-item">
              <img src={src} alt={`Photo ${i + 1}`} className="photo-thumb-img" onError={e => { e.target.style.opacity = '0.3'; }}/>
              <button className="photo-thumb-remove" onClick={() => removePhoto(i)} title="Remove"><X size={12}/></button>
              {i === 0 && <span className="photo-thumb-hero-badge">Hero</span>}
            </div>
          ))}
          <div className="photo-thumb-add" onClick={() => { setTab('upload'); fileRef.current?.click(); }}
            style={{ borderColor: brandColor, color: brandColor }}>
            <Plus size={20}/><span>Add</span>
          </div>
        </div>
      )}
      {list.length > 0 && <p className="photo-count-note">{list.length} photo{list.length !== 1 ? 's' : ''} · First photo is used as the hero banner</p>}
    </div>
  );
}

// ─── #8 Agent Photo Uploader ──────────────────────────────────────────────────
function AgentPhotoUploader({ value, onChange, brandColor }) {
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const b64 = await fileToBase64(file);
    onChange(b64);
    e.target.value = '';
  }

  return (
    <div className="agent-photo-uploader">
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
      {value ? (
        <div className="agent-photo-preview-wrap">
          <img src={value} alt="Agent" className="agent-photo-preview"/>
          <div className="agent-photo-actions">
            <button className="btn-outline-sm" onClick={() => fileRef.current?.click()}><Upload size={12}/> Change</button>
            <button className="btn-outline-sm danger" onClick={() => onChange('')}><X size={12}/> Remove</button>
          </div>
        </div>
      ) : (
        <div className="agent-photo-drop" onClick={() => fileRef.current?.click()} style={{ borderColor: brandColor }}>
          <UserCircle size={36} style={{ color: brandColor, opacity: .5 }}/>
          <p className="agent-photo-drop-title">Upload headshot</p>
          <p className="agent-photo-drop-sub">Click to browse · JPG or PNG · Shown on sign-in page</p>
        </div>
      )}
    </div>
  );
}

// ─── Doc Upload Row ───────────────────────────────────────────────────────────
// Each doc: { label, url, data (base64), type ('pdf'|'image'|'url'), name }
function DocUploadRow({ doc, onChange, onRemove }) {
  const fileRef  = useRef(null);
  const [mode, setMode] = useState(doc.data ? 'file' : 'url');
  const [loading, setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target.result; // data:application/pdf;base64,...
      const type = file.type.startsWith('image/') ? 'image' : 'pdf';
      onChange('data',  data);
      onChange('type',  type);
      onChange('name',  file.name);
      if (!doc.label) onChange('label', file.name.replace(/\.[^.]+$/, ''));
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  function clearFile() {
    onChange('data', '');
    onChange('type', 'url');
    onChange('name', '');
    setMode('url');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="doc-upload-row">
      {/* Label */}
      <input
        className="doc-label-input"
        placeholder="Label (e.g. MLS Sheet, Floor Plan)"
        value={doc.label || ''}
        onChange={e => onChange('label', e.target.value)}
      />

      {/* Mode toggle */}
      <div className="doc-mode-tabs">
        <button type="button"
          className={`doc-mode-tab${mode === 'file' ? ' active' : ''}`}
          onClick={() => setMode('file')}>
          <Upload size={12}/> Upload File
        </button>
        <button type="button"
          className={`doc-mode-tab${mode === 'url' ? ' active' : ''}`}
          onClick={() => setMode('url')}>
          <Link size={12}/> URL Link
        </button>
      </div>

      {mode === 'file' ? (
        doc.data ? (
          <div className="doc-file-preview">
            {doc.type === 'image'
              ? <img src={doc.data} alt={doc.name} className="doc-thumb"/>
              : <div className="doc-pdf-chip"><FileText size={14}/> {doc.name || 'PDF'}</div>
            }
            <button type="button" className="btn-outline-sm danger" onClick={clearFile}>
              <X size={12}/> Remove
            </button>
          </div>
        ) : (
          <div className="doc-drop-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{display:'none'}} onChange={handleFile}/>
            {loading
              ? <><Loader size={16} className="spin"/> Processing…</>
              : <><Upload size={16}/> Click to upload PDF or image</>
            }
          </div>
        )
      ) : (
        <input
          className="doc-url-input"
          placeholder="https://drive.google.com/…"
          value={doc.url || ''}
          onChange={e => onChange('url', e.target.value)}
        />
      )}

      <button className="btn-icon danger" onClick={onRemove}><Trash2 size={15}/></button>
    </div>
  );
}

// ─── iOS-style Wheel Picker ───────────────────────────────────────────────────
const ITEM_H = 44; // px per item row

function WheelColumn({ items, selectedIndex, onChange }) {
  const listRef    = useRef(null);
  const isDragging = useRef(false);
  const startY     = useRef(0);
  const startScrollTop = useRef(0);
  const animRef    = useRef(null);
  const lastCommitted = useRef(selectedIndex);

  function clamp(v) { return Math.max(0, Math.min(items.length - 1, v)); }

  // Convert scrollTop → nearest item index (padding already handled by CSS)
  function scrollToIdx(st) { return clamp(Math.round(st / ITEM_H)); }

  // Snap scroll position to nearest item and fire onChange if changed
  function snapToNearest(el) {
    clearTimeout(animRef.current);
    const idx = scrollToIdx(el.scrollTop);
    // Smooth-snap to exact position
    el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    if (idx !== lastCommitted.current) {
      lastCommitted.current = idx;
      onChange(idx);
    }
  }

  // Initialise scroll position (no smooth — instant on mount)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = selectedIndex * ITEM_H;
    lastCommitted.current = selectedIndex;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If parent changes selectedIndex externally, jump to it
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (selectedIndex === lastCommitted.current) return;
    el.scrollTo({ top: selectedIndex * ITEM_H, behavior: 'smooth' });
    lastCommitted.current = selectedIndex;
  }, [selectedIndex]);

  // Native scroll (mouse wheel / trackpad / momentum)
  function onScroll(e) {
    clearTimeout(animRef.current);
    animRef.current = setTimeout(() => snapToNearest(e.target), 150);
  }

  // ── Touch drag ──────────────────────────────────────────────────────────────
  function onTouchStart(e) {
    startY.current         = e.touches[0].clientY;
    startScrollTop.current = listRef.current.scrollTop;
    isDragging.current     = true;
    clearTimeout(animRef.current);
  }
  function onTouchMove(e) {
    if (!isDragging.current) return;
    e.preventDefault(); // stop page scroll while dragging wheel
    const delta = startY.current - e.touches[0].clientY;
    listRef.current.scrollTop = startScrollTop.current + delta;
  }
  function onTouchEnd() {
    if (!isDragging.current) return;
    isDragging.current = false;
    snapToNearest(listRef.current);
  }

  // ── Mouse drag (desktop) ────────────────────────────────────────────────────
  function onMouseDown(e) {
    startY.current         = e.clientY;
    startScrollTop.current = listRef.current.scrollTop;
    isDragging.current     = true;
    clearTimeout(animRef.current);
    e.preventDefault();
  }
  function onMouseMove(e) {
    if (!isDragging.current) return;
    const delta = startY.current - e.clientY;
    listRef.current.scrollTop = startScrollTop.current + delta;
  }
  function onMouseUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    snapToNearest(listRef.current);
  }

  return (
    <div className="wc-col"
      onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <div
        ref={listRef}
        className="wc-list"
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={`wc-item${i === selectedIndex ? ' wc-item--sel' : ''}`}
            onClick={() => {
              listRef.current.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
              lastCommitted.current = i;
              onChange(i);
            }}
          >{item}</div>
        ))}
      </div>
      {/* selection highlight bar */}
      <div className="wc-highlight" aria-hidden/>
      {/* fade masks */}
      <div className="wc-fade wc-fade--top"    aria-hidden/>
      <div className="wc-fade wc-fade--bottom" aria-hidden/>
    </div>
  );
}

// ── Date Wheel Picker ────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}
function buildDayItems() { return Array.from({length:31}, (_,i) => ordinal(i+1)); }

// Parse "Saturday, Jan 25th" → { dayIdx, monthIdx, dayOfMonth }
function parseDateStr(str) {
  const parts = (str || '').split(/,\s*/);
  let dayIdx = 0, monthIdx = 0, dom = 1;
  if (parts[0]) {
    const d = DAYS_OF_WEEK.findIndex(d => d.toLowerCase() === parts[0].toLowerCase());
    if (d !== -1) dayIdx = d;
  }
  if (parts[1]) {
    const mParts = parts[1].trim().split(/\s+/);
    const m = MONTHS.findIndex(m => m.toLowerCase() === (mParts[0]||'').toLowerCase());
    if (m !== -1) monthIdx = m;
    const dayNum = parseInt(mParts[1]);
    if (!isNaN(dayNum)) dom = Math.max(1, Math.min(31, dayNum));
  }
  return { dayIdx, monthIdx, dom };
}
function formatDateStr(dayIdx, monthIdx, dom) {
  return `${DAYS_OF_WEEK[dayIdx]}, ${MONTHS[monthIdx]} ${ordinal(dom)}`;
}

function DateWheelPicker({ value, onChange }) {
  const parsed = parseDateStr(value);
  const [dayIdx,   setDayIdx]   = useState(parsed.dayIdx);
  const [monthIdx, setMonthIdx] = useState(parsed.monthIdx);
  const [dom,      setDom]      = useState(parsed.dom - 1); // 0-based index

  function emit(d, m, dy) {
    onChange(formatDateStr(d, m, dy + 1));
  }

  return (
    <div className="wc-picker">
      <WheelColumn items={DAYS_OF_WEEK} selectedIndex={dayIdx}
        onChange={i => { setDayIdx(i); emit(i, monthIdx, dom); }}/>
      <WheelColumn items={MONTHS} selectedIndex={monthIdx}
        onChange={i => { setMonthIdx(i); emit(dayIdx, i, dom); }}/>
      <WheelColumn items={buildDayItems()} selectedIndex={dom}
        onChange={i => { setDom(i); emit(dayIdx, monthIdx, i); }}/>
    </div>
  );
}

// ── Time Range Wheel Picker ──────────────────────────────────────────────────
const HOURS   = Array.from({length:12}, (_,i) => String(i+1));   // 1-12
const MINUTES = Array.from({length:12}, (_,i) => String(i*5).padStart(2,'0')); // 00,05,…55
const MERIDS   = ['AM','PM'];

// Parse "1:00 PM – 4:00 PM" → { sH, sM, sAP, eH, eM, eAP }
function parseTimeStr(str) {
  const def = { sH:0, sM:0, sAP:1, eH:2, eM:0, eAP:1 };
  if (!str) return def;
  const m = str.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)\s*(?:–|—|-|to)\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  if (!m) return def;
  function hIdx(h) { const n = parseInt(h); return Math.max(0, (n === 12 ? 0 : n) - 1); }
  function mIdx(mm) { if (!mm) return 0; const n = parseInt(mm); return Math.max(0, MINUTES.findIndex(x => parseInt(x) >= n)); }
  function apIdx(ap) { return ap.toUpperCase() === 'PM' ? 1 : 0; }
  return {
    sH: hIdx(m[1]), sM: mIdx(m[2]), sAP: apIdx(m[3]),
    eH: hIdx(m[4]), eM: mIdx(m[5]), eAP: apIdx(m[6]),
  };
}
function formatTimeStr(sH, sM, sAP, eH, eM, eAP) {
  const sh = HOURS[sH], sm = MINUTES[sM], sa = MERIDS[sAP];
  const eh = HOURS[eH], em = MINUTES[eM], ea = MERIDS[eAP];
  return `${sh}:${sm} ${sa} – ${eh}:${em} ${ea}`;
}

function TimeRangeWheelPicker({ value, onChange }) {
  const parsed = parseTimeStr(value);
  const [sH,  setSH]  = useState(parsed.sH);
  const [sM,  setSM]  = useState(parsed.sM);
  const [sAP, setSAP] = useState(parsed.sAP);
  const [eH,  setEH]  = useState(parsed.eH);
  const [eM,  setEM]  = useState(parsed.eM);
  const [eAP, setEAP] = useState(parsed.eAP);

  function emit(sh, sm, sap, eh, em, eap) {
    onChange(formatTimeStr(sh, sm, sap, eh, em, eap));
  }

  return (
    <div className="wc-time-wrap">
      <div className="wc-time-label">Start</div>
      <div className="wc-picker wc-picker--time">
        <WheelColumn items={HOURS}  selectedIndex={sH}  onChange={i=>{setSH(i);  emit(i,sM,sAP,eH,eM,eAP);}}/>
        <div className="wc-sep">:</div>
        <WheelColumn items={MINUTES} selectedIndex={sM} onChange={i=>{setSM(i);  emit(sH,i,sAP,eH,eM,eAP);}}/>
        <WheelColumn items={MERIDS} selectedIndex={sAP} onChange={i=>{setSAP(i); emit(sH,sM,i,eH,eM,eAP);}}/>
      </div>
      <div className="wc-time-dash">–</div>
      <div className="wc-time-label">End</div>
      <div className="wc-picker wc-picker--time">
        <WheelColumn items={HOURS}  selectedIndex={eH}  onChange={i=>{setEH(i);  emit(sH,sM,sAP,i,eM,eAP);}}/>
        <div className="wc-sep">:</div>
        <WheelColumn items={MINUTES} selectedIndex={eM} onChange={i=>{setEM(i);  emit(sH,sM,sAP,eH,i,eAP);}}/>
        <WheelColumn items={MERIDS} selectedIndex={eAP} onChange={i=>{setEAP(i); emit(sH,sM,sAP,eH,eM,i);}}/>
      </div>
    </div>
  );
}

// ── Wheel Picker Field (trigger button + inline expanded picker) ──────────────
function WheelPickerField({ label, displayValue, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field-group">
      <label>{label}</label>
      <button type="button" className="wp-trigger" onClick={() => setOpen(o => !o)}>
        <span>{displayValue || <span className="wp-placeholder">Tap to set</span>}</span>
        <ChevronRight size={15} className={`wp-chevron${open?' wp-chevron--open':''}`}/>
      </button>
      {open && (
        <div className="wp-panel">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ property, docs, onSave, onBack, dark, setDark }) {
  const [p, setP]             = useState({ ...property });
  const [d, setD]             = useState(docs.length ? [...docs] : [{ label: '', url: '' }]);
  const [saved, setSaved]     = useState(false);
  const [tab, setTab]         = useState('property');
  const [showMls, setShowMls] = useState(false);

  function updateDoc(i, field, val) { const nd=[...d]; nd[i]={...nd[i],[field]:val}; setD(nd); }
  function addDoc()    { setD([...d, { label: '', url: '' }]); }
  function removeDoc(i){ setD(d.filter((_,idx) => idx !== i)); }

  function handleSave() {
    onSave(p, d.filter(doc => doc.label || doc.url || doc.data));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const photoList = p.photos ? p.photos.split(',').map(s => s.trim()).filter(Boolean) : [];
  function handlePhotosChange(newList) {
    setP({ ...p, photos: newList.join(','), hero_image: newList[0] || '' });
  }

  function applyMlsFields(fields) {
    setP(prev => ({ ...prev, ...fields }));
    setShowMls(false); setTab('property');
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
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* #5 Dark mode toggle in settings too */}
          <button className="btn-icon" title={dark ? 'Light mode' : 'Dark mode'} onClick={() => setDark(d => !d)}>
            {dark ? <Sun size={17}/> : <Moon size={17}/>}
          </button>
          <button className="btn-mls-trigger" style={{ borderColor: p.brand_color, color: p.brand_color }} onClick={() => setShowMls(true)}>
            <Scan size={14}/> MLS Auto-Fill
          </button>
          <button className="btn-primary-sm" style={{ background: p.brand_color }} onClick={handleSave}>
            {saved ? <><Check size={14}/> Saved!</> : <><Save size={14}/> Save</>}
          </button>
        </div>
      </header>

      {showMls && <MlsAnalyzer brandColor={p.brand_color} onApply={applyMlsFields} onClose={() => setShowMls(false)}/>}

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

        {/* ── Property Tab ── */}
        {tab === 'property' && (
          <div className="settings-section">
            <div className="mls-hint-banner" onClick={() => setShowMls(true)} style={{ borderColor: p.brand_color }}>
              <Sparkles size={14} style={{ color: p.brand_color }}/>
              <span>Have an MLS sheet? Click <strong>MLS Auto-Fill</strong> in the header to auto-populate these fields.</span>
              <ChevronRight size={13} style={{ color: p.brand_color, marginLeft:'auto' }}/>
            </div>
            <div className="settings-grid">
              {/* #7 Nickname */}
              <div className="field-group full">
                <label><Tag size={12}/> Listing Nickname <span className="optional">(internal label)</span></label>
                <input value={p.nickname || ''} onChange={e=>setP({...p,nickname:e.target.value})} placeholder="e.g. Blue House on Main, Lakefront Property…"/>
              </div>
              <div className="field-group"><label>Street Address</label><input value={p.address} onChange={e=>setP({...p,address:e.target.value})} placeholder="1234 Main St"/></div>
              <div className="field-group"><label>City, State ZIP</label><input value={p.city} onChange={e=>setP({...p,city:e.target.value})} placeholder="Flagstaff, AZ 86001"/></div>
              <div className="field-group"><label>List Price</label><input value={p.price} onChange={e=>setP({...p,price:e.target.value})} placeholder="$450,000"/></div>
              <div className="field-group"><label>Bedrooms</label><input value={p.bedrooms} onChange={e=>setP({...p,bedrooms:e.target.value})} placeholder="3"/></div>
              <div className="field-group"><label>Bathrooms</label><input value={p.bathrooms} onChange={e=>setP({...p,bathrooms:e.target.value})} placeholder="2"/></div>
              <div className="field-group"><label>Square Footage</label><input value={p.sqft} onChange={e=>setP({...p,sqft:e.target.value})} placeholder="2,100"/></div>
              <div className="field-group full"><label>Description / Remarks</label><textarea rows={3} value={p.description} onChange={e=>setP({...p,description:e.target.value})}/></div>
              <WheelPickerField label={<><Calendar size={12}/> Open House Date</>} displayValue={p.open_house_date}>
                <DateWheelPicker value={p.open_house_date} onChange={v => setP({...p, open_house_date: v})}/>
              </WheelPickerField>
              <WheelPickerField label={<><Clock size={12}/> Open House Time</>} displayValue={p.open_house_time}>
                <TimeRangeWheelPicker value={p.open_house_time} onChange={v => setP({...p, open_house_time: v})}/>
              </WheelPickerField>
            </div>
          </div>
        )}

        {/* ── Agent Tab ── */}
        {tab === 'agent' && (
          <div className="settings-section">
            <h3 className="settings-section-title"><UserCircle size={15}/> Agent Headshot</h3>
            <p className="settings-hint">Your photo appears on the sign-in page and thank-you screen.</p>
            <AgentPhotoUploader value={p.agent_photo || ''} onChange={v => setP({...p, agent_photo: v})} brandColor={p.brand_color}/>
            <div className="settings-grid" style={{ marginTop: 20 }}>
              <div className="field-group"><label>Agent Name</label><input value={p.agent_name} onChange={e=>setP({...p,agent_name:e.target.value})} placeholder="Austin Prettyman"/></div>
              <div className="field-group"><label>Brokerage</label><input value={p.agent_brokerage} onChange={e=>setP({...p,agent_brokerage:e.target.value})} placeholder="Premier Realty"/></div>
              <div className="field-group"><label>Phone</label><input value={p.agent_phone} onChange={e=>setP({...p,agent_phone:e.target.value})} placeholder="928-710-8027"/></div>
              <div className="field-group"><label>Email</label><input value={p.agent_email} onChange={e=>setP({...p,agent_email:e.target.value})} placeholder="austinprettyman9@gmail.com"/></div>
            </div>
          </div>
        )}

        {/* ── Docs Tab ── */}
        {tab === 'docs' && (
          <div className="settings-section">
            <div className="settings-section-header">
              <div>
                <p className="settings-hint" style={{marginBottom:2}}>Upload PDFs or images — they display inline after sign-in and visitors can save them to their photo gallery.</p>
                <p className="settings-hint" style={{fontSize:'0.72rem',color:'var(--slate-xs)'}}>Files are stored locally. Keep PDFs under 2 MB each for best performance.</p>
              </div>
              <button className="btn-outline-sm" onClick={addDoc}><Plus size={13}/> Add Doc</button>
            </div>
            {d.map((doc, i) => (
              <DocUploadRow key={i} doc={doc}
                onChange={(field, val) => updateDoc(i, field, val)}
                onRemove={() => removeDoc(i)}/>
            ))}
          </div>
        )}

        {/* ── Photos Tab ── */}
        {tab === 'photos' && (
          <div className="settings-section">
            <PhotoUploader photos={photoList} onChange={handlePhotosChange} brandColor={p.brand_color}/>
          </div>
        )}

        {/* ── Branding Tab ── */}
        {tab === 'branding' && (
          <div className="settings-section">
            <h3 className="settings-section-title"><Palette size={15}/> Brand Color</h3>
            <p className="settings-hint">This color is used throughout the app — buttons, header, accents.</p>
            <div className="color-grid">
              {BRAND_COLORS.map(c => (
                <button key={c.value} className={`color-swatch${p.brand_color === c.value ? ' active' : ''}`}
                  style={{ background: c.value }} onClick={() => setP({...p, brand_color: c.value})} title={c.name}>
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

        {/* ── Security Tab ── */}
        {tab === 'security' && (
          <div className="settings-section">
            <h3 className="settings-section-title"><Lock size={15}/> Change Admin Password</h3>
            <p className="settings-hint">Update the password used to access the admin dashboard.</p>
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
  const qrRef  = useRef(null);
  const base   = window.location.origin + window.location.pathname;
  const [customListing, setCustomListing] = useState(listingId === 'default' ? '' : listingId);
  const [finalUrl, setFinalUrl]           = useState(listingId === 'default' ? base : `${base}?listing=${listingId}`);
  const [qrSize, setQrSize]               = useState(256);
  // #2 Copy link state
  const [copied, setCopied] = useState(false);

  function regenerate() {
    const id = customListing.trim() || 'default';
    setFinalUrl(id === 'default' ? base : `${base}?listing=${id}`);
  }

  // #2 Copy sign-in link
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = finalUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          {/* #2 URL + copy row */}
          <div className="qr-url-row">
            <p className="qr-url-label">{finalUrl}</p>
            <button className={`qr-copy-btn${copied ? ' copied' : ''}`} onClick={copyLink}
              style={copied ? { background: '#f0fdf4', borderColor: '#86efac', color: '#166534' } : { borderColor: property.brand_color, color: property.brand_color }}>
              {copied ? <><Check size={13}/> Copied!</> : <><Copy size={13}/> Copy Link</>}
            </button>
          </div>
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
