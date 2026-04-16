/* Custom SVG set for the landing page.
 * Intentionally monoline, currentColor-driven, and calm —
 * no stock iconography. */

export function GraphHero({ className }) {
  /* Typed knowledge graph — 3 rows, clear flow: entities → children → runtime. */
  const NW = 150;
  const NH = 58;

  const nodes = [
    { x: 120, y: 40,  title: "Product",  tag: "entity" },
    { x: 450, y: 40,  title: "Customer", tag: "entity", primary: true },
    { x: 50,  y: 170, title: "Feature",  tag: "child" },
    { x: 285, y: 170, title: "Use case", tag: "child" },
    { x: 520, y: 170, title: "Persona",  tag: "child" },
    { x: 285, y: 300, title: "Agent",    tag: "runtime", primary: true },
  ];
  const [P, C, F, U, Ps, A] = nodes;
  const cx = (n) => n.x + NW / 2;
  const bot = (n) => n.y + NH;
  const edge = (a, b) => {
    const x1 = cx(a);
    const y1 = bot(a);
    const x2 = cx(b);
    const y2 = b.y;
    const my = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
  };

  return (
    <svg viewBox="0 0 720 420" className={className} aria-hidden>
      <defs>
        <linearGradient id="nodeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.07" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="primaryFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0.10" />
        </linearGradient>
      </defs>

      {/* Edges */}
      <g fill="none" strokeWidth="1.2">
        <path d={edge(P, F)} stroke="currentColor" strokeOpacity="0.28" />
        <path d={edge(P, U)} className="flow-line" stroke="var(--primary)" strokeOpacity="0.7" />
        <path d={edge(C, U)} className="flow-line" stroke="var(--primary)" strokeOpacity="0.7" style={{ animationDelay: "-0.8s" }} />
        <path d={edge(C, Ps)} stroke="currentColor" strokeOpacity="0.28" />
        <path d={edge(F, A)} stroke="currentColor" strokeOpacity="0.22" />
        <path d={edge(U, A)} className="flow-line" stroke="var(--primary)" strokeOpacity="0.6" style={{ animationDelay: "-1.6s" }} />
        <path d={edge(Ps, A)} stroke="currentColor" strokeOpacity="0.22" />
      </g>

      {/* Nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect
            x={n.x} y={n.y} rx="6" ry="6" width={NW} height={NH}
            fill={n.primary ? "url(#primaryFill)" : "url(#nodeFill)"}
            stroke={n.primary ? "var(--primary)" : "currentColor"}
            strokeOpacity={n.primary ? 0.65 : 0.2}
          />
          <text
            x={n.x + 14} y={n.y + 20}
            fontSize="9" fill="currentColor" fillOpacity="0.5"
            fontFamily="var(--font-mono, monospace)" letterSpacing="0.18em"
          >
            {n.tag.toUpperCase()}
          </text>
          <text
            x={n.x + 14} y={n.y + 42}
            fontSize="15" fill="currentColor"
            fontFamily="var(--font-sans)" fontWeight="500" letterSpacing="-0.01em"
          >
            {n.title}
          </text>
          <circle
            cx={n.x + NW - 12} cy={n.y + 12} r="2.5"
            fill={n.primary ? "var(--primary)" : "currentColor"}
            className="node-pulse"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

/* Brand-mark set for the integrations marquee.
 * Each is a tiny monoline symbol; we pair it with a wordmark. */

export function MarkNotion({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 8 L8 16 M8 8 L16 16 M16 8 L16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
export function MarkAnthropic({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 20 L10 5 L14 5 L20 20" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 14 L16 14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
export function MarkOpenAI({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3 L20 7.5 L20 16.5 L12 21 L4 16.5 L4 7.5 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
export function MarkSupabase({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3 L12 12 L20 12 L12 21 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 3 L4 12 L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
export function MarkPostgres({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 6 L4 18 C 4 19.6 7.6 21 12 21 C 16.4 21 20 19.6 20 18 L 20 6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 12 C 4 13.6 7.6 15 12 15 C 16.4 15 20 13.6 20 12" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
export function MarkSlack({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="9" width="12" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="3" width="3" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="12" width="12" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="9" width="3" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
export function MarkGithub({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M9 19c-4 1.2-4-2-6-2M15 22v-3.5a3 3 0 0 0-.8-2.2c3-0.3 5.8-1.5 5.8-6.3a4.9 4.9 0 0 0-1.3-3.4 4.6 4.6 0 0 0-.1-3.4s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.4 2.9 5.3 3.2 5.3 3.2a4.6 4.6 0 0 0-.1 3.4A4.9 4.9 0 0 0 3.8 10c0 4.8 2.8 6 5.8 6.3A3 3 0 0 0 8.9 19V22" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function MarkLinear({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 8 L16 21 M5 5 L19 19 M8 3 L21 16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* Feature card illustrations — each a minimal scene. */

export function FeatureGraph({ className }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="30" cy="45" r="7" />
        <circle cx="80" cy="25" r="7" />
        <circle cx="80" cy="65" r="7" />
        <circle cx="130" cy="45" r="7" fill="var(--primary)" stroke="var(--primary)" />
        <path d="M37 45 L73 28 M37 45 L73 62 M87 25 L123 45 M87 65 L123 45" />
      </g>
    </svg>
  );
}

export function FeatureDocs({ className }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="20" y="15" width="80" height="60" rx="4" />
        <line x1="30" y1="30" x2="90" y2="30" />
        <line x1="30" y1="40" x2="80" y2="40" />
        <line x1="30" y1="50" x2="85" y2="50" />
        <line x1="30" y1="60" x2="70" y2="60" />
        <rect x="105" y="30" width="40" height="40" rx="4" stroke="var(--primary)" />
        <circle cx="125" cy="50" r="4" fill="var(--primary)" stroke="none" />
      </g>
    </svg>
  );
}

export function FeatureTerminal({ className }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="15" y="15" width="130" height="60" rx="4" />
        <line x1="15" y1="28" x2="145" y2="28" />
        <circle cx="25" cy="21.5" r="1.8" />
        <circle cx="33" cy="21.5" r="1.8" />
        <circle cx="41" cy="21.5" r="1.8" />
        <path d="M25 42 l6 6 l-6 6" stroke="var(--primary)" strokeLinecap="round" />
        <line x1="38" y1="48" x2="80" y2="48" />
        <line x1="25" y1="60" x2="110" y2="60" strokeOpacity="0.5" />
        <line x1="25" y1="68" x2="90" y2="68" strokeOpacity="0.5" />
      </g>
    </svg>
  );
}

export function FeatureFlow({ className }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="15" y="30" width="36" height="30" rx="4" />
        <rect x="62" y="15" width="36" height="30" rx="4" />
        <rect x="62" y="45" width="36" height="30" rx="4" />
        <rect x="109" y="30" width="36" height="30" rx="4" stroke="var(--primary)" />
        <path d="M51 42 L62 30 M51 48 L62 60 M98 30 L109 42 M98 60 L109 48" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function FeatureGuard({ className }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M80 14 L120 28 V50 C120 64 102 76 80 80 C58 76 40 64 40 50 V28 Z" />
        <path d="M68 48 L78 58 L94 40" stroke="var(--primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

export function FeatureClock({ className }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="80" cy="45" r="28" />
        <path d="M80 27 V 45 L 94 52" stroke="var(--primary)" strokeLinecap="round" />
        <line x1="80" y1="20" x2="80" y2="24" />
        <line x1="80" y1="66" x2="80" y2="70" />
        <line x1="55" y1="45" x2="59" y2="45" />
        <line x1="101" y1="45" x2="105" y2="45" />
      </g>
    </svg>
  );
}
