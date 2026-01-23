import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Download,
  Users,
  Eye,
  EyeOff,
  Check,
  Phone,
  Mail,
  Settings,
  Save,
  X,
  LogOut
} from 'lucide-react';

// Supabase configuration
const supabaseUrl = 'https://lubctieveoskgrddipsw.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YmN0aWV2ZW9za2dyZGRpcHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzEwMTIsImV4cCI6MjA1MjYwNzAxMn0.3MiOi1zdXBhYmFzZSIsInJlZiI6Imx1YmN0aWV2ZW9za2dyZGRpcHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzEwMTIsImV4cCI6MjA1MjYwNzAxMn0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const ADMIN_PASSWORD = 'openhouse2026';

export default function App() {
  const [currentView, setCurrentView] = useState('form');
  const [authenticated, setAuthenticated] = useState(false);
  const [listingId] = useState('default');
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    setPropertyInfo({
      address: '1234 Main Street',
      city: 'Flagstaff, AZ',
      price: '$450,000',
      bedrooms: 3,
      bathrooms: 2,
      sqft: '2,100',
      description: 'Beautiful home in a quiet neighborhood',
      open_house_date: 'Saturday, Jan 25th',
      open_house_time: '1:00 PM - 4:00 PM'
    });
  }, []);

  useEffect(() => {
    if (currentView === 'dashboard' && authenticated) {
      loadLeads();
    }
  }, [currentView, authenticated]);

  const loadLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false }); // FIX IS HERE

    if (!error) setLeads(data || []);
  };

  /* ---------------- ADMIN LOGIN ---------------- */

  const AdminLogin = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e) => {
      e.preventDefault();
      if (password === ADMIN_PASSWORD) {
        setAuthenticated(true);
        setCurrentView('dashboard');
      } else {
        setError('Incorrect password');
      }
    };

    return (
      <div style={{ minHeight: '100vh', background: '#1e293b', display: 'grid', placeItems: 'center' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: 40, borderRadius: 12, width: 320 }}>
          <h2>Admin Dashboard</h2>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 12, marginBottom: 10 }}
          />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" style={{ width: '100%' }}>
            Login
          </button>
          <button type="button" onClick={() => setCurrentView('form')} style={{ marginTop: 10 }}>
            ← Back
          </button>
        </form>
      </div>
    );
  };

  /* ---------------- ADMIN DASHBOARD ---------------- */

  const AdminDashboard = () => {
    const exportToCSV = () => {
      if (!leads.length) return alert('No leads');

      const rows = [
        ['Name', 'Email', 'Phone', 'Date'],
        ...leads.map(l => [
          l.name,
          l.email,
          l.phone || 'N/A',
          new Date(l.created_at).toLocaleString()
        ])
      ];

      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'open-house-leads.csv';
      a.click();
    };

    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <header style={{ background: 'white', padding: 24, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h1>Dashboard</h1>
            <p>{propertyInfo?.address}</p>
          </div>
          <button onClick={() => { setAuthenticated(false); setCurrentView('form'); }}>
            <LogOut size={16} /> Logout
          </button>
        </header>

        <main style={{ padding: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <Users /> Total Leads: {leads.length}
          </div>

          <button onClick={exportToCSV} disabled={!leads.length}>
            <Download size={16} /> Export CSV
          </button>

          {leads.length === 0 ? (
            <p style={{ marginTop: 40 }}>No leads yet</p>
          ) : (
            <table style={{ width: '100%', marginTop: 20 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{l.email}</td>
                    <td>{l.phone || 'N/A'}</td>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    );
  };

  /* ---------------- ROUTER ---------------- */

  if (currentView === 'login') return <AdminLogin />;
  if (currentView === 'dashboard') return authenticated ? <AdminDashboard /> : <AdminLogin />;

  /* ---------------- SIGN-IN FORM (UNCHANGED) ---------------- */

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <button onClick={() => setCurrentView('login')}>Admin Dashboard</button>
    </div>
  );
}
