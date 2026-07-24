import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, HeartHandshake, Eye, EyeOff } from 'lucide-react';
import OtpVerify from '../components/OtpVerify';

export default function Login() {
  const { login, googleSignIn, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgotInput, setShowForgotInput] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      navigate(`/dashboard/${user.role}`);
    } catch (err) {
      if (err.message === 'verification_pending') {
        // Handled in context, verifyEmail state set, triggers OtpVerify panel render
        setError('');
      } else {
        setError(err.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMock = async () => {
    setError('');
    setLoading(true);

    const mockGoogleProfile = {
      name: 'Google User',
      email: 'googleuser@gmail.com',
      googleId: 'g_1029384756',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'
    };

    try {
      const result = await googleSignIn(mockGoogleProfile);
      if (result.needsRoleSelection) {
        navigate('/register', { state: { googleProfile: mockGoogleProfile } });
      } else {
        navigate(`/dashboard/${result.role}`);
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail) return;

    try {
      const res = await fetch(`http://localhost:5000/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      
      if (res.ok) {
        setForgotSent(true);
        setError('');
      } else {
        const d = await res.json();
        setError(d.message || 'Forgot password failed');
      }
    } catch (err) {
      setError('Failed to send reset link.');
    }
  };

  // If email verification is pending, render the OTP screen instead of login form
  if (verifyEmail) {
    return (
      <div className="login-page-wrapper">
        <div className="login-card-container">
          <OtpVerify onVerificationSuccess={(user) => navigate(`/dashboard/${user.role}`)} />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container animate-slide-up">
        <div className="login-card glass-panel">
          <div className="login-header">
            <Link to="/" className="brand-logo">
              <HeartHandshake className="logo-icon" />
              <span>Food<span className="logo-highlight">Bridge</span></span>
            </Link>
            <h2>Welcome Back</h2>
            <p>Enter details to log in to your dashboard</p>
          </div>

          {error && <div className="alert-danger">{error}</div>}
          {forgotSent && (
            <div className="alert-success">
              📨 Password reset link sent to your registered email.
            </div>
          )}

          {!showForgotInput ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={18} />
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="name@organization.com"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-control" 
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button 
                  type="button" 
                  className="btn-link forgot-pass-btn"
                  onClick={() => { setShowForgotInput(true); setError(''); }}
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Logging In...' : 'Log In'}
              </button>

              <div className="divider">
                <span>or continue with</span>
              </div>

              <button type="button" className="btn btn-secondary w-full google-btn" onClick={handleGoogleMock} disabled={loading}>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign In with Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <div className="form-group">
                <label className="form-label">Reset Password Email</label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={18} />
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="name@organization.com"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="forgot-ctas">
                <button type="submit" className="btn btn-primary flex-1">Reset Password</button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => { setShowForgotInput(false); setForgotSent(false); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="login-footer">
            <p>New to FoodBridge? <Link to="/register" className="btn-link">Create account</Link></p>
          </div>
        </div>
      </div>

      <style>{`
        .login-page-wrapper {
          min-height: calc(100vh - 75px);
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
                      radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 40%);
          padding: 2rem;
        }
        .login-card-container {
          width: 100%;
          max-width: 440px;
        }
        .login-card {
          padding: 2.5rem;
          background: var(--bg-secondary);
          box-shadow: var(--card-shadow);
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
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
          margin-bottom: 1rem;
        }
        .brand-logo .logo-icon {
          color: var(--primary);
        }
        .logo-highlight {
          color: var(--primary);
        }
        .login-header h2 {
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }
        .login-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 0.85rem;
          color: var(--text-muted);
          pointer-events: none;
        }
        .input-with-icon .form-control {
          padding-left: 2.5rem;
          width: 100%;
        }
        .password-toggle {
          position: absolute;
          right: 0.85rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .password-toggle:hover {
          color: var(--text-primary);
        }
        .btn-link {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          font-size: 0.85rem;
          transition: color var(--transition-fast);
        }
        .btn-link:hover {
          color: var(--primary-dark);
          text-decoration: underline;
        }
        .forgot-pass-btn {
          align-self: flex-end;
          margin-top: 0.35rem;
        }
        .w-full {
          width: 100%;
        }
        .divider {
          text-align: center;
          margin: 1.5rem 0;
          position: relative;
        }
        .divider::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 1px;
          background-color: var(--border-color);
          z-index: 1;
        }
        .divider span {
          background-color: var(--bg-secondary);
          padding: 0 0.75rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          position: relative;
          z-index: 2;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
        }
        .google-icon {
          width: 18px;
          height: 18px;
        }
        .alert-danger {
          background-color: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.15);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
          text-align: center;
        }
        .alert-success {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--primary-dark);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
          text-align: center;
        }
        .forgot-ctas {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .flex-1 {
          flex: 1;
        }
        .login-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
