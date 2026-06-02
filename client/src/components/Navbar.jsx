import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn } from 'lucide-react';
import SquashHamburger from './landing/SquashHamburger';
import ScrambleText from './landing/ScrambleText';
import NavLink from './landing/NavLink';
import ThemeToggle from './landing/ThemeToggle';
import BrandMark from './landing/BrandMark';
import SentinelLogo from './landing/SentinelLogo';

export const PPELogo = SentinelLogo;

const menuSpring = { type: 'spring', stiffness: 350, damping: 28 };

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [signHover, setSignHover] = useState(false);
  const [signHoverM, setSignHoverM] = useState(false);
  const navigate = useNavigate();

  const go = (to) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 z-50 h-20 w-full px-4 sm:px-6 md:px-8">
      {/* DESKTOP */}
      <div className="hidden h-full items-center justify-between sm:flex">
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')}
            className={`h-12 cursor-pointer items-center rounded-[14px] border border-glass-border bg-[var(--on-media-glass)] px-5 text-media-1 backdrop-blur-md transition-[filter] hover:brightness-125 ${
              open ? 'hidden md:flex' : 'flex'
            }`}
          >
            <BrandMark size={18} />
          </motion.div>

          <motion.div
            initial={false}
            animate={{ width: open ? 340 : 48 }}
            transition={menuSpring}
            className="flex h-12 items-center overflow-hidden rounded-[14px] border border-glass-border bg-[var(--on-media-glass)] backdrop-blur-md"
          >
            <motion.button
              type="button"
              onClick={() => setOpen((v) => !v)}
              initial={false}
              animate={{
                width: open ? 36 : 48,
                height: open ? 36 : 48,
                borderRadius: open ? 11 : 14,
              }}
              transition={menuSpring}
              className={`flex flex-shrink-0 items-center justify-center ${
                open ? 'ml-1.5 bg-white/10 hover:bg-white/20' : ''
              }`}
              aria-label="Toggle menu"
            >
              <SquashHamburger isOpen={open} />
            </motion.button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="flex items-center gap-5 whitespace-nowrap pl-4 pr-2"
                >
                  {NAV_LINKS.map((l) => (
                    <NavLink
                      key={l.label}
                      label={l.label}
                      onClick={() => go(l.to)}
                      className="text-[15px] font-normal"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle onMedia />
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={() => setSignHover(true)}
            onMouseLeave={() => setSignHover(false)}
            onClick={() => navigate('/login')}
            className="flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-accent-contrast transition-[filter] hover:brightness-110"
          >
            <LogIn size={17} />
            <ScrambleText
              text="Sign In"
              isHovered={signHover}
              className="font-display text-[15px] font-medium"
            />
          </motion.button>
        </div>
      </div>

      {/* MOBILE */}
      <div className="flex h-full items-center justify-between gap-2 sm:hidden">
        <div className="flex flex-1 items-center gap-2">
          <motion.div
            onClick={() => navigate('/')}
            initial={false}
            animate={{ width: open ? 0 : 'auto', opacity: open ? 0 : 1 }}
            transition={menuSpring}
            className="flex h-9 flex-shrink-0 cursor-pointer items-center overflow-hidden rounded-[10px] border border-glass-border bg-[var(--on-media-glass)] px-3 text-media-1 backdrop-blur-md"
          >
            <BrandMark size={14} mobile />
          </motion.div>

          <motion.div
            initial={false}
            animate={{ width: open ? '100%' : 36 }}
            transition={menuSpring}
            className="flex h-9 items-center overflow-hidden rounded-[10px] border border-glass-border bg-[var(--on-media-glass)] backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center ${
                open ? 'ml-1 rounded-[8px] bg-white/10' : ''
              }`}
              aria-label="Toggle menu"
            >
              <SquashHamburger isOpen={open} mobile />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="flex items-center gap-4 whitespace-nowrap pl-3 pr-2"
                >
                  {NAV_LINKS.map((l) => (
                    <NavLink
                      key={l.label}
                      label={l.label}
                      onClick={() => go(l.to)}
                      className="text-[13px] font-normal"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {!open && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <ThemeToggle mobile onMedia />
            <button
              type="button"
              onMouseEnter={() => setSignHoverM(true)}
              onMouseLeave={() => setSignHoverM(false)}
              onClick={() => navigate('/login')}
              className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 text-accent-contrast transition-[filter] hover:brightness-110"
            >
              <LogIn size={14} />
              <ScrambleText
                text="Sign In"
                isHovered={signHoverM}
                className="font-display text-[13px] font-medium"
              />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
