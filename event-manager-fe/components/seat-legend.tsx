"use client";
import { Badge } from "@/components/ui/badge";

export default function SeatLegend() {
  const legendItems = [
    {
      color: "bg-emerald-500",
      label: "Available",
      description: "Ready to book",
    },
    {
      color: "bg-amber-500",
      label: "Held",
      description: "Reserved temporarily",
    },
    {
      color: "bg-orange-500",
      label: "Reserved",
      description: "Your selection",
    },
    { color: "bg-slate-400", label: "Sold", description: "Not available" },
  ];

  return (
    <div className="flex items-center gap-4 overflow-x-auto">
      {legendItems.map((item) => (
        <Badge
          key={item.label}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-1 text-xs font-semibold ${item.color} text-white shadow-sm`}
        >
          <span className="w-3 h-3 rounded-sm border border-white/50" />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold">{item.label}</span>
            <span className="text-[8px] opacity-80">{item.description}</span>
          </div>
        </Badge>
      ))}
    </div>
  );
}
