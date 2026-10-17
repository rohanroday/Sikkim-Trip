/**
 * Placeholder art for a stay with no photos yet: a small ridge-and-roof scene
 * whose hues come from the slug, so each stay looks distinct. Real photos replace it.
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export default function StayArt({ seed, className = "" }: { seed: string; className?: string }) {
  const h = hash(seed);
  const skies = [["#cddbe2", "#f1e6d6"], ["#d6e0dc", "#efe3d1"], ["#c7d6df", "#e9e7df"], ["#d9dfe4", "#f3e2d0"]];
  const ridges = ["#7f9a98", "#8aa39b", "#7d97a1", "#93a69a"];
  const roofs = ["#b3263e", "#2c6680", "#1f6b45", "#8a5a00"];
  const [s1, s2] = skies[h % skies.length];
  const ridge = ridges[(h >>> 3) % ridges.length];
  const roof = roofs[(h >>> 6) % roofs.length];
  const peak = 60 + (h % 50);
  const id = `g${h.toString(36)}`;
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s1} />
          <stop offset="1" stopColor={s2} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id})`} />
      <path d={`M0 130 L70 ${peak + 30} L120 ${peak + 50} L190 ${peak} L250 ${peak + 40} L320 ${peak + 20} L320 200 L0 200 Z`} fill="#e6edf0" />
      <path d={`M190 ${peak} L205 ${peak + 14} L196 ${peak + 12} L184 ${peak + 16} Z`} fill="#fbfcfb" />
      <path d="M0 150 Q80 120 160 145 T320 135 L320 200 L0 200 Z" fill={ridge} />
      <path d="M0 175 Q100 155 200 172 T320 165 L320 200 L0 200 Z" fill="#2d4a40" />
      <g transform="translate(118 128)">
        <rect x="6" y="20" width="56" height="30" fill="#f4efe6" />
        <path d="M0 22 L34 0 L68 22 Z" fill={roof} />
        <rect x="16" y="30" width="10" height="10" fill="#2d4a40" opacity=".7" />
        <rect x="42" y="30" width="10" height="10" fill="#2d4a40" opacity=".7" />
      </g>
    </svg>
  );
}
