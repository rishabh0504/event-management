"use client";

import Seat from "./seat";
import type { Seat as SeatType } from "@/types";

interface SeatGridProps {
  seats: SeatType[];
  selectedSeats: Set<string>;
  onSeatClick: (seatId: string) => void;
  currentSessionId: string; // 👈 pass from parent (already known)
}

export default function SeatGrid({
  seats,
  selectedSeats,
  onSeatClick,
  currentSessionId,
}: SeatGridProps) {
  if (!seats?.length) return null;

  const subBlockGroups: Record<string, SeatType[]> = {};
  const subBlockRegex = /^([A-Z]-\d+)-(\d+)-/;

  seats.forEach((seat) => {
    const match = seat.id.match(subBlockRegex);
    const subBlock = match ? match[1] : seat.section_id;
    if (!subBlockGroups[subBlock]) subBlockGroups[subBlock] = [];
    subBlockGroups[subBlock].push(seat);
  });

  const sortedSubBlocks = Object.keys(subBlockGroups).sort((a, b) => {
    const [, numAStr] = a.split("-");
    const [, numBStr] = b.split("-");
    return parseInt(numAStr, 10) - parseInt(numBStr, 10);
  });

  const allChunkedRows: SeatType[][] = [];
  sortedSubBlocks.forEach((subBlock) => {
    const seatsInBlock = subBlockGroups[subBlock];
    const groupedByRow: Record<string, SeatType[]> = {};

    seatsInBlock.forEach((seat) => {
      const row = seat.row_id ?? "UNKNOWN";
      if (!groupedByRow[row]) groupedByRow[row] = [];
      groupedByRow[row].push(seat);
    });

    const sortedRows = Object.entries(groupedByRow).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    sortedRows.forEach(([, rowSeats]) =>
      rowSeats.sort((a, b) => a.col - b.col)
    );

    const flatSeats = sortedRows.flatMap(([, rowSeats]) => rowSeats);
    for (let i = 0; i < flatSeats.length; i += 25) {
      allChunkedRows.push(flatSeats.slice(i, i + 25));
    }
  });

  const firstRowSeats = allChunkedRows[0] ?? [];

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {firstRowSeats.length > 0 && (
        <div className="flex items-start gap-4 overflow-x-auto pb-2 w-full justify-center">
          <div className="w-16 flex-shrink-0" />
          <div className="flex gap-0.5 flex-wrap justify-center">
            {firstRowSeats.map((_, idx) => (
              <div
                key={`col-${idx}`}
                className="w-6 h-6 flex items-center justify-center"
              >
                <span className="text-[10px] text-muted-foreground/70 font-semibold">
                  {(idx + 1).toString().padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 w-full flex flex-col items-center">
        {allChunkedRows.map((rowSeats) => {
          if (!rowSeats.length) return null;

          const firstSeatId = rowSeats[0].id;
          const match = firstSeatId.match(subBlockRegex);
          const subBlock = match ? match[1] : rowSeats[0].section_id;
          const startSeatNum = match ? parseInt(match[2], 10) : 1;

          const lastSeatId = rowSeats[rowSeats.length - 1].id;
          const lastMatch = lastSeatId.match(subBlockRegex);
          const endSeatNum = lastMatch
            ? parseInt(lastMatch[2], 10)
            : rowSeats.length;

          const rowLabel = `${subBlock} (${startSeatNum
            .toString()
            .padStart(2, "0")}-${endSeatNum.toString().padStart(2, "0")})`;

          return (
            <div
              key={`row-${rowLabel}-${rowSeats[0].row_id}`}
              className="flex gap-6 items-center justify-center"
            >
              <div className="w-16 text-xs font-bold text-foreground text-center">
                {rowLabel}
              </div>

              <div className="flex gap-4 flex-wrap justify-center max-w-full">
                {rowSeats.map((seat) => {
                  const isSelected = selectedSeats.has(seat.id);
                  return (
                    <Seat
                      key={seat.id}
                      seatId={seat.id}
                      state={seat.status}
                      seatSessionId={seat.heldBy ?? null} // ✅ correct prop from backend
                      currentSessionId={currentSessionId}
                      isSelected={isSelected}
                      onClick={() => onSeatClick(seat.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
