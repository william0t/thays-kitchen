interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 40, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pot body */}
        <path
          d="M18 38 C18 56 24 66 40 66 C56 66 62 56 62 38 L18 38 Z"
          fill="url(#logoGrad1)"
          opacity="0.95"
        />

        {/* Pot rim */}
        <rect x="14" y="33" width="52" height="8" rx="4" fill="url(#logoGrad1)" />

        {/* Handles */}
        <path
          d="M14 37 C8 37 6 30 12 29 L16 29 L16 36 L14 37Z"
          fill="url(#logoGrad2)"
          opacity="0.8"
        />
        <path
          d="M66 37 C72 37 74 30 68 29 L64 29 L64 36 L66 37Z"
          fill="url(#logoGrad2)"
          opacity="0.8"
        />

        {/* Steam wisps */}
        <path
          d="M32 28 C32 24 29 22 29 18 C29 14 32 12 32 8"
          stroke="url(#logoGrad2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M40 26 C40 22 37 20 37 16 C37 12 40 10 40 6"
          stroke="#f472b6"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M48 28 C48 24 45 22 45 18 C45 14 48 12 48 8"
          stroke="url(#logoGrad2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Sparkle accent */}
        <circle cx="58" cy="18" r="3" fill="#fbbf24" opacity="0.9" filter="url(#glow)" />
        <circle cx="22" cy="14" r="2" fill="#f472b6" opacity="0.8" filter="url(#glow)" />
      </svg>

      {/* Wordmark */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-bold tracking-tight gradient-text"
            style={{ fontSize: size * 0.38, letterSpacing: '-0.02em' }}
          >
            Thay&apos;s
          </span>
          <span
            className="font-light tracking-widest"
            style={{
              fontSize: size * 0.22,
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Kitchen
          </span>
        </div>
      )}
    </div>
  );
}
