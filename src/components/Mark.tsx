import { useId } from 'react';

// The Pulse Star — a Star of Life with an EKG channel carved through the mark
// and the heartbeat line nested inside. Geometry is exact six-fold rotation.
const ARMS = [
  'M-16,-24 L-24,-98 L24,-98 L16,-24 Z',
  'M12.78,-25.86 L72.87,-69.79 L96.87,-28.21 L28.78,-13.86 Z',
  'M28.78,13.86 L96.87,28.21 L72.87,69.79 L12.78,25.86 Z',
  'M16,24 L24,98 L-24,98 L-16,24 Z',
  'M-12.78,25.86 L-72.87,69.79 L-96.87,28.21 L-28.78,13.86 Z',
  'M-28.78,-13.86 L-96.87,-28.21 L-72.87,-69.79 L-12.78,-25.86 Z',
];
const EKG_CUT = 'M-120,0 H-44 L-36,8 L-20,-34 L-4,22 L8,-10 L18,0 H120';
const EKG_LINE = 'M-94,0 H-44 L-36,8 L-20,-34 L-4,22 L8,-10 L18,0 H94';

export default function Mark({
  className = 'w-11 h-11',
  variant = 'blue',
  red = '#FF5A62',
  pulse = true,
}: {
  className?: string;
  variant?: 'blue' | 'gold';
  red?: string;
  pulse?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const gradId = `${uid}g`;
  const fill = variant === 'gold' ? `url(#${gradId})` : '#2F6BFF';
  // Gradient strokes can't join seamlessly across the six arm paths the way a
  // flat color does, so gold arms use a solid mid-gold stroke for the joins.
  const stroke = variant === 'gold' ? '#D9AC33' : '#2F6BFF';
  return (
    <svg viewBox="-120 -120 240 240" className={className} aria-hidden="true">
      <defs>
        {variant === 'gold' && (
          <linearGradient id={gradId} x1="0" y1="-1" x2="0.35" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#F5CE5A" />
            <stop offset="0.55" stopColor="#DFAF37" />
            <stop offset="1" stopColor="#B18516" />
          </linearGradient>
        )}
        <mask id={uid}>
          <rect x="-120" y="-120" width="240" height="240" fill="#fff" />
          <path
            d={EKG_CUT}
            fill="none"
            stroke="#000"
            strokeWidth={pulse ? 13 : 18}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <g mask={`url(#${uid})`}>
        {ARMS.map((d, i) => (
          <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth="8" strokeLinejoin="round" />
        ))}
        <circle r="30" fill={fill} />
      </g>
      {pulse && (
        <path
          d={EKG_LINE}
          fill="none"
          stroke={red}
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
