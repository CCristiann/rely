"use client";

import { BrainCircuit, FileText, Search, Zap } from "lucide-react";

const NODES = [
  { x: 400, y: 300, r: 9, tier: 0 },
  { x: 200, y: 155, r: 5.5, tier: 1 },
  { x: 600, y: 150, r: 4.5, tier: 1 },
  { x: 130, y: 390, r: 5, tier: 1 },
  { x: 670, y: 385, r: 6, tier: 1 },
  { x: 400, y: 72, r: 3.5, tier: 2 },
  { x: 400, y: 515, r: 3, tier: 2 },
  { x: 78, y: 258, r: 2.5, tier: 2 },
  { x: 722, y: 262, r: 2.5, tier: 2 },
  { x: 238, y: 478, r: 3, tier: 2 },
  { x: 562, y: 472, r: 3, tier: 2 },
  { x: 742, y: 162, r: 2, tier: 3 },
  { x: 56, y: 412, r: 2, tier: 3 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 3], [1, 7], [1, 5],
  [2, 4], [2, 8], [2, 5], [2, 11],
  [3, 7], [3, 9], [3, 12],
  [4, 8], [4, 10], [4, 11],
  [6, 9], [6, 10],
  [9, 10],
];

const DURATIONS = [2.1, 2.7, 2.3, 3.0, 3.3, 2.5, 2.9, 2.4, 3.2, 2.8, 3.1, 2.2, 2.6, 3.4, 3.0, 2.7, 3.5, 2.3, 2.9, 3.1];

const FEATURES = [
  { icon: Search, label: "Semantic search" },
  { icon: FileText, label: "Doc ingestion" },
  { icon: Zap, label: "Instant answers" },
];

export function LoginVisual() {
  return (
    <div
      className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <style>{`
        @keyframes lv-dash { to { stroke-dashoffset: -20; } }
        @keyframes lv-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(6);   opacity: 0;   }
        }
        @keyframes lv-breathe {
          0%, 100% { opacity: 0.16; transform: scale(1);    }
          50%       { opacity: 0.32; transform: scale(1.09); }
        }
        @keyframes lv-enter {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes lv-blink-a {
          0%, 100% { fill-opacity: 0.55; }
          50%       { fill-opacity: 0.3;  }
        }
        @keyframes lv-blink-b {
          0%, 100% { fill-opacity: 0.55; }
          50%       { fill-opacity: 0.32; }
        }
        .lv-edge {
          stroke-dasharray: 5 5;
          animation: lv-dash linear infinite;
        }
        .lv-ring-1 {
          fill: none; stroke: var(--primary); stroke-width: 1;
          transform-box: fill-box; transform-origin: center;
          animation: lv-pulse-ring 3.2s ease-out infinite;
        }
        .lv-ring-2 {
          fill: none; stroke: var(--primary); stroke-width: 0.65;
          transform-box: fill-box; transform-origin: center;
          animation: lv-pulse-ring 3.2s ease-out infinite 1.6s;
        }
        .lv-glow-el {
          transform-box: fill-box; transform-origin: center;
          animation: lv-breathe 5s ease-in-out infinite;
        }
        .lv-blink-a { animation: lv-blink-a 4.5s ease-in-out infinite; }
        .lv-blink-b { animation: lv-blink-b 4.5s ease-in-out infinite 2.25s; }
        .lv-content { animation: lv-enter 0.9s cubic-bezier(0.16,1,0.3,1) forwards 0.15s; opacity: 0; }
        .lv-c1 { animation: lv-enter 0.65s ease forwards 0.45s; opacity: 0; }
        .lv-c2 { animation: lv-enter 0.65s ease forwards 0.60s; opacity: 0; }
        .lv-c3 { animation: lv-enter 0.65s ease forwards 0.75s; opacity: 0; }
      `}</style>

      {/* Edge vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 68% at 50% 50%, transparent 28%, oklch(0.20 0.003 106 / 0.72) 100%)",
        }}
      />

      {/* SVG constellation */}
      <svg
        viewBox="0 0 800 590"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id="lv-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient center glow */}
        <ellipse
          cx={400} cy={300}
          rx={215} ry={188}
          fill="url(#lv-glow-grad)"
          className="lv-glow-el"
        />

        {/* Edges */}
        {EDGES.map(([a, b], i) => (
          <line
            key={`e${a}-${b}`}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke="var(--primary)"
            strokeOpacity={0.14}
            strokeWidth={0.9}
            className="lv-edge"
            style={{
              animationDuration: `${DURATIONS[i]}s`,
              animationDelay: `${(i * 0.22) % 2}s`,
            }}
          />
        ))}


        {/* Nodes */}
        {NODES.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x} cy={n.y} r={n.r}
            fill="var(--primary)"
            fillOpacity={
              i === 0 ? 1
                : i <= 4 ? 0.55
                  : i <= 10 ? 0.27
                    : 0.14
            }
            className={
              i === 1 || i === 3 ? "lv-blink-a"
                : i === 2 || i === 4 ? "lv-blink-b"
                  : undefined
            }
          />
        ))}
      </svg>

      {/* Center content */}
      <div className="lv-content relative z-10 flex flex-col items-center text-center px-10 mb-8">
        <h2
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 27,
            fontWeight: 600,
            color: "var(--foreground)",
            letterSpacing: "-0.025em",
            lineHeight: 1.32,
            maxWidth: 300,
            marginBottom: 12,
          }}
        >
          Your documents,
          <br />
          intelligently searched
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--muted-foreground)",
            lineHeight: 1.65,
            maxWidth: 285,
          }}
        >
          rely uses retrieval-augmented generation to surface exact answers
          from your uploaded files — no hallucination.
        </p>
      </div>

      {/* Feature chips */}
      <div className="relative z-10 flex gap-2 flex-wrap justify-center px-10">
        {FEATURES.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className={`lv-c${i + 1} flex items-center gap-1.5 rounded-full text-xs`}
            style={{
              padding: "6px 14px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <Icon size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
