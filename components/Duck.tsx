"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import type { DuckState } from "@/lib/types";

interface DuckProps {
  state: DuckState;
  size?: number;
  className?: string;
}

const LABELS: Record<DuckState, string> = {
  idle: "Quack the duck is waiting",
  listening: "Quack is listening",
  thinking: "Quack is thinking",
  curious: "Quack is curious",
  celebrating: "Quack is celebrating",
  sleepy: "Quack is sleepy",
};

const loop = (duration: number, extra: Partial<Transition> = {}): Transition => ({
  duration,
  repeat: Infinity,
  ease: "easeInOut",
  ...extra,
});

/** Animated SVG rubber duck with six moods. Respects prefers-reduced-motion. */
export function Duck({ state, size = 200, className }: DuckProps) {
  const reduce = useReducedMotion();

  const body = reduce
    ? {}
    : {
        idle: { animate: { y: [0, -6, 0] }, transition: loop(2.4) },
        listening: { animate: { y: [0, -3, 0], rotate: [0, -2, 0] }, transition: loop(1.2) },
        thinking: { animate: { y: [0, -2, 0] }, transition: loop(1.6) },
        curious: { animate: { y: [0, -4, 0] }, transition: loop(2) },
        celebrating: { animate: { y: [0, -28, 0], rotate: [0, -6, 6, 0] }, transition: loop(0.7) },
        sleepy: { animate: { y: [0, 3, 0] }, transition: loop(3.6) },
      }[state];

  const headRotate: Record<DuckState, number> = {
    idle: 0,
    listening: -6,
    thinking: 8,
    curious: -16,
    celebrating: 0,
    sleepy: 12,
  };

  const eyesClosed = state === "sleepy";
  const eyeScale = state === "listening" || state === "curious" ? 1.25 : 1;

  return (
    <div
      className={className}
      role="img"
      aria-label={LABELS[state]}
      data-duck-state={state}
      style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
        {/* water ripple */}
        <ellipse cx="100" cy="182" rx="70" ry="8" className="fill-sky-300/40 dark:fill-sky-500/25" />

        <motion.g style={{ originX: "100px", originY: "170px" }} {...body}>
          {/* body */}
          <path
            d="M30 128 C30 96 60 88 92 96 L138 100 C168 102 176 124 170 146 C164 168 134 176 100 176 C58 176 30 160 30 128 Z"
            fill="#FFD43B"
            stroke="#E8A800"
            strokeWidth="3"
          />
          {/* tail */}
          <path d="M34 120 L18 104 L40 112 Z" fill="#FFD43B" stroke="#E8A800" strokeWidth="3" strokeLinejoin="round" />
          {/* wing */}
          <motion.path
            d="M72 128 C84 112 116 114 124 132 C112 146 84 148 72 128 Z"
            fill="#FFC107"
            stroke="#E8A800"
            strokeWidth="3"
            style={{ originX: "76px", originY: "128px" }}
            animate={!reduce && state === "celebrating" ? { rotate: [0, -30, 0] } : { rotate: 0 }}
            transition={!reduce && state === "celebrating" ? loop(0.35) : { duration: 0.3 }}
          />

          {/* head group */}
          <motion.g
            style={{ originX: "118px", originY: "96px" }}
            animate={{ rotate: headRotate[state] }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 10 }}
          >
            <circle cx="122" cy="66" r="34" fill="#FFD43B" stroke="#E8A800" strokeWidth="3" />
            {/* beak */}
            <motion.path
              d="M150 66 C166 62 178 68 176 74 C170 82 156 80 148 76 Z"
              fill="#FF8C1A"
              stroke="#D9650B"
              strokeWidth="2.5"
              style={{ originX: "150px", originY: "72px" }}
              animate={!reduce && (state === "listening" || state === "celebrating") ? { scaleY: [1, 1.3, 1] } : { scaleY: 1 }}
              transition={!reduce ? loop(0.5) : { duration: 0 }}
            />
            {/* cheek */}
            <circle cx="136" cy="80" r="6" fill="#FF9E80" opacity="0.55" />
            {/* eye */}
            {eyesClosed ? (
              <path d="M124 58 Q131 64 138 58" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
            ) : (
              <motion.g
                style={{ originX: "131px", originY: "56px" }}
                animate={reduce ? { scale: eyeScale } : { scale: eyeScale, scaleY: [eyeScale, eyeScale, 0.1, eyeScale] }}
                transition={reduce ? { duration: 0 } : loop(4, { times: [0, 0.9, 0.95, 1] })}
              >
                <circle cx="131" cy="56" r="7" fill="#1f2937" />
                <circle cx="133.5" cy="53.5" r="2.4" fill="#fff" />
              </motion.g>
            )}
            {/* brow for curious */}
            {state === "curious" && (
              <path d="M122 42 Q131 36 140 42" stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round" />
            )}
          </motion.g>
        </motion.g>

        {/* --- state decorations --- */}
        {state === "thinking" && (
          <g>
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={64 + i * 14}
                cy={34}
                r={5}
                className="fill-slate-500 dark:fill-slate-300"
                animate={reduce ? {} : { y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                transition={loop(0.9, { delay: i * 0.15 })}
              />
            ))}
          </g>
        )}

        {state === "curious" && (
          <motion.text
            x="40"
            y="52"
            fontSize="40"
            fontWeight="700"
            className="fill-sky-600 dark:fill-sky-300"
            animate={reduce ? {} : { y: [52, 46, 52], rotate: [-8, 8, -8] }}
            transition={loop(1.4)}
          >
            ?
          </motion.text>
        )}

        {state === "listening" && (
          <g fill="none" strokeLinecap="round" strokeWidth="3" className="stroke-sky-500 dark:stroke-sky-300">
            {[0, 1, 2].map((i) => (
              <motion.path
                key={i}
                d={`M${74 - i * 10} ${48 - i * 6} Q${66 - i * 10} ${66} ${74 - i * 10} ${84 + i * 6}`}
                animate={reduce ? { opacity: 0.7 } : { opacity: [0, 1, 0] }}
                transition={loop(1.2, { delay: i * 0.2 })}
              />
            ))}
          </g>
        )}

        {state === "sleepy" && (
          <g className="fill-indigo-500 dark:fill-indigo-300" fontWeight="700">
            {[0, 1].map((i) => (
              <motion.text
                key={i}
                x={160 + i * 14}
                y={36 - i * 14}
                fontSize={16 + i * 6}
                animate={reduce ? {} : { y: [36 - i * 14, 20 - i * 14], opacity: [0, 1, 0] }}
                transition={loop(2.4, { delay: i * 0.8, ease: "linear" })}
              >
                z
              </motion.text>
            ))}
          </g>
        )}

        {state === "celebrating" && (
          <motion.g
            style={{ originX: "100px", originY: "100px" }}
            animate={reduce ? {} : { rotate: 360 }}
            transition={loop(3, { ease: "linear" })}
          >
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x = 100 + Math.cos(rad) * 88;
              const y = 100 + Math.sin(rad) * 88;
              const colors = ["#F43F5E", "#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#06B6D4"];
              return (
                <path
                  key={deg}
                  d={`M${x} ${y - 8} L${x + 2.5} ${y - 2.5} L${x + 8} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 8} L${x - 2.5} ${y + 2.5} L${x - 8} ${y} L${x - 2.5} ${y - 2.5} Z`}
                  fill={colors[i]}
                />
              );
            })}
          </motion.g>
        )}
      </svg>
    </div>
  );
}

export default Duck;
