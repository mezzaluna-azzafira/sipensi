"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { APPROVAL_ACTIONS } from "@/lib/constants";

export type DecideState = { error?: string };

export async function decideRequest(
  _prevState: DecideState,
  formData: FormData,
): Promise<DecideState> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("_action") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const decision =
    raw === APPROVAL_ACTIONS.APPROVED
      ? ("approved" as const)
      : raw === APPROVAL_ACTIONS.REJECTED
        ? ("rejected" as const)
        : null;

  if (!id || !decision) return { error: "Permintaan tidak valid." };
  if (decision === "rejected" && note.length === 0) {
    return { error: "Penolakan wajib menyertakan alasan." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_request", {
    p_request: id,
    p_action: decision,
    p_note: note.length ? note : undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/persetujuan");
  revalidatePath("/izin");
  redirect("/persetujuan?done=1");
}
