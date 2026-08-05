import React, { useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

interface GridBackgroundProps {
  children: React.ReactNode;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ children }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = useReducedMotion();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [reducedMotion]
  );

  return (
    <div
      className="relative min-h-dvh w-full overflow-x-hidden bg-bg text-text selection:bg-truth/20"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. TOP AMBIENT MESH GLOW */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-full max-w-7xl -translate-x-1/2 opacity-40 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgb(var(--c-thinking)) 0%, rgb(var(--c-truth)) 35%, transparent 70%)",
        }}
      />

      {/* 2. STATIC DOT GRID PATTERN */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* 3. DYNAMIC MOUSE SPOTLIGHT (Disabled if reduced motion) */}
      {!reducedMotion && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgb(var(--c-truth) / 0.08), rgb(var(--c-thinking) / 0.03) 40%, transparent 80%)`,
          }}
        />
      )}

      {/* 4. VIGNETTE EDGE MASK */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at center, transparent 40%, rgb(var(--c-bg)) 98%)",
        }}
      />

      {/* MAIN CONTENT */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
