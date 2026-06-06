import { motion } from 'framer-motion';
import { Check, X, AlertTriangle } from 'lucide-react';

const BOXES = [
  { label: 'Helmet', ok: true, style: { top: '10%', left: '30%', width: '38%', height: '26%' } },
  { label: 'Vest', ok: false, style: { top: '40%', left: '24%', width: '50%', height: '34%' } },
  { label: 'Glove', ok: true, style: { top: '62%', left: '10%', width: '20%', height: '18%' } },
];

export default function FloatingDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 1.1, ease: [0.215, 0.61, 0.355, 1.0] }}
      className="w-full max-w-sm rounded-2xl border border-glass-border bg-[rgba(5,10,15,0.55)] p-4 backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="font-display text-[13px] font-medium text-media-1">Live Feed</span>
        </div>
        <span className="text-[11px] tracking-wide text-media-3">CAM-01 · North Gate</span>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#12202b] via-[#0b141c] to-[#1a1030]">
        <motion.div
          className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-accent/10 to-transparent"
          animate={{ top: ['-20%', '110%'] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
        />
        {BOXES.map((b, i) => (
          <motion.div key={b.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 + i * 0.25, duration: 0.4 }} className="absolute" style={b.style}>
            <div className={`h-full w-full rounded-[3px] border-2 ${b.ok ? 'border-accent' : 'border-red-500'}`} />
            <span className={`absolute -top-[18px] left-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${b.ok ? 'bg-accent text-accent-contrast' : 'bg-red-500 text-white'}`}>
              {b.label}
              {b.ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, duration: 0.4 }}
        className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2"
      >
        <AlertTriangle size={15} className="flex-shrink-0 text-red-400" />
        <span className="text-[12px] text-media-1">
          <span className="font-medium text-red-300">Violation:</span> Missing safety vest
        </span>
      </motion.div>
    </motion.div>
  );
}
