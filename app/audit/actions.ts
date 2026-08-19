"use server";

import { revalidatePath } from "next/cache";

import { createPostgresAuditRepository } from "@/lib/audit/postgres-audit-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export type DraftAuditTransfersResult =
  | { status: "success"; created: number }
  | { status: "error"; message: string };

export async function draftAuditTransfersAction(
  transferIds: string[]
): Promise<DraftAuditTransfersResult> {
  try {
    const created = await createPostgresAuditRepository().saveDraftTransfers(
      await getCurrentTripId(),
      [...new Set(transferIds)]
    );
    revalidatePath("/audit");
    revalidatePath("/calendar");
    return { status: "success", created };
  } catch {
    return { status: "error", message: "Не удалось сохранить черновики переездов" };
  }
}
