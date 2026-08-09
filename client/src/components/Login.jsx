import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data, data.token);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .login-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f8fafc; /* Professional off-white background */
          position: relative;
          overflow: hidden;
        }

        /* ═══════════════════════════════════════════
           LOGIN CARD — Centered
           ═══════════════════════════════════════════ */
        .login-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 16px;
          padding: 44px 40px;
          position: relative;
          z-index: 2;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
          animation: cardEntry 0.5s ease-out;
          border: 1px solid #e2e8f0;
        }

        @keyframes cardEntry {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Brand header */
        .brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .brand-header h2 {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 26px;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .brand-header p {
          font-size: 14px;
          color: #64748b;
          font-weight: 400;
        }

        /* Error alert */
        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          margin-bottom: 22px;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .error-icon {
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .error-content h4 {
          font-size: 13px;
          font-weight: 600;
          color: #b91c1c;
          margin-bottom: 2px;
        }

        .error-content p {
          font-size: 12px;
          color: #dc2626;
          font-weight: 400;
        }

        /* Form fields */
        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .form-input:focus {
          border-color: #f97316;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #64748b;
        }

        /* Forgot password */
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -10px;
          margin-bottom: 24px;
        }

        .forgot-link {
          font-size: 13px;
          color: #f97316;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
        }

        .forgot-link:hover {
          color: #ea580c;
          text-decoration: underline;
        }

        /* Submit button */
        .login-btn {
          width: 100%;
          padding: 12px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          color: #ffffff;
          background: #f97316;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.2);
        }

        .login-btn:hover {
          background: #ea580c;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .login-btn:active {
          transform: translateY(1px);
          box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .btn-arrow {
          display: flex;
          align-items: center;
          transition: transform 0.2s ease;
        }

        .login-btn:hover .btn-arrow {
          transform: translateX(4px);
        }

        /* Spinner */
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 24px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider span {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        /* Security badge */
        .security-badge {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .security-icon {
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .security-badge h4 {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 2px;
        }

        .security-badge p {
          font-size: 11px;
          color: #64748b;
          font-weight: 400;
          line-height: 1.4;
        }

        /* Footer */
        .login-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }

        .login-footer strong {
          color: #0f172a;
          font-weight: 600;
        }

        /* ═══════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════ */
        @media (max-width: 500px) {
          .login-card {
            margin: 16px;
            padding: 32px 24px;
          }

          .brand-header h2 {
            font-size: 22px;
          }
        }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          {/* Brand Header */}
          <div className="brand-header">
            <h2>Welcome Back</h2>
            <p>Login to your Ride Your Bike account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="login-error">
              <div className="error-icon">
                <AlertTriangle size={18} />
              </div>
              <div className="error-content">
                <h4>Login failed</h4>
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username / Email */}
            <div className="form-group">
              <label htmlFor="login-username">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="login-username"
                  type="email"
                  className="form-input"
                  placeholder="Enter your email address"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="forgot-row">
              <span className="forgot-link">Forgot Password?</span>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" />
                  Logging in...
                </>
              ) : (
                <>
                  LOGIN
                  <span className="btn-arrow">
                    <ArrowRight size={18} />
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>OR</span>
          </div>

          {/* Security Badge */}
          <div className="security-badge">
            <div className="security-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4>Your data is 100% secure with us.</h4>
              <p>We ensure the best experience for your rental business.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer">
            © {new Date().getFullYear()} <strong>Ride Your Bike</strong>. All rights reserved.
          </div>
        </div>
      </div>
    </>
  );
}
