type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  tagline?: boolean;
};

export default function Logo({
  size = 40,
  showWordmark = true,
  tagline = false,
}: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Sideline Pro logo"
      >
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8C988" />
            <stop offset="55%" stopColor="#D4A857" />
            <stop offset="100%" stopColor="#B8893A" />
          </linearGradient>
        </defs>
        <path
          d="M62 18 C58 11 49 8 38 8 C22 8 12 16 12 28 C12 38 19 43 34 46 L46 48 C54 49 57 51 57 56 C57 61 51 64 41 64 C30 64 23 61 18 53 L10 60 C16 70 27 74 41 74 C58 74 68 66 68 54 C68 44 61 39 46 36 L34 34 C26 33 23 31 23 27 C23 22 29 19 38 19 C47 19 53 22 56 28 Z"
          fill="url(#goldGrad)"
        />
      </svg>
      {showWordmark && (
        <div className="leading-none">
          <div className="font-black tracking-tight text-xl sm:text-2xl">
            <span className="text-white">SIDELINE</span>{" "}
            <span className="gold-gradient">PRO</span>
          </div>
          {tagline && (
            <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gold">
              Complete Club Management
            </div>
          )}
        </div>
      )}
    </div>
  );
}
