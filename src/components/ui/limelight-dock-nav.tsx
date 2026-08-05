"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileText, BarChart3, Info } from "lucide-react";
import { cn } from "../../lib/cn";

export interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

const defaultItems: NavItem[] = [
  { id: "setup", icon: <FileText className="w-4 h-4" />, label: "Setup", href: "/setup" },
  { id: "report", icon: <BarChart3 className="w-4 h-4" />, label: "Report", href: "/report" },
  { id: "about", icon: <Info className="w-4 h-4" />, label: "About", href: "/about" },
];

interface LimelightDockNavProps {
  items?: NavItem[];
  activeId?: string;
  className?: string;
}

export const LimelightDockNav: React.FC<LimelightDockNavProps> = ({
  items = defaultItems,
  activeId = "setup",
  className,
}) => {
  return (
    <nav
      className={cn(
        "relative flex items-center gap-1.5 p-1.5",
        "bg-surface/80 backdrop-blur-xl",
        className
      )}
    >
      {items.map((item) => {
        const isActive = activeId === item.id;

        return (
          <a
            key={item.id}
            href={item.href || "#"}
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => {
              if (item.onClick) {
                e.preventDefault();
                item.onClick();
              }
            }}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 z-10 outline-none select-none focus-visible:ring-2 focus-visible:ring-accent",
              isActive
                ? "text-white font-semibold"
                : "text-muted hover:text-text hover:bg-surface-2"
            )}
          >
            {/* Animated Spotlight / Limelight Mesh */}
            {isActive && (
              <motion.div
                layoutId="limelight-spotlight"
                className="absolute inset-0 rounded-xl overflow-visible pointer-events-none z-[-1]"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              >
                {/* 1. Top Edge Spotlight Source (Brighter, wider white line) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[2.5px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_18px_4px_rgba(255,255,255,1)]" />

                {/* 2. Deep Downward Light Cone */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[140%] h-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/60 via-white/15 to-transparent blur-md" />
              </motion.div>
            )}

            {/* Icon + Label with light projection */}
            <span
              className={cn(
                "relative z-10 transition-all duration-200",
                isActive && "scale-110 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]"
              )}
            >
              {item.icon}
            </span>
            <span
              className={cn(
                "relative z-10 hidden sm:inline-block transition-all duration-200",
                isActive && "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]"
              )}
            >
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
};
