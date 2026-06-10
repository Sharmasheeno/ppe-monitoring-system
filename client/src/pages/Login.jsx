import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Smartphone, AlertCircle } from 'lucide-react';
import { VIDEOS } from '../videos';
import ScrambleIn from '../components/landing/ScrambleIn';
import VideoBackground from '../components/landing/VideoBackground';
import BrandMark from '../components/landing/BrandMark';

const STATS = [
  ['98.6%', 'Accuracy'],
  ['<1s', 'Alert'],
  ['24/7', 'Monitoring'],
  ['3', 'PPE Types'],
];

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forcedReason = searchParams.get('reason');

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(id);
  }, []);

  // Turn the ?reason= query param (set by the axios interceptor when the
  // server rejects a stale/deleted session) into the same error UI the form
  // uses for bad credentials.
  useEffect(() => {
    if (forcedReason === 'account_deleted') {
      setError('Your account has been removed by an administrator. Please contact your supervisor.');
    } else if (forcedReason === 'session_expired') {
      setError('Your session has ended. Please sign in again.');
    }
  }, [forcedReason]);

  const handleChange = (e) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5001/api/auth/login', formData);
      const { token, user } = res.data;

      if (user.role === 'user') {
        // Site workers must use the mobile app — do NOT grant web access
        setError('worker');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('role', user.role);
      sessionStorage.setItem('username', user.username);
      navigate(user.role === 'supervisor' ? '/supervisor' : '/admin');
    } catch (err) {
      const msg = err.response?.data?.msg || 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full rounded-xl border border-line bg-glass px-4 py-3.5 text-[14px] text-t1 placeholder:text-t4 outline-none backdrop-blur-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/30';

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="flex min-h-screen w-full bg-bg text-t1 transition-colors duration-500">

      {/* ── LEFT — Video identity panel ── */}
      <div className="relative hidden w-[46%] overflow-hidden lg:flex">
        <VideoBackground src={VIDEOS.cinematic} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/85" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.05 }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between px-14 py-14">
          <div className="pt-8 text-media-1">
            <BrandMark size={20} />
          </div>

          <div>
            <h2 className="text-[clamp(30px,3.4vw,44px)] font-light leading-[1.08] tracking-[-0.02em] text-media-1">
              <span className="block"><ScrambleIn text="Zero tolerance" delay={200} triggered={ready} /></span>
              <span className="block"><ScrambleIn text="for unsafe sites." delay={520} triggered={ready} /></span>
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.4 }}
              className="mt-5 max-w-sm text-[14px] leading-relaxed text-media-2"
            >
              Sites using Sentinel report a <strong className="text-media-1">67% reduction</strong> in
              PPE violations within the first month of deployment.
            </motion.p>

            <div className="mt-10 grid grid-cols-2 gap-3">
              {STATS.map(([val, lbl], i) => (
                <motion.div
                  key={lbl}
                  initial={{ opacity: 0, y: 16 }}
                  animate={ready ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                  className="rounded-xl border border-glass-border bg-[var(--on-media-glass)] p-4 backdrop-blur-md"
                >
                  <p className="text-[22px] font-light tracking-tight text-media-1">{val}</p>
                  <p className="mt-1 text-[12px] text-media-3">{lbl}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-media-3">© {new Date().getFullYear()} Sentinel PPE Monitor</p>
        </div>
      </div>

      {/* ── RIGHT — Login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="mb-10 flex justify-center text-t1 lg:hidden">
            <BrandMark size={20} />
          </div>

          <div className="mb-9">
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.2em] text-accent">
              Dashboard Access
            </p>
            <h1 className="text-[clamp(30px,5vw,42px)] font-light leading-tight tracking-[-0.02em] text-t1">
              <ScrambleIn text="Sign in to your account" delay={250} triggered={ready} />
            </h1>
            <p className="mt-3 text-[14px] text-t3">
              Enter your credentials to continue monitoring your site.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-t4">
                Username or Email
              </label>
              <input
                name="username"
                type="text"
                placeholder="username or you@example.com"
                autoComplete="username"
                required
                onChange={handleChange}
                className={inputBase}
              />
              <p className="mt-1.5 text-[11px] text-t4">
                You can sign in with either your username or your email address.
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[12px] font-medium uppercase tracking-[0.14em] text-t4">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[12px] font-medium text-accent hover:brightness-110">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  onChange={handleChange}
                  className={`${inputBase} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-t4 transition-colors hover:text-t2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 font-display text-[15px] font-medium text-accent-contrast transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-contrast/40 border-t-accent-contrast" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>

            {/* Worker notice */}
            {error === 'worker' && (
              <div className="mt-4 flex gap-3 rounded-xl border border-glass-border bg-glass p-4 backdrop-blur-sm">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Smartphone size={16} />
                </span>
                <div>
                  <p className="text-[14px] font-medium text-t1">Use the Mobile App</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-t3">
                    Site Worker accounts are accessed via the <strong className="text-t2">PPE Monitoring mobile app</strong>.
                    This web portal is for Safety Officers and Admins only.
                  </p>
                </div>
              </div>
            )}
            {error && error !== 'worker' && (
              <div className="mt-4 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                  <AlertCircle size={16} />
                </span>
                <div>
                  <p className="text-[14px] font-medium text-red-400">Login Failed</p>
                  <p className="mt-0.5 text-[13px] text-red-400/80">{error}</p>
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
