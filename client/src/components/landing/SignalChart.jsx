import { cn } from "@/lib/utils";

/**
 * Horizontal/vertical bar chart rendered as flat SVG — "retrieval precision
 * by system". Persona's bars dominate; classic RAG approaches taper off.
 * Y-axis is mono-labeled with fake decimal ticks; x-axis labels angle down.
 * All numbers are illustrative, not benchmarked.
 */
const BARS = [
  { label: "Raw chunks", value: 0.08, persona: false },
  { label: "BM25", value: 0.14, persona: false },
  { label: "Dense", value: 0.21, persona: false },
  { label: "Hybrid RAG", value: 0.36, persona: false },
  { label: "GraphRAG", value: 0.48, persona: false },
  { label: "Persona typed", value: 0.92, persona: true },
  { label: "Persona + cite", value: 1.00, persona: true },
  { label: "Persona + live", value: 0.97, persona: true },
];

export function SignalChart({ className }) {
  const W = 900;
  const H = 340;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 72;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barCount = BARS.length;
  const barW = (innerW / barCount) * 0.56;
  const gap = (innerW - barW * barCount) / (barCount - 1);

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full h-auto", className)}
      aria-label="Retrieval precision by system — illustrative"
    >
      {/* y axis ticks + labels */}
      {ticks.map((t) => {
        const y = padT + innerH - t * innerH;
        return (
          <g key={t}>
            <line
              x1={padL - 6}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <text
              x={padL - 10}
              y={y + 3.5}
              fontSize="10"
              fill="currentColor"
              opacity="0.55"
              textAnchor="end"
              fontFamily="var(--font-mono)"
            >
              {t.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* bars */}
      {BARS.map((b, i) => {
        const x = padL + i * (barW + gap);
        const h = b.value * innerH;
        const y = padT + innerH - h;
        return (
          <g key={b.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={b.persona ? "var(--primary)" : "currentColor"}
              opacity={b.persona ? 1 : 0.62}
            />
            {/* numeric label above each bar, mono */}
            {b.value > 0.12 && (
              <text
                x={x + barW / 2}
                y={y - 6}
                fontSize="10"
                fill="currentColor"
                opacity={b.persona ? 0.9 : 0.55}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {b.value.toFixed(2)}
              </text>
            )}
            {/* x-axis label, rotated */}
            <text
              x={x + barW / 2}
              y={padT + innerH + 14}
              fontSize="10.5"
              fill="currentColor"
              opacity={b.persona ? 0.85 : 0.55}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              transform={`rotate(-38 ${x + barW / 2} ${padT + innerH + 14})`}
            >
              {b.label}
            </text>
          </g>
        );
      })}

      {/* baseline */}
      <line
        x1={padL}
        y1={padT + innerH}
        x2={W - padR}
        y2={padT + innerH}
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1"
      />
    </svg>
  );
}
