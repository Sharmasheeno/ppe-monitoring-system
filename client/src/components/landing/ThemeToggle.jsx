import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ mobile = false, onMedia = false }) {
  const { isDark, toggleTheme } = useTheme();
  const dim = mobile ? 'h-9 w-9' : 'h-12 w-12';
  const icon = mobile ? 15 : 18;
  const surface = onMedia ? 'bg-[var(--on-media-glass)] text-media-1' : 'bg-glass text-t1';

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`${dim} flex flex-shrink-0 items-center justify-center rounded-full border border-glass-border backdrop-blur-md ${surface}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'dark' : 'light'}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          {isDark ? <Moon size={icon} /> : <Sun size={icon} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
