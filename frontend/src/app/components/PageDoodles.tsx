"use client";

import { motion } from "motion/react";
import { T } from "../lib/design";

export function Star4({ size, color }: { size: number; color: string }) {
  const s = size / 2;
  const t = s * 0.36;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-s} ${-s} ${size} ${size}`}
      fill={color}
      aria-hidden="true"
    >
      <path
        d={`M0,${-s} L${t},${-t} L${s},0 L${t},${t} L0,${s} L${-t},${t} L${-s},0 L${-t},${-t} Z`}
      />
    </svg>
  );
}

function CloudShape({ w, color }: { w: number; color: string }) {
  const h = w * 0.52;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill={color}
      aria-hidden="true"
    >
      <ellipse cx={w * 0.2} cy={h * 0.68} rx={w * 0.17} ry={h * 0.4} />
      <ellipse cx={w * 0.42} cy={h * 0.48} rx={w * 0.24} ry={h * 0.5} />
      <ellipse cx={w * 0.65} cy={h * 0.52} rx={w * 0.2} ry={h * 0.44} />
      <ellipse cx={w * 0.82} cy={h * 0.68} rx={w * 0.15} ry={h * 0.36} />
      <rect x={w * 0.04} y={h * 0.63} width={w * 0.92} height={h * 0.37} />
    </svg>
  );
}

const DOODLES = [
  { type: "star" as const, x: "4%", y: "7%", size: 24, color: T.lemon, delay: 0 },
  { type: "star" as const, x: "93%", y: "9%", size: 18, color: T.lav, delay: 0.6 },
  { type: "star" as const, x: "89%", y: "76%", size: 22, color: T.rose, delay: 1.1 },
  { type: "star" as const, x: "5%", y: "80%", size: 16, color: T.sky, delay: 0.4 },
  { type: "star" as const, x: "50%", y: "3%", size: 13, color: T.mint, delay: 0.9 },
  { type: "star" as const, x: "20%", y: "95%", size: 11, color: T.lemon, delay: 1.4 },
  { type: "star" as const, x: "75%", y: "93%", size: 14, color: T.lav, delay: 0.2 },
  { type: "cloud" as const, x: "68%", y: "2%", size: 75, color: "#F0EEFF", delay: 0.3 },
  { type: "cloud" as const, x: "1%", y: "44%", size: 58, color: "#FFF0F8", delay: 1.0 },
  { type: "cloud" as const, x: "76%", y: "48%", size: 68, color: "#EAFAFF", delay: 0.7 },
];

export function PageDoodles() {
  return (
    <div
      className="pointer-events-none fixed inset-0 select-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {DOODLES.map((d, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: d.x, top: d.y }}
          animate={{ y: [0, d.type === "cloud" ? -7 : -5, 0] }}
          transition={{
            duration: 3.5 + i * 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: d.delay,
          }}
        >
          {d.type === "star" ? (
            <Star4 size={d.size} color={d.color} />
          ) : (
            <CloudShape w={d.size} color={d.color} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
