export default function VideoBackground({ src, className = '' }) {
  return (
    <video
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
}
