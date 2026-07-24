import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartHandshake, MapPin, Compass } from 'lucide-react';
import Map from '../components/Map';
import OtpVerify from '../components/OtpVerify';

export default function Register() {
  const { register, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const googleProfile = location.state?.googleProfile || null;

  const [name, setName] = useState(googleProfile?.name || '');
  const [email, setEmail] = useState(googleProfile?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('donor'); 

  // Role-specific fields
  const [ngoRegNo, setNgoRegNo] = useState('');
  const [ngoAddress, setNgoAddress] = useState('');
  const [ngoLat, setNgoLat] = useState(12.9716); 
  const [ngoLng, setNgoLng] = useState(77.5946);
  const [ngoContact, setNgoContact] = useState('');

  const [vehicleType, setVehicleType] = useState('motorcycle');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNgoLat(position.coords.latitude);
        setNgoLng(position.coords.longitude);
        setLocating(false);
      },
      (err) => {
        setError("Unable to retrieve GPS. Please click on the map.");
        setLocating(false);
      }
    );
  };

  const handleMapClick = (lat, lng) => {
    setNgoLat(parseFloat(lat.toFixed(6)));
    setNgoLng(parseFloat(lng.toFixed(6)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      name,
      email,
      password: googleProfile ? googleProfile.googleId : password,
      phone,
      role,
      ...(googleProfile ? { googleId: googleProfile.googleId, avatar: googleProfile.avatar } : {})
    };

    if (role === 'ngo') {
      payload.ngoDetails = {
        regNo: ngoRegNo,
        address: ngoAddress,
        lat: ngoLat,
        lng: ngoLng,
        contactPerson: ngoContact
      };
    } else if (role === 'volunteer') {
      payload.volunteerDetails = {
        vehicleType
      };
    }

    try {
      const res = await register(payload);
      if (res && res.needsVerification) {
        // OtpVerify triggers since verifyEmail becomes set in AuthContext
        setError('');
      } else {
        // Google sign-in bypass
        navigate(`/dashboard/${role}`);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // If email verification is pending, render the OTP screen
  if (verifyEmail) {
    return (
      <div className="register-page-wrapper">
        <div className="register-card-container">
          <OtpVerify onVerificationSuccess={(user) => navigate(`/dashboard/${user.role}`)} />
        </div>
      </div>
    );
  }

  return (
    <div className="register-page-wrapper">
      <div className="register-card-container animate-slide-up">
        <div className="register-card glass-panel">
          <div className="register-header">
            <Link to="/" className="brand-logo">
              <HeartHandshake className="logo-icon" />
              <span>Food<span className="logo-highlight">Bridge</span></span>
            </Link>
            <h2>Create Account</h2>
            {googleProfile && (
              <div className="google-badge-alert">
                ✓ Google Account Connected. Complete details below.
              </div>
            )}
            <p>Join the movement to rescue surplus food and feed communities.</p>
          </div>

          {error && <div className="alert-danger">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full/Org Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Grand Palace Hotel"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="name@domain.com"
                  required
                  disabled={!!googleProfile}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              {!googleProfile && (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="10 digit phone number"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Register As</label>
              <select 
                className="form-control form-select" 
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="donor">Food Donor (Hotel/Restaurant/Individual)</option>
                <option value="ngo">NGO (Food Distribution Agency)</option>
                <option value="volunteer">Volunteer (Delivery Partner)</option>
              </select>
            </div>

            {/* CONDITIONAL NGO FORM */}
            {role === 'ngo' && (
              <div className="conditional-fields-container animate-fade-in">
                <h4 className="cond-title">NGO Agency Details</h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Registration Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. NGO-12938"
                      required={role === 'ngo'}
                      value={ngoRegNo}
                      onChange={e => setNgoRegNo(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Agency Admin Name"
                      required={role === 'ngo'}
                      value={ngoContact}
                      onChange={e => setNgoContact(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Office Address</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Physical address"
                    required={role === 'ngo'}
                    value={ngoAddress}
                    onChange={e => setNgoAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div className="flex-between">
                    <label className="form-label">NGO Location (Click map to pin)</label>
                    <button 
                      type="button" 
                      className="btn-gps" 
                      onClick={handleGPSLocation}
                      disabled={locating}
                    >
                      <Compass size={14} className={locating ? 'animate-spin' : ''} />
                      {locating ? 'Locating...' : 'Get Current GPS'}
                    </button>
                  </div>
                  
                  <div className="coordinate-display">
                    <span>Latitude: <b>{ngoLat}</b></span>
                    <span>Longitude: <b>{ngoLng}</b></span>
                  </div>

                  <div className="mini-map-box">
                    <Map 
                      center={[ngoLat, ngoLng]} 
                      zoom={14} 
                      markers={[{ lat: ngoLat, lng: ngoLng, iconType: 'ngo', popupText: 'NGO Location PIN' }]}
                      onMapClick={handleMapClick}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CONDITIONAL VOLUNTEER FORM */}
            {role === 'volunteer' && (
              <div className="conditional-fields-container animate-fade-in">
                <h4 className="cond-title">Volunteer Delivery Details</h4>
                <div className="form-group">
                  <label className="form-label">Preferred Vehicle Type</label>
                  <select 
                    className="form-control form-select"
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                  >
                    <option value="walk">On Foot / Walking</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="motorcycle">Motorcycle / Scooter</option>
                    <option value="car">Car</option>
                    <option value="van">Utility Van / Truck</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full register-submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="register-footer">
            <p>Already have an account? <Link to="/login" className="btn-link">Log in</Link></p>
          </div>
        </div>
      </div>

      <style>{`
        .register-page-wrapper {
          min-height: calc(100vh - 75px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
                      radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 40%);
          padding: 2rem 1rem;
        }
        .register-card-container {
          width: 100%;
          max-width: 680px;
        }
        .register-card {
          padding: 2.5rem;
          background: var(--bg-secondary);
          box-shadow: var(--card-shadow);
        }
        .register-header {
          text-align: center;
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .google-badge-alert {
          background-color: rgba(59, 130, 246, 0.1);
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .brand-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-title);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          text-decoration: none;
          margin-bottom: 0.75rem;
        }
        .brand-logo .logo-icon {
          color: var(--primary);
        }
        .logo-highlight {
          color: var(--primary);
        }
        .register-header h2 {
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }
        .register-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
          max-width: 450px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-gps {
          background: transparent;
          border: 1px solid var(--primary);
          color: var(--primary);
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all var(--transition-fast);
        }
        .btn-gps:hover {
          background-color: var(--primary);
          color: #ffffff;
        }
        .coordinate-display {
          display: flex;
          gap: 1.5rem;
          background-color: var(--bg-primary);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          font-size: 0.75rem;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }
        .mini-map-box {
          height: 220px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .conditional-fields-container {
          background-color: rgba(var(--primary-rgb), 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          margin: 1.5rem 0;
        }
        .cond-title {
          font-size: 1rem;
          color: var(--primary);
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.35rem;
        }
        .w-full {
          width: 100%;
        }
        .register-submit {
          margin-top: 1.5rem;
        }
        .register-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .btn-link {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .btn-link:hover {
          color: var(--primary-dark);
          text-decoration: underline;
        }
        
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .grid-2 {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
      `}</style>
    </div>
  );
}
