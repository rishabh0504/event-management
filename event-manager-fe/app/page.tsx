"use client";

import { useState, useEffect, useRef } from "react";
import { Moon, Sun, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SeatGrid from "@/components/seat-grid";
import SeatLegend from "@/components/seat-legend";
import { toast } from "sonner";
import { Seat } from "@/types";
import { API_BASE_URL } from "@/lib/constant";

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [seatData, setSeatData] = useState<Record<string, Seat[]>>({});
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const limit = 500;

  // session
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket("ws://localhost:4000/ws/seats");

    ws.onopen = () => {
      console.log("✅ WS connected");
      ws.send(JSON.stringify({ event: "joinSession", sessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("📩 [WS message received]:", msg);

        if (!msg.event) return;

        setSeatData((prev) => {
          if (!prev) return prev;
          const next = { ...prev };

          switch (msg.event) {
            case "seat_held":
              for (const section of Object.keys(next)) {
                next[section] = next[section].map((s) =>
                  s.id === msg.seatId
                    ? { ...s, status: "held", seat_session_id: msg.sessionId }
                    : s
                );
              }
              break;

            case "seat_released":
              for (const section of Object.keys(next)) {
                next[section] = next[section].map((s) =>
                  s.id === msg.seatId
                    ? { ...s, status: "available", seat_session_id: null }
                    : s
                );
              }
              break;

            case "seats_sold":
              for (const section of Object.keys(next)) {
                next[section] = next[section].map((s) =>
                  msg.seatIds.includes(s.id)
                    ? { ...s, status: "sold", seat_session_id: null }
                    : s
                );
              }
              break;

            default:
              console.warn("⚠️ Unhandled event:", msg.event);
          }

          return next;
        });
      } catch (err) {
        console.error("❌ WS message error:", err);
      }
    };

    ws.onclose = () => console.warn("⚠️ WS disconnected");
    ws.onerror = (err) => console.error("❌ WS error:", err);

    return () => ws.close();
  }, [sessionId]);

  // ✅ Initialize session
  useEffect(() => {
    const initSession = async () => {
      let stored = localStorage.getItem("seat_session_id");
      if (stored) {
        setSessionId(stored);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/seats/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
        });

        if (!res.ok) throw new Error("Server session creation failed");

        const json = await res.json();
        const sid = json?.sessionId ?? json?.session_id ?? json?.sessionId;
        if (sid) {
          localStorage.setItem("seat_session_id", sid);
          setSessionId(sid);
        }
      } catch {
        stored = `sess_${Math.random()
          .toString(36)
          .slice(2, 10)}_${Date.now()}`;
        localStorage.setItem("seat_session_id", stored);
        setSessionId(stored);
        toast.error("Created offline session", {
          description: "Server unavailable, using local session id.",
        });
      }
    };
    initSession();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark", !isDark);
  };

  const normalizeSeat = (s: any): Seat => ({
    ...s,
    heldBy: s.held_by ?? s.heldBy ?? null,
  });

  // ✅ Fetch seats ordered by section_id + id ascending
  const fetchSeats = async (pageNum: number) => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/seats?page=${pageNum}&limit=${limit}&order=section_id,id`
      );
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();

      if (!json?.data?.length) {
        setHasMore(false);
        return;
      }

      const normalized = (json.data as any[]).map((s) => normalizeSeat(s));
      const grouped: Record<string, Seat[]> = {};
      normalized.forEach((seat) => {
        const section = seat.section_id ?? "A";
        if (!grouped[section]) grouped[section] = [];
        grouped[section].push(seat);
      });

      setSeatData((prev) => {
        const next = { ...prev };
        Object.entries(grouped).forEach(([section, seats]) => {
          next[section] = [...(next[section] ?? []), ...seats];
        });
        return next;
      });

      if (json.data.length < limit) setHasMore(false);
    } catch (err) {
      console.error("Error fetching seats:", err);
      toast.error("Failed to load seats", {
        description: "Please check your server connection.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Infinite scroll
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => setPage((prev) => prev + 1), 300);
        }
      },
      { threshold: 0.25 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isLoading, hasMore]);

  // Helpers
  const updateSeatInState = (seatId: string, updater: (s: Seat) => Seat) => {
    setSeatData((prev) => {
      const next = { ...prev };
      for (const section of Object.keys(next)) {
        next[section] = next[section].map((s) =>
          s.id === seatId ? updater(s) : s
        );
      }
      return next;
    });
  };

  const countHeldBySession = () =>
    Object.values(seatData)
      .flat()
      .filter((s) => s.status === "held" && s.heldBy === sessionId).length;

  // ✅ API: hold, release, complete reservation
  const apiHoldSeat = async (seatId: string) => {
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "x-session-id": sessionId,
    };
    return fetch(`${API_BASE_URL}/api/seats/hold`, {
      method: "POST",
      headers,
      body: JSON.stringify({ seatId }),
    });
  };

  const apiReleaseSeat = async (seatId: string) => {
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "x-session-id": sessionId,
    };
    return fetch(`${API_BASE_URL}/api/seats/release`, {
      method: "POST",
      headers,
      body: JSON.stringify({ seatId }),
    });
  };

  // ✅ Complete reservation → convert held seats to sold
  const apiCompleteReservation = async () => {
    const headers = {
      "Content-Type": "application/json",
      Accept: "*/*",
      "x-session-id": sessionId,
    };

    const heldSeatIds = Object.values(seatData)
      .flat()
      .filter((s) => s.status === "held" && s.heldBy === sessionId)
      .map((s) => s.id);

    if (heldSeatIds.length === 0) {
      toast.warning("No seats selected", {
        description: "Please select seats before confirming.",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/seats/complete`, {
        method: "POST",
        headers,
        body: JSON.stringify({ seatIds: heldSeatIds }),
      });

      if (!res.ok) throw new Error(`Reservation failed (${res.status})`);
      const j = await res.json();

      // ✅ Update local UI
      setSeatData((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((section) => {
          next[section] = next[section].map((s) =>
            heldSeatIds.includes(s.id)
              ? { ...s, status: "sold", heldBy: null }
              : s
          );
        });
        return next;
      });

      toast.success("Booking complete", {
        description: `Reserved ${heldSeatIds.length} seat(s) successfully.`,
      });
    } catch (err: any) {
      toast.error("Reservation failed", {
        description: err?.message ?? "Unable to complete reservation.",
      });
    }
  };

  // Seat click handler
  const handleSeatClick = async (seatId: string) => {
    if (!sessionId)
      return toast.error("Session not ready", {
        description: "Please wait a moment.",
      });

    const sectionKey = Object.keys(seatData).find((section) =>
      seatData[section].some((s) => s.id === seatId)
    );
    if (!sectionKey) return;
    const seat = seatData[sectionKey].find((s) => s.id === seatId);
    if (!seat) return;

    if (seat.status === "held" && seat.heldBy && seat.heldBy !== sessionId)
      return toast.warning("Seat already held", {
        description: "This seat is held by another user.",
      });

    if (seat.status === "available") {
      if (countHeldBySession() >= 8)
        return toast.warning("Limit reached", {
          description: "You can hold up to 8 seats at a time.",
        });

      updateSeatInState(seatId, (s) => ({
        ...s,
        status: "held",
        heldBy: sessionId,
      }));
      try {
        const res = await apiHoldSeat(seatId);
        if (!res.ok) throw new Error("Failed to hold seat");
        const j = await res.json();
        const updated = normalizeSeat(j?.seat ?? {});
        if (updated?.id) updateSeatInState(updated.id, () => ({ ...updated }));
        toast.success("Seat held", { description: `Seat ${seatId} is held.` });
      } catch (err: any) {
        updateSeatInState(seatId, (s) => ({
          ...s,
          status: "available",
          heldBy: null,
        }));
        toast.error("Hold failed", { description: err.message });
      }
    } else if (seat.status === "held" && seat.heldBy === sessionId) {
      updateSeatInState(seatId, (s) => ({
        ...s,
        status: "available",
        heldBy: null,
      }));
      try {
        const res = await apiReleaseSeat(seatId);
        if (!res.ok) throw new Error("Failed to release seat");
        const j = await res.json();
        const updated = normalizeSeat(j?.seat ?? {});
        if (updated?.id) updateSeatInState(updated.id, () => ({ ...updated }));
        toast.info("Seat released", {
          description: `Seat ${seatId} released.`,
        });
      } catch (err: any) {
        updateSeatInState(seatId, (s) => ({
          ...s,
          status: "held",
          heldBy: sessionId,
        }));
        toast.error("Release failed", { description: err.message });
      }
    }
  };

  const totalSeats = Object.values(seatData)
    .flat()
    .filter((s) => s.status === "held" && s.heldBy === sessionId).length;

  const totalPrice = totalSeats * 75;

  return (
    <div className={isDark ? "dark" : ""}>
      <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
          <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-primary-foreground">
                  ✓
                </span>
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                  Event Seat Manager
                </h1>
                <p className="text-xs text-muted-foreground">
                  Real-time interactive layout
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-accent" />
              ) : (
                <Moon className="h-5 w-5 text-primary" />
              )}
            </Button>
          </div>
        </header>

        {/* Main */}
        <div className="w-full sm:px-8 px-3">
          <Card className="w-full border-border/40 bg-card/40 backdrop-blur-sm shadow-2xl">
            <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-background p-6 border-b border-border/40 sticky top-0 z-20">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <p className="text-sm font-semibold text-primary uppercase tracking-widest">
                    Metropolis Arena
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {totalSeats
                      ? `${totalSeats} selected • ${totalPrice} AED`
                      : "Select seats"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SeatLegend />
                  {totalSeats > 0 && (
                    <Button
                      size="sm"
                      onClick={apiCompleteReservation}
                      className="flex items-center gap-1 bg-primary text-white hover:bg-primary/90"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Booking
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Screen */}
            <div className="sticky top-10 z-10 bg-card/80 backdrop-blur-sm py-4">
              <div className="flex justify-center">
                <div className="w-full max-w-3xl">
                  <div className="relative h-1 bg-gradient-to-r from-transparent via-foreground/30 to-transparent rounded-full" />
                  <div className="text-center mt-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Screen
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seat grid */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-2 space-y-12">
              <div className="flex flex-wrap justify-center gap-16 w-full">
                {Object.entries(seatData).map(([section, seats]) => (
                  <div
                    key={section}
                    className="flex flex-col items-center w-auto min-w-[500px]"
                  >
                    <p className="text-xs font-semibold text-muted-foreground mb-2 text-center sticky top-32 bg-card/80 backdrop-blur-sm py-1 px-2 rounded">
                      Section {section}
                    </p>
                    <SeatGrid
                      seats={seats}
                      selectedSeats={
                        new Set(
                          seats
                            .filter(
                              (s) =>
                                s.status === "held" && s.heldBy === sessionId
                            )
                            .map((s) => s.id)
                        )
                      }
                      onSeatClick={handleSeatClick}
                      currentSessionId={sessionId}
                    />
                  </div>
                ))}
              </div>

              <div
                ref={observerTarget}
                className="h-24 flex items-center justify-center border-t border-border/20"
              >
                {isLoading && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground font-medium">
                      Loading more seats...
                    </span>
                  </div>
                )}
                {!hasMore && (
                  <span className="text-xs text-muted-foreground font-medium">
                    All seats loaded
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
