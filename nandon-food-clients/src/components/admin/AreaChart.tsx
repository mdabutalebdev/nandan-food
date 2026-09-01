// Dependency-free area/line chart (pure SVG).
export default function AreaChart({
  data,
  labels,
  height = 240,
}: {
  data: number[];
  labels?: string[];
  height?: number;
}) {
  const w = 680;
  const h = height;
  const pad = { l: 44, r: 14, t: 14, b: 28 };
  const n = data.length;
  const max = Math.max(1, ...data);
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = n ? `${line} L${x(n - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z` : "";

  const gridY = [0, 0.25, 0.5, 0.75, 1];
  const fmt = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Sales chart">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines + y labels */}
      {gridY.map((g, i) => {
        const yy = pad.t + ih - g * ih;
        return (
          <g key={i}>
            <line x1={pad.l} y1={yy} x2={w - pad.r} y2={yy} stroke="#eceef1" strokeWidth="1" />
            <text x={pad.l - 8} y={yy + 3} textAnchor="end" fontSize="10" fill="#9aa1ac">
              {fmt(g * max)}
            </text>
          </g>
        );
      })}

      {n > 0 && (
        <>
          <path d={area} fill="url(#areaGrad)" />
          <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke="var(--color-brand)" strokeWidth="2" />
          ))}
        </>
      )}

      {/* x labels */}
      {labels?.map((l, i) => (
        <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="#9aa1ac">
          {l}
        </text>
      ))}
    </svg>
  );
}
