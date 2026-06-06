import { useEffect, useRef, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><';
const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];
const FRAMES_PER_CHAR = 4;

export default function ScrambleText({ text, isHovered, className = '' }) {
  const [display, setDisplay] = useState(text);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!isHovered) { setDisplay(text); return; }
    frameRef.current = 0;
    const intervalId = setInterval(() => {
      frameRef.current += 1;
      const reveal = Math.floor(frameRef.current / FRAMES_PER_CHAR);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ' ') out += ' ';
        else if (i < reveal) out += ch;
        else out += randomChar();
      }
      setDisplay(out);
      if (reveal >= text.length) { setDisplay(text); clearInterval(intervalId); }
    }, 25);
    return () => clearInterval(intervalId);
  }, [isHovered, text]);

  return <span className={className} style={{ whiteSpace: 'pre' }}>{display}</span>;
}
