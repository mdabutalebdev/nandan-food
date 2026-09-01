// Dependency-free donut chart (pure SVG).
export default function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 90;
  const cy = 90;
  const r = 62;
  const circ = 2 * Math.PI * r;

  // Each arc starts where the previous one ended — precomputed so nothing is
  // mutated while rendering.
  const arcs = segments.reduce<{ dash: number; offset: number; color: string }[]>((acc, seg) => {
    const prev = acc[acc.length - 1];
    const offset = prev ? prev.offset + prev.dash : 0;
    return [...acc, { dash: (seg.value / total) * circ, offset, color: seg.color }];
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
      <svg viewBox="0 0 180 180" className="h-40 w-40 shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eceef1" strokeWidth="22" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="22"
            strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="26" fontWeight="800" fill="#2f2f2f">
          {centerValue ?? total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#9aa1ac">
          {centerLabel ?? "total"}
        </text>
      </svg>

      <ul className="w-full space-y-2">
        {segments.map((seg, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
              <span className="text-ink-soft">{seg.label}</span>
            </span>
            <span className="font-semibold text-ink">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
