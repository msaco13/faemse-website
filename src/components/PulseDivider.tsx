// The EKG pulse divider — one heartbeat crossing a long flatline.
// A design-system motif (PLAN.md §9): the single living line between sections.
export default function PulseDivider({
  color = '#DFAF37',
  className = '',
}: {
  color?: string;
  className?: string;
}) {
  return (
    <div className={`wrap ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1180 64" fill="none" className="w-full h-[42px]" preserveAspectRatio="none">
        <path
          d="M0 32 H492 l16 0 11 -18 15 38 13 -30 9 10 h624"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="556" cy="32" r="3.5" fill={color}>
          <animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
