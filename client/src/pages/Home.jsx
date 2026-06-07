import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, HardHat, Shirt, Hand, Camera, ScanEye, AlertTriangle, BellRing, Check, LogIn } from 'lucide-react';
import { VIDEOS } from '../videos';
import ScrambleIn from '../components/landing/ScrambleIn';
import FloatingDashboard from '../components/landing/FloatingDashboard';
import VideoBackground from '../components/landing/VideoBackground';
import BrandMark from '../components/landing/BrandMark';

/* ── Hero mouse-scrub video ── */
const SENSITIVITY = 0.8;

/* ── Stats data ── */
const STATS = [
  { target: 98.6, decimals: 1, suffix: '%', label: 'Detection Accuracy' },
  { staticValue: '<1s', label: 'Alert Delivery' },
  { target: 12512, label: 'Dataset Images' },
  { staticValue: '24/7', label: 'Live Monitoring' },
];

function formatNumber(n, decimals) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function AnimatedValue({ stat }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView || stat.target === undefined) return;
    const duration = 1600;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(stat.target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, stat.target]);

  return (
    <span ref={ref}>
      {stat.staticValue !== undefined
        ? stat.staticValue
        : `${stat.prefix ?? ''}${formatNumber(val, stat.decimals ?? 0)}${stat.suffix ?? ''}`}
    </span>
  );
}

/* ── PPE Classes ── */
const CLASSES = [
  {
    icon: HardHat,
    name: 'Hard Hat',
    map: '96.1%',
    gradient: 'var(--grad-helmet)',
    desc: 'Detects helmets and hard hats on every worker, instantly flagging any uncovered head across the frame.',
  },
  {
    icon: Shirt,
    name: 'Safety Vest',
    map: '98.6%',
    gradient: 'var(--grad-vest)',
    desc: 'Identifies high-visibility safety vests so workers stay seen and compliant on active, high-traffic sites.',
  },
  {
    icon: Hand,
    name: 'Glove Detection',
    map: '93.3%',
    gradient: 'var(--grad-glove)',
    desc: 'Recognizes protective gloves during manual tasks where hand injuries are most likely to occur.',
  },
];

/* ── How It Works ── */
const STEPS = [
  { icon: Camera, title: 'Connect Camera', desc: 'Point any IP or USB camera at your worksite and stream it straight into Sentinel.' },
  { icon: ScanEye, title: 'AI Analyses Frames', desc: 'A YOLOv8 model inspects every frame in real time, detecting PPE on each worker.' },
  { icon: AlertTriangle, title: 'Violations Flagged', desc: 'Missing helmets, vests, or gloves are flagged the instant they enter the frame.' },
  { icon: BellRing, title: 'Alerts Delivered', desc: 'Supervisors receive instant alerts with a screenshot of every logged violation.' },
];

/* ── Live Detection features ── */
const FEATURES = [
  'Low-latency MJPEG live video stream',
  'Multi-camera monitoring from one dashboard',
  'Real-time Socket.IO violation alerts',
  'Automatic screenshots of every violation',
];

/* ── Tech Stack ── */
const TECH = ['YOLOv8', 'Python', 'React 18', 'Node.js', 'MongoDB', 'Flutter', 'Socket.IO', 'OpenCV'];

/* ── Mini Stats ── */
const MINI_STATS = [
  { value: '98.6%', label: 'Accuracy' },
  { value: '<1s', label: 'Alert' },
  { value: '3', label: 'PPE Classes' },
];

/* ── Footer links ── */
const FOOTER_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Dashboard', to: '/login' },
];

const Home = () => {
  const navigate = useNavigate();
  const [entranceComplete, setEntranceComplete] = useState(false);
  const videoRef = useRef(null);
  const targetTimeRef = useRef(0);
  const lastXRef = useRef(null);
  const seekingRef = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => setEntranceComplete(true), 800);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clamp = (t) => {
      const d = video.duration || 0;
      if (!d || !isFinite(d)) return 0;
      return Math.max(0, Math.min(d - 0.0001, t));
    };

    const seekToTarget = () => {
      if (seekingRef.current) return;
      const target = clamp(targetTimeRef.current);
      if (Math.abs(target - video.currentTime) < 0.001) return;
      seekingRef.current = true;
      video.currentTime = target;
    };

    const onSeeked = () => {
      seekingRef.current = false;
      const target = clamp(targetTimeRef.current);
      if (Math.abs(target - video.currentTime) >= 0.001) seekToTarget();
    };

    const onLoaded = () => {
      video.pause();
      video.currentTime = 0;
      targetTimeRef.current = 0;
    };

    const onMouseMove = (e) => {
      if (lastXRef.current === null) { lastXRef.current = e.clientX; return; }
      const deltaX = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      const duration = video.duration || 0;
      if (!duration || !isFinite(duration)) return;
      const secondsPerPixel = (duration / window.innerWidth) * SENSITIVITY;
      targetTimeRef.current = clamp(targetTimeRef.current + deltaX * secondsPerPixel);
      seekToTarget();
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('seeked', onSeeked);
    window.addEventListener('mousemove', onMouseMove);
    if (video.readyState >= 1) onLoaded();

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('seeked', onSeeked);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="relative w-full bg-bg text-t1 transition-colors duration-500">

      {/* ═══════════════════════════════════ HERO ═══════════════════════════════════ */}
      <section className="relative h-screen w-full overflow-hidden" style={{ height: '100dvh' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEOS.hero}
          muted
          playsInline
          preload="auto"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.05 }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: entranceComplete ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 flex h-full items-center px-4 pt-20 sm:px-6 md:px-8"
        >
          <div className="grid w-full items-center gap-10 md:grid-cols-2 md:gap-12">
            <div className="flex flex-col gap-6">
              <motion.span
                initial={{ opacity: 0, y: 15 }}
                animate={entranceComplete ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="flex w-fit items-center gap-2 rounded-full border border-glass-border bg-[var(--on-media-glass)] px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-media-1 backdrop-blur-md"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                AI-Powered Construction Safety
              </motion.span>

              <h1 className="text-[clamp(38px,6.5vw,72px)] font-light leading-[1.02] tracking-[-0.03em] text-media-1">
                <span className="block">
                  <ScrambleIn text="Protecting workers" delay={200} triggered={entranceComplete} />
                </span>
                <span className="block">
                  <ScrambleIn text="with every frame" delay={550} triggered={entranceComplete} />
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={entranceComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
                transition={{ duration: 0.9, ease: [0.215, 0.61, 0.355, 1.0], delay: 0.25 }}
                className="max-w-md text-[14px] leading-relaxed text-media-2 sm:text-[15px]"
              >
                Sentinel watches your worksite in real time, detecting hard hats, safety vests, and
                gloves on every worker and flagging violations the instant they appear.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={entranceComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-[14px] font-medium text-accent-contrast transition-[filter] hover:brightness-110"
                >
                  Sign In to Dashboard
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-full border border-glass-border bg-[var(--on-media-glass)] px-6 py-3 font-display text-[14px] font-medium text-media-1 backdrop-blur-md transition-[filter] hover:brightness-125"
                >
                  Learn More
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={entranceComplete ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.9, delay: 0.6 }}
                className="mt-2 flex gap-8"
              >
                {MINI_STATS.map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="text-[22px] font-light tracking-tight text-media-1">{s.value}</span>
                    <span className="text-[12px] text-media-3">{s.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            <div className="hidden justify-center md:flex md:justify-end">
              <FloatingDashboard />
            </div>
          </div>
        </motion.div>
      </section>


      {/* ═══════════════════════════════════ STATS ═══════════════════════════════════ */}
      <section className="relative w-full overflow-hidden py-24 sm:py-28">
        <VideoBackground src={VIDEOS.metrics} />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-14 px-6 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="text-center"
            >
              <div className="text-[clamp(34px,6vw,56px)] font-light leading-none tracking-[-0.03em] text-media-1">
                <AnimatedValue stat={s} />
              </div>
              <div className="mt-3 text-[12px] uppercase tracking-[0.15em] text-media-3 sm:text-[13px]">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>


      {/* ═══════════════════════════════════ PPE CLASSES ═══════════════════════════════════ */}
      <section className="relative w-full bg-bg py-28 transition-colors duration-500 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
            className="mb-16 max-w-2xl"
          >
            <p className="mb-5 text-[13px] uppercase tracking-[0.2em] text-accent sm:text-[14px]">
              PPE Detection
            </p>
            <h2 className="text-[clamp(30px,6vw,56px)] font-light leading-[1.1] tracking-[-0.03em] text-t1">
              Three PPE classes.
              <br />
              Zero blind spots.
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {CLASSES.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, delay: i * 0.15 }}
                  className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass p-7 backdrop-blur-sm transition-colors duration-500"
                >
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
                    style={{ background: c.gradient }}
                  />
                  <div className="relative">
                    <div
                      className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl text-white"
                      style={{ background: c.gradient }}
                    >
                      <Icon size={22} />
                    </div>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <h3 className="text-[19px] font-medium text-t1">{c.name}</h3>
                      <span className="font-display text-[13px] font-medium text-accent">{c.map} mAP@50</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-t3 sm:text-[14px]">{c.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════ HOW IT WORKS ═══════════════════════════════════ */}
      <section id="how-it-works" className="relative w-full overflow-hidden py-28 sm:py-32">
        <VideoBackground src={VIDEOS.cinematic} />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
            className="mb-16 max-w-2xl"
          >
            <p className="mb-5 text-[13px] uppercase tracking-[0.2em] text-accent sm:text-[14px]">
              How It Works
            </p>
            <h2 className="text-[clamp(30px,6vw,56px)] font-light leading-[1.1] tracking-[-0.03em] text-media-1">
              From camera to alert in milliseconds.
            </h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: i * 0.12 }}
                >
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-glass-border bg-[var(--on-media-glass)] text-accent backdrop-blur-md">
                      <Icon size={19} />
                    </span>
                    <span className="font-display text-[13px] font-medium text-media-3">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mb-2 text-[16px] font-medium text-media-1 sm:text-[18px]">{s.title}</h3>
                  <p className="text-[13px] leading-relaxed text-media-2 sm:text-[14px]">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════ LIVE DETECTION ═══════════════════════════════════ */}
      <section className="relative w-full bg-bg py-28 transition-colors duration-500 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
          >
            <p className="mb-5 text-[13px] uppercase tracking-[0.2em] text-accent sm:text-[14px]">
              Live Detection
            </p>
            <h2 className="mb-8 text-[clamp(28px,5vw,48px)] font-light leading-[1.12] tracking-[-0.03em] text-t1">
              See every camera, catch every violation.
            </h2>
            <ul className="flex flex-col gap-4">
              {FEATURES.map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-[14px] text-t2 sm:text-[15px]">{f}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.0, delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-glass-border"
          >
            <video
              className="aspect-[4/3] w-full object-cover"
              src={VIDEOS.technology}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-[11px] font-medium tracking-wide text-white">LIVE · CAM-02</span>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════════════════════ TECH STACK ═══════════════════════════════════ */}
      <section className="relative w-full bg-bg py-24 transition-colors duration-500 sm:py-28">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9 }}
          >
            <p className="mb-5 text-[13px] uppercase tracking-[0.2em] text-accent sm:text-[14px]">
              Tech Stack
            </p>
            <h2 className="mb-12 text-[clamp(26px,5vw,44px)] font-light leading-[1.15] tracking-[-0.02em] text-t1">
              Built on a modern, battle-tested stack.
            </h2>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {TECH.map((t, i) => (
              <motion.span
                key={t}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-full border border-glass-border bg-glass px-5 py-2.5 font-display text-[14px] font-medium text-t2 backdrop-blur-sm transition-colors duration-500"
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════ CTA ═══════════════════════════════════ */}
      <section className="relative w-full bg-bg px-6 py-20 transition-colors duration-500">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.0 }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-16"
          style={{ background: 'linear-gradient(135deg, #00d084 0%, #007a45 100%)' }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[clamp(30px,5vw,52px)] font-light leading-[1.1] tracking-[-0.03em] text-white">
              Start protecting your site today
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[14px] leading-relaxed text-white/80 sm:text-[15px]">
              Turn any camera into an always-on safety inspector. No new hardware required.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mx-auto mt-9 flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-display text-[15px] font-semibold text-[#04140d] transition-[filter] hover:brightness-95"
            >
              <LogIn size={17} />
              Sign In
            </button>
          </div>
        </motion.div>
      </section>


      {/* ═══════════════════════════════════ FOOTER ═══════════════════════════════════ */}
      <footer className="relative flex min-h-[380px] w-full flex-col overflow-hidden bg-bg transition-colors duration-500 md:flex-row">
        <div className="relative h-[260px] w-full overflow-hidden md:h-auto md:w-1/2">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={VIDEOS.footer}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>

        <div className="flex w-full flex-col justify-between p-10 sm:p-16 md:w-1/2">
          <div>
            <BrandMark size={20} className="mb-8 text-t1" />
            <p className="max-w-sm text-[14px] leading-relaxed text-t3 sm:text-[15px]">
              AI-powered PPE monitoring that keeps construction and industrial sites compliant,
              one frame at a time.
            </p>
            <nav className="mt-8 flex flex-wrap gap-6">
              {FOOTER_LINKS.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  className="text-[14px] text-t2 transition-colors hover:text-accent"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="mt-12 text-[12px] text-t5">
            © {new Date().getFullYear()} Sentinel PPE Monitor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
