import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, AlertTriangle } from 'lucide-react';

export default function OtpVerify({ onVerificationSuccess }) {
  const { verifyEmail, setVerifyEmail, verifyOtp, getHeaders } = useAuth();
  
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [timer, setTimer] = useState(60); // 60s countdown
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const inputRefs = useRef([]);

  // Countdown timer logic
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input box
    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const user = await verifyOtp(verifyEmail, code);
      if (onVerificationSuccess) {
        onVerificationSuccess(user);
      }
    } catch (err) {
      setError(err.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccessMsg("");
    setResending(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, password: 'trigger_resend_otp_placeholder' })
      });
      // The backend auto sends new OTP if unverified email logins fail
      setSuccessMsg("📬 A new verification OTP code has been sent to your email inbox.");
      setTimer(60);
    } catch (err) {
      setError("Failed to resend code. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-container glass-panel animate-slide-up">
      <div className="otp-header">
        <div className="icon-wrapper">
          <ShieldCheck size={32} className="shield-icon" />
        </div>
        <h2>Verify Your Email</h2>
        <p className="sub-text">
          We have sent a security verification code to:<br/>
          <span className="email-highlight">{verifyEmail}</span>
        </p>
      </div>

      {error && (
        <div className="alert-danger flex items-center gap-2 justify-center">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {successMsg && <div className="alert-success">{successMsg}</div>}

      <form onSubmit={handleSubmit} className="otp-form">
        <div className="otp-inputs">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              name="otp-box"
              maxLength="1"
              className="otp-input-field"
              value={data}
              onChange={e => handleChange(e.target, index)}
              onKeyDown={e => handleKeyDown(e, index)}
              ref={el => (inputRefs.current[index] = el)}
            />
          ))}
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Verifying OTP...' : 'Verify & Continue'}
        </button>
      </form>

      <div className="otp-footer">
        {timer > 0 ? (
          <p className="timer-text">Resend code in <b>{timer}s</b></p>
        ) : (
          <button className="btn-link" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend Verification Code'}
          </button>
        )}
        <button 
          type="button" 
          className="btn-text cancel-verify"
          onClick={() => setVerifyEmail(null)}
        >
          Back to Login
        </button>
      </div>

      <style>{`
        .otp-container {
          padding: 2.5rem;
          background-color: var(--bg-secondary);
          box-shadow: var(--card-shadow);
          max-width: 420px;
          width: 100%;
          margin: 0 auto;
        }
        .otp-header {
          text-align: center;
          margin-bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: rgba(var(--primary-rgb), 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }
        .shield-icon {
          color: var(--primary);
        }
        .otp-header h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .sub-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .email-highlight {
          color: var(--text-primary);
          font-weight: 700;
        }
        .otp-inputs {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          margin: 2rem 0;
        }
        .otp-input-field {
          width: 48px;
          height: 48px;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-sm);
          text-align: center;
          font-size: 1.25rem;
          font-weight: 700;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }
        .otp-input-field:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
          background-color: var(--bg-secondary);
        }
        .otp-footer {
          margin-top: 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }
        .timer-text {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .cancel-verify {
          font-size: 0.8rem;
          color: var(--text-muted);
          cursor: pointer;
        }
        .cancel-verify:hover {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
