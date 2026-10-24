import type { Database } from "./database";

/** Baris tabel `profiles` (ekstensi dari auth.users). */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Re-export tipe domain agar mudah diimpor dari satu tempat.
export type {
  Role,
  ApprovalLayer,
  RequestStatus,
  ApprovalAction,
  IzinType,
} from "@/lib/constants";
