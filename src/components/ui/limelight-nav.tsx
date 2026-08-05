"use client";

import React from "react";
import { motion } from "framer-motion";
import { Home, Compass, Bell, User } from "lucide-react";
import { cn } from "../../lib/cn";

export interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

interface LimelightNavProps {
  items?: NavItem[];
  activeId?: string;
  className?: string;
}

const defaultItems: NavItem[] = [
  { id: "home", icon: <Home className="w-5 h-5" />, label: "Home" },
  { id: "explore", icon: <Compass className="w-5 h-5" />, label: "Explore" },
  { id: "notifications", icon: <Bell className="w-5 h-5" />, label: "Notifications" },
  { id: "profile", icon: <User className="w-5 h-5" />, label: "Profile" },
];

export const LimelightNav: React.FC<LimelightNavProps> = ({
  items = defaultItems,
  activeId,
  className,
}) => {
  const current = activeId ?? items[0]?.id;

  return (
    <nav
      role="tablist"
      className={cn(
        "relative flex items-center gap-1 p-2 bg-surface border border-border rounded-2xl shadow-sm overflow-x-auto",
        className
      )}
    >
      {items.map((item) => {
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => item.onClick?.()}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 z-10 outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isActive
                ? "text-bg font-semibold"
                : "text-muted hover:text-text hover:bg-surface-2"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="limelight"
                className="absolute inset-0 bg-truth rounded-xl shadow-[0_0_20px_rgb(var(--c-truth)/0.5)] z-[-1]"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center">
              {item.icon}
            </span>
            <span className="relative z-10 hidden sm:inline-block">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
