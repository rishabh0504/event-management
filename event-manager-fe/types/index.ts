export type Seat = {
  id: string;
  section_id: string;
  row_id: string | null;
  col: number;
  price_tier: number;
  status: "available" | "held" | "reserved" | "sold";
  held_by?: string | null;
  heldBy?: string | null;
  held_at?: string | null;
  created_at?: string;
  updated_at?: string;
  x?: number;
  y?: number;
};
