import { useEffect, useState } from "react";
import { Component as Sphere } from "./sphere";

export function LoadingOverlay() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="flex items-center justify-center" style={{ height: "12.5vh" }}>
      <Sphere />
    </div></div>
  );
}
