import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { VIDEOS } from '../videos';
import ScrambleIn from '../components/landing/ScrambleIn';
import VideoBackground from '../components/landing/VideoBackground';

const HIGHLIGHTS = [
  { icon: Clock, title: 'Fast response', desc: 'An admin reviews every message and gets back to you quickly.' },
  { icon: ShieldCheck, title: 'No spam, ever', desc: 'Your details are used only to answer your enquiry.' },
  { icon: MessageSquare, title: 'Real answers', desc: 'Ask anything about deploying Sentinel on your site.' },
];

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await axios.post('http://localhost:5001/api/messages', formData);
      setStatus('success');
      setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
      setTimeout(() => setStatus(''), 5000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const inputBase =
    'w-full rounded-xl border border-line bg-glass px-4 py-3.5 text-[14px] text-t1 placeholder:text-t4 outline-none backdrop-blur-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/30';

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="relative w-full bg-bg text-t1 transition-colors duration-500">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative flex min-h-[52vh] w-full items-center overflow-hidden pt-24 pb-16">
        <VideoBackground src={VIDEOS.metrics} />
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
            Get in Touch
          </motion.span>

          <h1 className="max-w-3xl text-[clamp(34px,6vw,64px)] font-light leading-[1.05] tracking-[-0.03em] text-media-1">
            <span className="block"><ScrambleIn text="Let's talk about" delay={200} triggered={ready} /></span>
            <span className="block"><ScrambleIn text="protecting your site" delay={520} triggered={ready} /></span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-media-2"
          >
            Have questions about deploying Sentinel in your facility? Send a message and an admin
            will get back to you.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════ FORM + HIGHLIGHTS ═══════════════ */}
      <section className="relative w-full bg-bg py-20 transition-colors duration-500 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-6 md:grid-cols-[1fr_1.3fr]">

          {/* Left — highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9 }}
            className="flex flex-col gap-5"
          >
            <div className="mb-1 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-contrast">
                <Mail size={20} />
              </span>
              <div>
                <p className="text-[13px] uppercase tracking-[0.18em] text-accent">Contact</p>
                <p className="text-[15px] text-t2">We'd love to hear from you</p>
              </div>
            </div>
            {HIGHLIGHTS.map((h, i) => {
              const Icon = h.icon;
              return (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  className="flex gap-4 rounded-2xl border border-glass-border bg-glass p-5 backdrop-blur-sm"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-glass-border bg-glass text-accent">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="text-[15px] font-medium text-t1">{h.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-t3">{h.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="rounded-3xl border border-glass-border bg-glass p-8 backdrop-blur-sm sm:p-10"
          >
            {status === 'success' && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-glass-border bg-accent/10 p-4">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-accent" />
                <p className="text-[13px] leading-relaxed text-t2">
                  Your message has been sent successfully. An admin will review it shortly.
                </p>
              </div>
            )}
            {status === 'error' && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
                <p className="text-[13px] leading-relaxed text-red-400">
                  Failed to send message. Please try again.
                </p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-t4">Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your name" className={inputBase} />
                </div>
                <div>
                  <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-t4">Email</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@company.com" className={inputBase} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-t4">Subject</label>
                <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="General Inquiry" className={inputBase} />
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-t4">Message</label>
                <textarea required rows="5" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Tell us about your site and what you'd like to monitor…" className={`${inputBase} resize-none`} />
              </div>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 font-display text-[15px] font-medium text-accent-contrast transition-[filter] hover:brightness-110 disabled:opacity-60"
              >
                {status === 'sending' ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-contrast/40 border-t-accent-contrast" />
                ) : (
                  <>
                    Send Message
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
