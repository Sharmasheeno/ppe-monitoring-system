import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { PPELogo } from '../components/Navbar';
import { CheckCircle } from 'lucide-react';

// Password strength criteria
const passwordCriteria = [
  { label: 'At least 8 characters',   test: (p) => p.length >= 8 },
  { label: 'Uppercase letter (A-Z)',   test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a-z)',   test: (p) => /[a-z]/.test(p) },
  { label: 'Number (0-9)',             test: (p) => /\d/.test(p) },
  { label: 'Symbol (e.g. @, #, !)',    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  if (!password) return null;
  const passed = passwordCriteria.filter(c => c.test(password)).length;
  const colors = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {passwordCriteria.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passed ? colors[passed - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <ul className="space-y-0.5">
        {passwordCriteria.map((c, i) => (
          <li key={i} className={`flex items-center gap-1.5 text-xs ${c.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircle size={11} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Public signup only creates 'user' (Site Worker) accounts.
// Safety Officers / Admins are created only by existing admins via the Admin Panel.

function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',  // Always 'user' on public signup
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!strongPwd.test(formData.password)) {
      alert('Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5001/api/auth/register', {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: 'user', // Force user role — admins created via admin panel
      });
      sessionStorage.setItem('token', res.data.token);
      sessionStorage.setItem('role', res.data.user.role);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.msg
        || err.response?.data?.message
        || err.message
        || 'Registration failed. Please check your details and try again.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT — White Form ─────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-16 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <PPELogo size={36} />
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-black uppercase tracking-widest text-green-700">PPE</span>
            <span className="text-[12px] font-bold uppercase tracking-widest text-gray-600">Monitoring</span>
          </div>
        </div>

        <div className="w-full max-w-md">

          {/* Heading */}
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600 mb-2">
              Join PPE Monitoring
            </p>
            <h1
              className="text-4xl font-black text-gray-900 leading-tight"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Create your
              <br />
              safety account.
            </h1>
            <p className="mt-3 text-sm text-gray-400">
              Takes 60 seconds. No credit card required.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Username
              </label>
              <input
                name="username"
                type="text"
                placeholder="e.g. omar_site01"
                required
                onChange={handleChange}
                className="w-full px-4 py-3.5 text-sm text-gray-900 bg-gray-50 border border-gray-200
                           rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500
                           focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Work Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                onChange={handleChange}
                className="w-full px-4 py-3.5 text-sm text-gray-900 bg-gray-50 border border-gray-200
                           rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500
                           focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex justify-between">
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  required
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 text-sm text-gray-900 bg-gray-50 border border-gray-200
                             rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500
                             focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[13px] p-1 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50"
                  tabIndex="-1"
                >
                  <span className="text-xs font-semibold">{showPassword ? 'HIDE' : 'SHOW'}</span>
                </button>
              </div>
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            {/* Role indicator card */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 relative overflow-hidden group">
              <div className="bg-green-100 p-2 rounded-lg relative z-10 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="relative z-10">
                <h4 className="text-sm font-bold text-green-900">Supervisor Account</h4>
                <p className="text-xs text-green-700 leading-relaxed mt-0.5 max-w-[280px]">
                  Registering directly grants you full administrative privileges. 
                </p>
                <div className="mt-2 text-[11px] font-medium text-green-800/80">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 mb-[1px]"></span>
                  Site Workers must be registered by a Supervisor from the Admin Dashboard.
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400
                         text-white font-black text-sm rounded-xl transition-all duration-200
                         shadow-lg shadow-green-500/20 hover:shadow-green-500/40
                         hover:-translate-y-0.5 active:translate-y-0
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white
                                 rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-semibold">HAVE AN ACCOUNT?</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <Link
            to="/login"
            className="mt-4 w-full flex items-center justify-center gap-2 py-4 border-2 border-gray-200
                       text-gray-700 font-bold text-sm rounded-xl hover:border-green-500
                       hover:text-green-700 transition-all duration-200"
          >
            Sign in instead
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ── RIGHT — Green Panel ───────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[40%] bg-green-600 px-14 py-12">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <PPELogo size={38} inverted />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white">PPE</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-200">Monitoring</span>
          </div>
        </div>

        <div>
          <p
            className="text-white text-4xl font-black leading-snug"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Your first step
            <br />
            to a safer site.
          </p>
          <p className="mt-5 text-green-200 text-sm leading-relaxed max-w-xs">
            Join safety officers and site managers who track PPE compliance across their entire workforce.
          </p>

          {/* 3-step guide */}
          <div className="mt-10 space-y-5">
            {[
              ['1', 'Create your account',  'Secure access to your dashboard'],
              ['2', 'Connect a camera',     'Any standard CCTV or IP camera'],
              ['3', 'Monitor your site',    'AI handles the rest, 24/7'],
            ].map(([num, title, sub]) => (
              <div key={num} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-white">{num}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{title}</p>
                  <p className="text-green-300 text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-green-300 text-xs">
          © {new Date().getFullYear()} PPE Monitoring System
        </p>
      </div>
    </div>
  );
}

export default Signup;
