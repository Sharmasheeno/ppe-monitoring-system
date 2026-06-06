import { useEffect, useRef, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><';
const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

export default function ScrambleIn({ text, delay, triggered }) {
  const [display, setDisplay] = useState(null);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!triggered) { setDisplay(null); progressRef.current = 0; return; }
    let intervalId;
    const timeoutId = setTimeout(() => {
      progressRef.current = 0;
      intervalId = setInterval(() => {
        progressRef.current += 0.5;
        const reveal = Math.floor(progressRef.current);
        let out = '';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === ' ') out += ' ';
          else if (i < reveal) out += ch;
          else if (i < reveal + 3) out += randomChar();
        }
        setDisplay(out);
        if (reveal >= text.length) { setDisplay(text); if (intervalId) clearInterval(intervalId); }
      }, 25);
    }, delay);
    return () => { clearTimeout(timeoutId); if (intervalId) clearInterval(intervalId); };
  }, [triggered, text, delay]);

  if (display === null) return <span dangerouslySetInnerHTML={{ __html: '&nbsp;' }} />;
  return <span style={{ whiteSpace: 'pre' }}>{display}</span>;
}
