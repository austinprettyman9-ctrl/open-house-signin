import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, Users, Eye, EyeOff, Check, Phone, Mail, Home, Settings, Save, X, LogOut } from 'lucide-react';

// Supabase configuration
const supabaseUrl = 'https://lubctieveoskgrddipsw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YmN0aWV2ZW9za2dyZGRpcHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzEwMTIzLCJleHAiOjIwNTI2MDcwMTJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YmN0aWV2ZW9za2dyZGRpcHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzEwMTIsImV4cCI6MjA1MjYwNzAxMn0.3MiOi1zdXBhYmFzZSIsInJlZiI6Imx1YmN0aWV2ZW9za2dyZGRpcHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzEwMTIsImV4cCI6MjA1MjYwNzAxMn0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_PASSWORD = 'openhouse2026';

export default function App() {
  const [currentView, setCurrentView] = useState('form');
  const [authenticated, setAuthenticated] = useState(false);
  const [listingId, setListingId] = useState('default');
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [leads, setLeads] = useState([]);
  
  // Load current listing info on mount
  useEffect(() => {
    loadPropertyInfo();
  }, []);

  // Load leads when viewing dashboard
  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { currentView, authenticated, listingId });
    if (currentView === 'dashboard' && authenticated) {
      console.log('Calling loadLeads...');
      loadLeads();
    }
  }, [currentView, authenticated, listingId]);

  const loadPropertyInfo = () => {
    // For now, hardcoded. In production, this would come from a database
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
  };

  const loadLeads = async () => {
    try {
      console.log('=== LOADING LEADS ===');
      console.log('Fetching leads for listing_id:', listingId);
      console.log('Supabase URL:', supabaseUrl);
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      console.log('Supabase response - data:', data);
      console.log('Supabase response - error:', error);

      if (error) {
        console.error('Error loading leads:', error);
        alert(`Error loading leads: ${error.message}`);
        return;
      }

      console.log('Successfully loaded leads, count:', data?.length || 0);
      setLeads(data || []);
    } catch (err) {
      console.error('Exception while loading leads:', err);
      alert(`Exception: ${err.message}`);
    }
  };

  // Sign-in form component
  const SignInForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      consent: false
    });
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Validation
      const newErrors = {};
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (!formData.consent) newErrors.consent = 'You must agree to receive information';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        const { error } = await supabase
          .from('leads')
          .insert([
            {
              listing_id: listingId,
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: formData.phone.trim() || null,
              consent: formData.consent,
              created_at: new Date().toISOString()
            }
          ]);

        if (error) {
          console.error('Error saving lead:', error);
          alert('There was an error submitting your information. Please try again.');
          return;
        }

        setSubmitted(true);
      } catch (err) {
        console.error('Error:', err);
        alert('There was an error submitting your information. Please try again.');
      }
    };

    if (submitted) {
      return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxWidth: '500px', width: '100%', padding: '40px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Check size={32} color="white" />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>Thank You!</h2>
            <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.6' }}>
              We've received your information and will send you property details shortly. Enjoy the rest of the open house!
            </p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxWidth: '500px', width: '100%', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', padding: '32px', textAlign: 'center', color: 'white' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>Welcome!</h1>
            <p style={{ fontSize: '16px', margin: '0', opacity: 0.9 }}>Please sign in to receive property information</p>
          </div>

          <div style={{ padding: '32px 24px' }}>
            {propertyInfo && (
              <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: '600' }}>Open House</p>
                    <p style={{ fontSize: '15px', color: '#2c2c2c', margin: '0', fontWeight: '600' }}>{propertyInfo.open_house_date}</p>
                    <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>{propertyInfo.open_house_time}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '20px', color: '#1e88e5', margin: '0', fontWeight: '600' }}>{propertyInfo.price}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                  <span style={{ fontSize: '13px', color: '#999' }}>{propertyInfo.bedrooms} BD</span>
                  <span style={{ fontSize: '13px', color: '#999' }}>{propertyInfo.bathrooms} BA</span>
                  <span style={{ fontSize: '13px', color: '#999' }}>{propertyInfo.sqft} sqft</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c2c2c', marginBottom: '6px' }}>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: '' }); }}
                  style={{ width: '100%', padding: '12px', border: errors.name ? '2px solid #ef4444' : '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', transition: 'border 0.2s' }}
                  placeholder="John Doe"
                />
                {errors.name && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>{errors.name}</p>}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c2c2c', marginBottom: '6px' }}>Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                  style={{ width: '100%', padding: '12px', border: errors.email ? '2px solid #ef4444' : '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', transition: 'border 0.2s' }}
                  placeholder="john@example.com"
                />
                {errors.email && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>{errors.email}</p>}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c2c2c', marginBottom: '6px' }}>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', transition: 'border 0.2s' }}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.consent}
                    onChange={(e) => { setFormData({ ...formData, consent: e.target.checked }); setErrors({ ...errors, consent: '' }); }}
                    style={{ marginTop: '2px', marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                    I agree to receive property information and follow-up communication. *
                  </span>
                </label>
                {errors.consent && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>{errors.consent}</p>}
              </div>

              <button
                type="submit"
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Sign In
              </button>

              <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '16px', lineHeight: '1.5' }}>
                Your information will not be shared or sold. We respect your privacy.
              </p>
            </form>
          </div>

          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <button
              onClick={() => { setCurrentView('login'); }}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Admin Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Admin login component
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
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxWidth: '400px', width: '100%', padding: '40px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>Admin Dashboard</h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px', textAlign: 'center' }}>Enter password to continue</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                style={{ width: '100%', padding: '14px 44px 14px 14px', border: error ? '2px solid #ef4444' : '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
              </button>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
            <button
              type="submit"
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
            >
              Login
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              onClick={() => setCurrentView('form')}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to Sign-In Form
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Admin dashboard component
  const AdminDashboard = () => {
    const exportToCSV = () => {
      if (leads.length === 0) {
        alert('No leads to export');
        return;
      }

      const headers = ['Name', 'Email', 'Phone', 'Date/Time'];
      const rows = leads.map(lead => [
        lead.name,
        lead.email,
        lead.phone || 'N/A',
        new Date(lead.created_at).toLocaleString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `open-house-leads-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };

    const stats = {
      total: leads.length,
      withEmail: leads.filter(l => l.email).length,
      withPhone: leads.filter(l => l.phone).length,
      activeBuyers: leads.filter(l => l.email && l.phone).length
    };

    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>Dashboard</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Listing: {listingId} • {propertyInfo?.address}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setCurrentView('settings')}
              style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
            >
              <Settings size={18} />
              Edit Property
            </button>
            <button
              onClick={() => { setAuthenticated(false); setCurrentView('form'); }}
              style={{ padding: '10px 20px', background: 'white', color: '#ef4444', border: '2px solid #ef4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Users size={24} color="#3b82f6" />
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: '600' }}>Total Leads</p>
              </div>
              <p style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{stats.total}</p>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 12px 0', fontWeight: '600' }}>With Email</p>
              <p style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{stats.withEmail}</p>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 12px 0', fontWeight: '600' }}>With Phone</p>
              <p style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{stats.withPhone}</p>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 12px 0', fontWeight: '600' }}>Active Buyers</p>
              <p style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{stats.activeBuyers}</p>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Recent Leads</h2>
              <button
                onClick={exportToCSV}
                disabled={leads.length === 0}
                style={{ padding: '10px 20px', background: leads.length === 0 ? '#e2e8f0' : '#1e88e5', color: 'white', border: 'none', borderRadius: '8px', cursor: leads.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>

            {leads.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <Users size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: '18px', color: '#64748b', margin: 0 }}>No leads yet for this listing</p>
              </div>
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Name</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Email</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Phone</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#475569' }}>Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b' }}>{lead.name}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={16} color="#64748b" />
                            {lead.email}
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b' }}>
                          {lead.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Phone size={16} color="#64748b" />
                              {lead.phone}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                          {new Date(lead.created_at).toLocaleString()}
                        </td>
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
  };

  // Settings/Property Management
  const PropertySettings = () => {
    const [propertyData, setPropertyData] = useState({
      address: propertyInfo?.address || '',
      city: propertyInfo?.city || '',
      price: propertyInfo?.price || '',
      bedrooms: propertyInfo?.bedrooms || '',
      bathrooms: propertyInfo?.bathrooms || '',
      sqft: propertyInfo?.sqft || '',
      description: propertyInfo?.description || '',
      open_house_date: propertyInfo?.open_house_date || '',
      open_house_time: propertyInfo?.open_house_time || ''
    });

    const handleSave = () => {
      setPropertyInfo(propertyData);
      alert('Property information updated!');
      setCurrentView('dashboard');
    };

    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Property Settings</h1>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{ padding: '10px 20px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
          >
            <X size={18} />
            Cancel
          </button>
        </div>

        <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '32px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Property Address</label>
                <input
                  type="text"
                  value={propertyData.address}
                  onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>City, State</label>
                <input
                  type="text"
                  value={propertyData.city}
                  onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Price</label>
                  <input
                    type="text"
                    value={propertyData.price}
                    onChange={(e) => setPropertyData({ ...propertyData, price: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Beds</label>
                  <input
                    type="number"
                    value={propertyData.bedrooms}
                    onChange={(e) => setPropertyData({ ...propertyData, bedrooms: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Baths</label>
                  <input
                    type="number"
                    value={propertyData.bathrooms}
                    onChange={(e) => setPropertyData({ ...propertyData, bathrooms: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Sq Ft</label>
                  <input
                    type="text"
                    value={propertyData.sqft}
                    onChange={(e) => setPropertyData({ ...propertyData, sqft: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Description</label>
                <textarea
                  value={propertyData.description}
                  onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Open House Date</label>
                  <input
                    type="text"
                    value={propertyData.open_house_date}
                    onChange={(e) => setPropertyData({ ...propertyData, open_house_date: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                    placeholder="Saturday, Jan 25th"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Open House Time</label>
                  <input
                    type="text"
                    value={propertyData.open_house_time}
                    onChange={(e) => setPropertyData({ ...propertyData, open_house_time: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px' }}
                    placeholder="1:00 PM - 4:00 PM"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                style={{ padding: '14px', background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}
              >
                <Save size={20} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render appropriate view
  if (currentView === 'login') {
    return <AdminLogin />;
  } else if (currentView === 'dashboard') {
    return authenticated ? <AdminDashboard /> : <AdminLogin />;
  } else if (currentView === 'settings') {
    return authenticated ? <PropertySettings /> : <AdminLogin />;
  }

  return <SignInForm />;
}
