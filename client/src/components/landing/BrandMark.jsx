import SentinelLogo from './SentinelLogo';

export default function BrandMark({ size = 18, mobile = false, className = '' }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <SentinelLogo size={size} className="text-accent" />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-semibold tracking-tight ${mobile ? 'text-[12px]' : 'text-[15px]'}`}>
          SENTINEL
        </span>
        <span className={`font-display font-medium tracking-[0.18em] opacity-60 ${mobile ? 'text-[7px]' : 'text-[9px]'}`}>
          PPE MONITOR
        </span>
      </span>
    </span>
  );
}
