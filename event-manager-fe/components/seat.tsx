"use client";

import { motion } from "framer-motion";
import { Armchair } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeatProps {
  seatId: string;
  state: "available" | "held" | "reserved" | "sold";
  seatSessionId?: string | null; // 👈 from DB
  currentSessionId?: string; // 👈 from context or parent
  isSelected: boolean;
  onClick: () => void;
}

const stateColors = {
  available: "bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg",
  held: "bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg",
  reserved: "bg-orange-500 hover:bg-orange-600 shadow-md hover:shadow-lg",
  sold: "bg-slate-400 hover:bg-slate-500 shadow-md hover:shadow-lg",
};

export default function Seat({
  seatId,
  state,
  seatSessionId,
  currentSessionId,
  isSelected,
  onClick,
}: SeatProps) {
  const isHeldBySameSession =
    state === "held" && seatSessionId === currentSessionId;

  // ✅ Clickable if available OR held by same session
  const isClickable = state === "available" || isHeldBySameSession;

  return (
    <motion.button
      onClick={() => isClickable && onClick()}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.1, y: -2 } : {}}
      whileTap={isClickable ? { scale: 0.92 } : {}}
      className={cn(
        "w-7 h-7 rounded flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 flex-shrink-0",
        stateColors[state],
        isSelected &&
          (state === "available" || isHeldBySameSession) &&
          "ring-2 ring-primary ring-offset-2 scale-102 shadow-xl"
      )}
      aria-label={`Seat ${seatId} - ${state}`}
      title={`Seat ${seatId} - ${state}${
        seatSessionId
          ? seatSessionId === currentSessionId
            ? " (held by you)"
            : " (held by someone else)"
          : ""
      }`}
    >
      <Armchair className="w-3.5 h-3.5 text-white" />
    </motion.button>
  );
}
