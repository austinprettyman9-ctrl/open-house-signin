import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, Users, Eye, EyeOff, Check, Phone, Mail, Home, Settings, Save, X, LogOut } from 'lucide-react';

// Supabase Configuration
const supabaseUrl = 'https://lubctieveoskgrddipsw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1YmN0aWV2ZW9za2dyZGRpcHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDAxMTYsImV4cCI6MjA4NDYxNjExNn0.J2OlbxRFgxk7--GxC0W6P41BLKQxkcEg5M3x1tELB_0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_PASSWORD = 'openhouse2026';

export default function App() {
  const [currentView, setCurrentView] = useState('form');
  const [authenticated, setAuthenticated] = useState(false);
  const [listingId, setListingId] = useState('default');
  const [leads, setLeads] = useState([]);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get listing ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listing = params.get('listing') || 'default';
    setListingId(listing);
  }, []);

  // Load data when listing ID changes
  useEffect(() => {
    if (listingId) {
      loadPropertyData();
      loadAgentData();
      if (authenticated) {
        loadLeads();
      }
    }
  }, [listingId, authenticated]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('listing_id', listingId)
        .single();

      if (data) {
        setPropertyInfo(data);
      } else {
        // Set defaults if no property exists
        setPropertyInfo({
          listing_id: listingId,
          address: '123 Main Street',
          city: 'Flagstaff, AZ 86001',
          open_house_date: 'Saturday, January 25, 2026',
          open_house_time: '1:00 PM - 4:00 PM',
          price: '$449,000',
          bedrooms: '3',
          bathrooms: '2',
          sqft: '2,100',
          lot_size: '0.5 acres',
          year_built: '2015',
          description: 'Beautiful mountain view home featuring vaulted ceilings and open floor plan.',
          features: ['Mountain views', 'Updated kitchen', 'Open floor plan', 'Large deck'],
          image_url: '',
          flyer_url: '',
        });
      }
    } catch (error) {
      console.error('Error loading property:', error);
    }
    setLoading(false);
  };

  const loadAgentData = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('listing_id', listingId)
        .single();

      if (data) {
        setAgentInfo(data);
      } else {
        // Set defaults
        setAgentInfo({
          listing_id: listingId,
          agent_name: 'Austin Barlow',
          title: 'Licensed Real Estate Agent',
          brokerage: 'RE/MAX Fine Properties',
          team: 'Dead Group Team',
          phone: '(928) 555-1234',
          email: 'austin@remax.com',
          photo_url: '',
        });
      }
    } catch (error) {
      console.error('Error loading agent:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (data) {
        setLeads(data);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const saveProperty = async (data) => {
    try {
      const { error } = await supabase
        .from('properties')
        .upsert({ ...data, listing_id: listingId }, { onConflict: 'listing_id' });

      if (!error) {
        setPropertyInfo(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving property:', error);
      return false;
    }
  };

  const saveAgent = async (data) => {
    try {
      const { error } = await supabase
        .from('agents')
        .upsert({ ...data, listing_id: listingId }, { onConflict: 'listing_id' });

      if (!error) {
        setAgentInfo(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving agent:', error);
      return false;
    }
  };

  // SIGN-IN FORM
  const SignInForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      stage: '',
      comments: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const validateForm = () => {
      const newErrors = {};
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.email.trim() && !formData.phone.trim()) {
        newErrors.contact = 'Please provide either email or phone';
      }
      if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Invalid email';
      }
      return newErrors;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      const newErrors = validateForm();
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setSubmitting(true);

      try {
        const { error } = await supabase.from('leads').insert([{
          listing_id: listingId,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          stage: formData.stage || null,
          comments: formData.comments || null,
        }]);

        if (error) throw error;

        setSubmitted(true);
      } catch (error) {
        console.error('Error submitting:', error);
        alert('Failed to submit. Please try again.');
      }
      
      setSubmitting(false);
    };

    if (submitted) {
      return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '600px', width: '100%', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', padding: '32px 24px', textAlign: 'center', color: 'white' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={32} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 8px 0' }}>Thanks for Signing In!</h2>
              <p style={{ fontSize: '16px', margin: '0', opacity: '0.9' }}>Enjoy exploring the home</p>
            </div>
            
            <div style={{ padding: '32px 24px' }}>
              {propertyInfo && (
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#2c2c2c', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Home size={20} /> Property Details
                  </h3>
                  <p style={{ fontSize: '18px', fontWeight: '600', color: '#2c2c2c', margin: '0 0 4px 0' }}>{propertyInfo.address}</p>
                  <p style={{ fontSize: '16px', color: '#666', margin: '0 0 16px 0' }}>{propertyInfo.city}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '13px', color: '#999', margin: '0 0 4px 0' }}>Price</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{propertyInfo.price}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: '#999', margin: '0 0 4px 0' }}>Bedrooms</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{propertyInfo.bedrooms} BD</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: '#999', margin: '0 0 4px 0' }}>Bathrooms</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{propertyInfo.bathrooms} BA</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: '#999', margin: '0 0 4px 0' }}>Square Feet</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{propertyInfo.sqft}</p>
                    </div>
                  </div>
                  
                  {propertyInfo.features && propertyInfo.features.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '13px', color: '#999', margin: '0 0 8px 0' }}>Key Features</p>
                      {propertyInfo.features.map((feature, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1e88e5' }} />
                          <span style={{ fontSize: '14px', color: '#666' }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6', margin: '0' }}>{propertyInfo.description}</p>
                  
                  {propertyInfo.flyer_url && (
                    <a href={propertyInfo.flyer_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', padding: '12px', background: 'white', border: '2px solid #1e88e5', borderRadius: '8px', color: '#1e88e5', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                      <Download size={16} /> Download Property Flyer
                    </a>
                  )}
                </div>
              )}
              
              {agentInfo && (
                <div style={{ background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>Questions? Contact Me</h3>
                  <p style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>{agentInfo.agent_name}</p>
                  <p style={{ fontSize: '14px', margin: '0 0 16px 0', opacity: '0.9' }}>{agentInfo.title} • {agentInfo.brokerage}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <a href={`tel:${agentInfo.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', textDecoration: 'none' }}>
                      <Phone size={18} /> {agentInfo.phone}
                    </a>
                    <a href={`mailto:${agentInfo.email}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', textDecoration: 'none' }}>
                      <Mail size={18} /> {agentInfo.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {propertyInfo?.image_url ? (
            <div style={{ width: '100%', height: '200px', background: `url(${propertyInfo.image_url}) center/cover`, position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '40px 24px 20px', color: 'white' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 4px 0' }}>{propertyInfo.address}</h1>
                <p style={{ fontSize: '16px', margin: '0', opacity: '0.9' }}>{propertyInfo.city}</p>
              </div>
            </div>
          ) : (
            <div style={{ background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', padding: '32px 24px', color: 'white', textAlign: 'center' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 8px 0' }}>Welcome!</h1>
              <p style={{ fontSize: '16px', margin: '0', opacity: '0.9' }}>Please sign in to view this property</p>
            </div>
          )}
          
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
                  style={{ width: '100%', padding: '12px', border: errors.name ? '2px solid #f44336' : '1px solid #ddd', borderRadius: '8px', fontSize: '16px', outline: 'none' }}
                />
                {errors.name && <span style={{ fontSize: '12px', color: '#f44336', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
              </div>
              
              {errors.contact && (
                <div style={{ background: '#ffebee', border: '1px solid #f44336', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#c62828' }}>
                  {errors.contact}
                </div>
              )}
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c2c2c', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: '', contact: '' }); }}
                  style={{ width: '100%', padding: '12px', border: errors.email ? '2px solid #f44336' : '1px solid #ddd', borderRadius: '8px', fontSize: '16px', outline: 'none' }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c2c2c', marginBottom: '6px' }}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setErrors({ ...errors, contact: '' }); }}
                  placeholder="(928) 555-1234"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', outline: 'none' }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c2c2c', marginBottom: '6px' }}>Buying Timeline (Optional)</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', outline: 'none', background: 'white', cursor: 'pointer' }}
                >
                  <option value="">Select one</option>
                  <option value="Yes, actively looking">Yes, actively looking</option>
                  <option value="Yes, within 3-6 months">Yes, within 3-6 months</option>
                  <option value="Maybe, just browsing">Maybe, just browsing</option>
                  <option value="No, not looking">No, not looking</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c2c2c', marginBottom: '6px' }}>Questions or Comments (Optional)</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows="3"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', outline: 'none', resize: 'vertical' }}
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', padding: '16px', background: submitting ? '#ccc' : 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(30, 136, 229, 0.3)' }}
              >
                {submitting ? 'Submitting...' : 'Sign In & Get Property Details'}
              </button>
            </form>
            
            <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginTop: '16px', lineHeight: '1.5' }}>
              Your information will be used to send you property details. We respect your privacy.
            </p>
          </div>
        </div>
        
        {/* Admin Access - Double click bottom right */}
        <div
          onDoubleClick={() => setCurrentView('login')}
          style={{ position: 'fixed', bottom: '0', right: '0', width: '80px', height: '80px', cursor: 'pointer', zIndex: 1000 }}
          title="Double-click for admin"
        />
      </div>
    );
  };

  // LOGIN SCREEN
  const LoginScreen = () => {
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e) => {
      e.preventDefault();
      if (password === ADMIN_PASSWORD) {
        setAuthenticated(true);
        setCurrentView('dashboard');
        loadLeads();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    };

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '400px', width: '100%', background: 'white', borderRadius: '16px', padding: '40px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#2c2c2c', marginBottom: '8px', textAlign: 'center' }}>Admin Login</h1>
          <p style={{ fontSize: '16px', color: '#666', textAlign: 'center', marginBottom: '32px' }}>Listing: {listingId}</p>
          
          <form onSubmit={handleLogin}>
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                autoFocus
                style={{ width: '100%', padding: '14px 44px 14px 14px', border: error ? '2px solid #f44336' : '1px solid #ddd', borderRadius: '8px', fontSize: '16px', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPw ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
              </button>
            </div>
            
            {error && <p style={{ fontSize: '14px', color: '#f44336', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
            
            <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px' }}>
              Login
            </button>
            
            <button type="button" onClick={() => setCurrentView('form')} style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', color: '#666', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Back
            </button>
          </form>
        </div>
      </div>
    );
  };

  // DASHBOARD
  const Dashboard = () => {
    const exportCSV = () => {
      const headers = ['Date', 'Name', 'Email', 'Phone', 'Stage', 'Comments'];
      const rows = leads.map(l => [
        new Date(l.created_at).toLocaleString(),
        l.name,
        l.email || '',
        l.phone || '',
        l.stage || '',
        l.comments || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${listingId}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };

    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '20px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#2c2c2c', margin: '0 0 4px 0' }}>Dashboard</h1>
              <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Listing: {listingId} • {propertyInfo?.address || 'Loading...'}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setCurrentView('settings')} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={16} /> Edit Property
              </button>
              <button onClick={() => { setAuthenticated(false); setCurrentView('form'); }} style={{ padding: '12px 24px', background: 'white', border: '2px solid #f44336', borderRadius: '8px', color: '#f44336', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
        
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Users size={24} color="#1e88e5" />
                <h3 style={{ fontSize: '14px', color: '#666', margin: '0', fontWeight: '600' }}>Total Leads</h3>
              </div>
              <p style={{ fontSize: '32px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{leads.length}</p>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0', fontWeight: '600' }}>With Email</h3>
              <p style={{ fontSize: '32px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{leads.filter(l => l.email).length}</p>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0', fontWeight: '600' }}>With Phone</h3>
              <p style={{ fontSize: '32px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{leads.filter(l => l.phone).length}</p>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0', fontWeight: '600' }}>Active Buyers</h3>
              <p style={{ fontSize: '32px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>{leads.filter(l => l.stage === 'Yes, actively looking').length}</p>
            </div>
          </div>
          
          {leads.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <button onClick={exportCSV} style={{ padding: '12px 24px', background: '#1e88e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} /> Export to CSV
              </button>
            </div>
          )}
          
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            {leads.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Users size={48} color="#ccc" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: '18px', color: '#666', margin: '0' }}>No leads yet for this listing</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Date</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Email</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Phone</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Stage</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>{new Date(l.created_at).toLocaleString()}</td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{l.name}</td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {l.email ? <a href={`mailto:${l.email}`} style={{ color: '#1e88e5', textDecoration: 'none' }}>{l.email}</a> : '—'}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          {l.phone ? <a href={`tel:${l.phone}`} style={{ color: '#1e88e5', textDecoration: 'none' }}>{l.phone}</a> : '—'}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>{l.stage || '—'}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#666', maxWidth: '200px' }}>{l.comments || '—'}</td>
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

  // SETTINGS PANEL
  const SettingsPanel = () => {
    const [editingProperty, setEditingProperty] = useState({ ...propertyInfo });
    const [editingAgent, setEditingAgent] = useState({ ...agentInfo });
    const [newFeature, setNewFeature] = useState('');
    const [saved, setSaved] = useState('');

    const handleSaveProperty = async () => {
      const success = await saveProperty(editingProperty);
      if (success) {
        setSaved('Property saved!');
        setTimeout(() => setSaved(''), 3000);
      }
    };

    const handleSaveAgent = async () => {
      const success = await saveAgent(editingAgent);
      if (success) {
        setSaved('Agent info saved!');
        setTimeout(() => setSaved(''), 3000);
      }
    };

    const addFeature = () => {
      if (newFeature.trim()) {
        setEditingProperty({
          ...editingProperty,
          features: [...(editingProperty.features || []), newFeature.trim()]
        });
        setNewFeature('');
      }
    };

    const removeFeature = (index) => {
      setEditingProperty({
        ...editingProperty,
        features: editingProperty.features.filter((_, i) => i !== index)
      });
    };

    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '20px 24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#2c2c2c', margin: '0' }}>Edit Property - {listingId}</h1>
            <button onClick={() => setCurrentView('dashboard')} style={{ padding: '10px 20px', background: '#1e88e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
        
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
          {saved && (
            <div style={{ background: '#4caf50', color: 'white', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', fontWeight: '600' }}>
              {saved}
            </div>
          )}
          
          {/* Property Info */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2c2c2c', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Home size={20} /> Property Information
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Address *</label>
                  <input type="text" value={editingProperty.address || ''} onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>City, State ZIP *</label>
                  <input type="text" value={editingProperty.city || ''} onChange={(e) => setEditingProperty({ ...editingProperty, city: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Open House Date</label>
                  <input type="text" value={editingProperty.open_house_date || ''} onChange={(e) => setEditingProperty({ ...editingProperty, open_house_date: e.target.value })} placeholder="Saturday, January 25, 2026" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Open House Time</label>
                  <input type="text" value={editingProperty.open_house_time || ''} onChange={(e) => setEditingProperty({ ...editingProperty, open_house_time: e.target.value })} placeholder="1:00 PM - 4:00 PM" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Price</label>
                  <input type="text" value={editingProperty.price || ''} onChange={(e) => setEditingProperty({ ...editingProperty, price: e.target.value })} placeholder="$449,000" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Bedrooms</label>
                  <input type="text" value={editingProperty.bedrooms || ''} onChange={(e) => setEditingProperty({ ...editingProperty, bedrooms: e.target.value })} placeholder="3" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Bathrooms</label>
                  <input type="text" value={editingProperty.bathrooms || ''} onChange={(e) => setEditingProperty({ ...editingProperty, bathrooms: e.target.value })} placeholder="2" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Sqft</label>
                  <input type="text" value={editingProperty.sqft || ''} onChange={(e) => setEditingProperty({ ...editingProperty, sqft: e.target.value })} placeholder="2,100" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Description</label>
                <textarea value={editingProperty.description || ''} onChange={(e) => setEditingProperty({ ...editingProperty, description: e.target.value })} rows="4" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Key Features</label>
                <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  {editingProperty.features && editingProperty.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{f}</span>
                      <button onClick={() => removeFeature(i)} style={{ padding: '4px 8px', background: '#f44336', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    placeholder="Add a feature"
                    style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
                  />
                  <button onClick={addFeature} style={{ padding: '10px 20px', background: '#1e88e5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    Add
                  </button>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Property Image URL</label>
                <input type="url" value={editingProperty.image_url || ''} onChange={(e) => setEditingProperty({ ...editingProperty, image_url: e.target.value })} placeholder="https://example.com/image.jpg" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Upload to Google Drive or Imgur, paste link here</p>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Property Flyer PDF URL</label>
                <input type="url" value={editingProperty.flyer_url || ''} onChange={(e) => setEditingProperty({ ...editingProperty, flyer_url: e.target.value })} placeholder="https://example.com/flyer.pdf" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Visitors can download after signing in</p>
              </div>
              
              <button onClick={handleSaveProperty} style={{ padding: '14px', background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Save size={18} /> Save Property Info
              </button>
            </div>
          </div>
          
          {/* Agent Info */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2c2c2c', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} /> Agent Information
            </h2>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Your Name *</label>
                  <input type="text" value={editingAgent.agent_name || ''} onChange={(e) => setEditingAgent({ ...editingAgent, agent_name: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Title</label>
                  <input type="text" value={editingAgent.title || ''} onChange={(e) => setEditingAgent({ ...editingAgent, title: e.target.value })} placeholder="Licensed Real Estate Agent" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Brokerage *</label>
                  <input type="text" value={editingAgent.brokerage || ''} onChange={(e) => setEditingAgent({ ...editingAgent, brokerage: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Team (optional)</label>
                  <input type="text" value={editingAgent.team || ''} onChange={(e) => setEditingAgent({ ...editingAgent, team: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Phone *</label>
                  <input type="tel" value={editingAgent.phone || ''} onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })} placeholder="(928) 555-1234" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Email *</label>
                  <input type="email" value={editingAgent.email || ''} onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
              
              <button onClick={handleSaveAgent} style={{ padding: '14px', background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Save size={18} /> Save Agent Info
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #e0e0e0', borderTop: '4px solid #1e88e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', color: '#666' }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Router
  if (currentView === 'form') return <SignInForm />;
  if (currentView === 'login') return <LoginScreen />;
  if (currentView === 'dashboard' && authenticated) return <Dashboard />;
  if (currentView === 'settings' && authenticated) return <SettingsPanel />;
  
  return <SignInForm />;
}