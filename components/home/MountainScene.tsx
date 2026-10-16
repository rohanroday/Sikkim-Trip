/**
 * Hand-drawn Kanchenjunga range at first light. Used as the static hero and as
 * the poster layer under the scroll video once one exists.
 * Layers carry data-depth so the hero can drift them gently on scroll.
 */
export default function MountainScene({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d9e0" />
          <stop offset="0.55" stopColor="#e7e9e2" />
          <stop offset="1" stopColor="#f3e4d4" />
        </linearGradient>
        <radialGradient id="sun" cx="0.72" cy="0.42" r="0.35">
          <stop offset="0" stopColor="#fff4e2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff4e2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6edf0" />
          <stop offset="1" stopColor="#b7c8cf" />
        </linearGradient>
        <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fb4b6" />
          <stop offset="1" stopColor="#7f9a98" />
        </linearGradient>
        <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#56766b" />
          <stop offset="1" stopColor="#3b574d" />
        </linearGradient>
        <linearGradient id="mistband" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f7f3" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f6f7f3" stopOpacity="0.75" />
          <stop offset="1" stopColor="#f6f7f3" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1440" height="900" fill="url(#sky)" />
      <rect width="1440" height="900" fill="url(#sun)" />

      <g data-depth="0.04">
        <path
          fill="url(#far)"
          d="M0 560 L80 520 L160 540 L240 470 L300 490 L380 420 L440 450 L520 380 L580 400 L640 330 L700 300 L740 250 L780 270 L820 215 L860 245 L900 230 L940 280 L990 260 L1040 320 L1100 300 L1160 370 L1220 350 L1300 420 L1360 400 L1440 450 L1440 900 L0 900 Z"
        />
        <path
          fill="#fbfcfb"
          opacity="0.92"
          d="M700 300 L740 250 L780 270 L820 215 L860 245 L900 230 L940 280 L918 292 L896 268 L872 288 L846 264 L818 292 L792 302 L764 286 L734 312 Z"
        />
        <path fill="#fbfcfb" opacity="0.8" d="M520 380 L580 400 L640 330 L668 316 L650 352 L622 360 L596 392 L560 396 Z" />
        <path fill="#fbfcfb" opacity="0.75" d="M990 260 L1040 320 L1100 300 L1080 318 L1046 334 L1012 300 Z" />
      </g>

      <rect className="mist-a" x="-200" y="470" width="1840" height="120" fill="url(#mistband)" />

      <g data-depth="0.09">
        <path
          fill="url(#mid)"
          d="M0 640 L120 600 L220 620 L330 560 L430 590 L540 540 L660 580 L760 530 L880 575 L990 545 L1100 590 L1220 550 L1330 600 L1440 570 L1440 900 L0 900 Z"
        />
      </g>

      <rect className="mist-b" x="-200" y="600" width="1840" height="110" fill="url(#mistband)" />

      <g data-depth="0.16">
        <path fill="url(#near)" d="M0 720 Q180 650 320 690 T640 680 T980 700 T1280 660 T1440 690 L1440 900 L0 900 Z" />
      </g>

      <g data-depth="0.24" fill="#1d342c">
        <path d="M0 800 Q200 740 420 790 T860 770 T1200 800 T1440 760 L1440 900 L0 900 Z" />
        {[60, 110, 150, 230, 300, 980, 1040, 1090, 1160, 1250, 1330, 1390].map((x, i) => {
          const h = 40 + ((i * 37) % 30);
          const base = 800 - ((i * 13) % 24);
          return <path key={x} d={`M${x} ${base - h} L${x + 14} ${base} L${x - 14} ${base} Z`} />;
        })}
      </g>

      {/* Prayer flags strung across the foreground ridge */}
      <g data-depth="0.24">
        <path d="M180 760 Q420 720 660 768" stroke="#1d342c" strokeWidth="1.5" fill="none" />
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i + 0.5) / 12;
          const x = 180 + 480 * t;
          const y = 760 - 2 * 40 * t * (1 - t) * 2 + 8 * t;
          const colors = ["#2c6680", "#f6f7f3", "#b3263e", "#1f6b45", "#d9a521"];
          return <rect key={i} x={x - 7} y={y} width="14" height="18" fill={colors[i % 5]} opacity="0.9" />;
        })}
      </g>
    </svg>
  );
}
