import { useState } from 'react';
import ScrambleText from './ScrambleText';

export default function NavLink({ label, onClick, className = '' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`text-white/85 hover:text-white transition-colors ${className}`}
    >
      <ScrambleText text={label} isHovered={hovered} />
    </button>
  );
}
