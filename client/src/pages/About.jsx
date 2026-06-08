import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Eye, Cpu, Server, Layout, Smartphone, ArrowRight } from 'lucide-react';
import { VIDEOS } from '../videos';
import ScrambleIn from '../components/landing/ScrambleIn';
import VideoBackground from '../components/landing/VideoBackground';

const STACK = [
  { icon: Cpu, title: 'Computer Vision', desc: 'A YOLOv8 model trained on a 12,512-image dataset detects hard hats, safety vests, and gloves frame by frame.', tags: ['Python', 'YOLOv8', 'OpenCV'] },
  { icon: Server, title: 'Real-time Backend', desc: 'An Express server streams detections and pushes instant violation alerts over Socket.IO and MQTT.', tags: ['Node.js', 'Socket.IO', 'MongoDB'] },
  { icon: Layout, title: 'Interactive Frontend', desc: 'A React dashboard visualises every camera, logs violations, and surfaces live analytics.', tags: ['React 18', 'Vite', 'Tailwind'] },
  { icon: Smartphone, title: 'Cross-platform Mobile', desc: 'A Flutter companion app keeps site workers and supervisors connected on the ground.', tags: ['Flutter', 'Dart'] },
];

const About = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="relative w-full bg-bg text-t1 transition-colors duration-500">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative flex min-h-[70vh] w-full items-center overflow-hidden pt-24 pb-16">
        <VideoBackground src={VIDEOS.cinematic} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.05 }}
        />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="mb-6 flex w-fit items-center gap-2 rounded-full border border-glass-border bg-[var(--on-media-glass)] px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-media-1 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            About The Project
          </motion.span>

          <h1 className="max-w-3xl text-[clamp(34px,6vw,64px)] font-light leading-[1.05] tracking-[-0.03em] text-media-1">
            <span className="block"><ScrambleIn text="Safety, automated" delay={200} triggered={ready} /></span>
            <span className="block"><ScrambleIn text="one frame at a time" delay={520} triggered={ready} /></span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-media-2"
          >
            The PPE Monitoring System is a comprehensive safety solution that prevents workplace
            accidents before they happen. Using AI and computer vision, it acts as an always-on
            safety officer that never blinks.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════ MISSION / VISION ═══════════════ */}
      <section className="relative w-full bg-bg py-24 transition-colors duration-500 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-2">
          {[
            { icon: Target, tag: 'Our Mission', title: 'Every worker returns home safely.', desc: 'We use cutting-edge technology to make PPE compliance automated, instant, and transparent — so no violation slips through unnoticed on a busy site.' },
            { icon: Eye, tag: 'Our Vision', title: 'A zero-incident worksite.', desc: 'We believe safety should not depend on someone happening to look at the right camera at the right moment. Sentinel watches every frame, on every feed, all the time.' },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.tag}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
                className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass p-8 backdrop-blur-sm transition-colors duration-500"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-60" style={{ background: 'var(--grad-vest)' }} />
                <div className="relative">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-contrast">
                    <Icon size={22} />
                  </div>
                  <p className="mb-3 text-[13px] uppercase tracking-[0.2em] text-accent">{c.tag}</p>
                  <h3 className="mb-3 text-[22px] font-light leading-tight tracking-[-0.02em] text-t1">{c.title}</h3>
                  <p className="text-[14px] leading-relaxed text-t3">{c.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ TECH / HOW IT'S BUILT ═══════════════ */}
      <section className="relative w-full overflow-hidden py-24 sm:py-28">
        <VideoBackground src={VIDEOS.technology} />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
            className="mb-14 max-w-2xl"
          >
            <p className="mb-5 text-[13px] uppercase tracking-[0.2em] text-accent">How It's Built</p>
            <h2 className="text-[clamp(28px,5vw,48px)] font-light leading-[1.1] tracking-[-0.03em] text-media-1">
              Four layers, one mission.
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2">
            {STACK.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: i * 0.1 }}
                  className="rounded-2xl border border-glass-border bg-[var(--on-media-glass)] p-7 backdrop-blur-md"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-glass-border bg-[var(--on-media-glass)] text-accent backdrop-blur-md">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-2 text-[18px] font-medium text-media-1">{s.title}</h3>
                  <p className="mb-5 text-[14px] leading-relaxed text-media-2">{s.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <span key={t} className="rounded-full border border-glass-border bg-[var(--on-media-glass)] px-3 py-1 font-display text-[12px] font-medium text-media-1 backdrop-blur-md">
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ THE TEAM ═══════════════ */}
      <section className="relative w-full bg-bg py-24 transition-colors duration-500 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.0 }}
            className="relative overflow-hidden rounded-3xl border border-glass-border bg-glass p-10 text-center backdrop-blur-sm sm:p-14"
          >
            <p className="mb-5 text-[13px] uppercase tracking-[0.2em] text-accent">The Team</p>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-[28px] font-semibold text-accent-contrast" style={{ background: 'var(--grad-vest)' }}>
              S
            </div>
            <h3 className="text-[24px] font-light tracking-[-0.02em] text-t1">Sharmake</h3>
            <p className="mt-1 text-[14px] text-accent">Software Engineer · AI Integration & Full-Stack</p>
            <p className="mx-auto mt-5 max-w-lg text-[14px] leading-relaxed text-t3">
              A dedicated engineer specialising in AI integration and full-stack development. This
              project brings computer vision, real-time systems, web, and mobile together into a
              single safety platform.
            </p>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="mx-auto mt-8 flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-[14px] font-medium text-accent-contrast transition-[filter] hover:brightness-110"
            >
              Get in touch
              <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
