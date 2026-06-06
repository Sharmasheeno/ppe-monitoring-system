import { motion } from 'framer-motion';

const spring = { type: 'spring', stiffness: 300, damping: 20 };

export default function SquashHamburger({ isOpen, mobile = false }) {
  const width = mobile ? 15 : 18;
  const height = mobile ? 10 : 12;
  const bar = mobile ? 1.2 : 1.5;
  const center = height / 2 - bar / 2;
  const top = 0;
  const bottom = height - bar;

  const barStyle = {
    position: 'absolute',
    left: 0,
    width,
    height: bar,
    borderRadius: 999,
    background: '#fff',
  };

  return (
    <span style={{ position: 'relative', width, height, display: 'inline-block' }}>
      <motion.span style={{ ...barStyle, top }} animate={isOpen ? { top: center, rotate: 45 } : { top, rotate: 0 }} transition={spring} />
      <motion.span style={{ ...barStyle, top: center }} animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }} transition={spring} />
      <motion.span style={{ ...barStyle, top: bottom }} animate={isOpen ? { top: center, rotate: -45 } : { top: bottom, rotate: 0 }} transition={spring} />
    </span>
  );
}
