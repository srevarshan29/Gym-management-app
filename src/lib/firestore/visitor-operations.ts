import { adjustGymCounter } from "@/lib/firestore/gym-counters";
import { newDocId, platformContext } from "@/lib/firestore/helpers";
import { getRepositories } from "@/lib/firestore";
import type { CreateVisitorInput } from "@/lib/firestore/repositories/visitors";
import type { VisitorSource, VisitorStatus } from "@/lib/firestore/types";

function affectsPendingWalkInCounter(
  source: VisitorSource,
  status: VisitorStatus,
): boolean {
  return source === "walk_in" && status === "pending";
}

export async function createWalkInVisitor(
  gymId: string,
  input: Omit<CreateVisitorInput, "source" | "status">,
) {
  const { visitors, gyms } = getRepositories();
  const id = newDocId();
  const doc = await visitors.createVisitor(platformContext, gymId, id, {
    ...input,
    source: "walk_in",
    status: "pending",
  });
  await adjustGymCounter(gyms, gymId, "pendingWalkInVisitors", 1);
  return doc;
}

export type CreateQrRegistrationResult =
  | { duplicate: true }
  | { duplicate: false; id: string };

export async function createQrRegistrationVisitor(
  gymId: string,
  input: Omit<CreateVisitorInput, "source" | "status">,
): Promise<CreateQrRegistrationResult> {
  const { visitors } = getRepositories();
  const existing = await visitors.findPendingQrByPhone(
    platformContext,
    gymId,
    input.phone,
  );
  if (existing) return { duplicate: true };

  const id = newDocId();
  await visitors.createVisitor(platformContext, gymId, id, {
    ...input,
    source: "qr_registration",
    status: "pending",
  });
  return { duplicate: false, id };
}

export async function deleteVisitorRecord(
  gymId: string,
  id: string,
): Promise<boolean> {
  const { visitors, gyms } = getRepositories();
  const doc = await visitors.getById(platformContext, gymId, id);
  if (!doc) return false;

  await visitors.delete(platformContext, gymId, id);
  if (affectsPendingWalkInCounter(doc.source, doc.status)) {
    await adjustGymCounter(gyms, gymId, "pendingWalkInVisitors", -1);
  }
  return true;
}

export async function convertVisitorRecord(
  gymId: string,
  id: string,
): Promise<boolean> {
  const { visitors, gyms } = getRepositories();
  const doc = await visitors.getById(platformContext, gymId, id);
  if (!doc || doc.status !== "pending") return false;

  await visitors.updateVisitor(platformContext, gymId, id, {
    status: "converted",
  });
  if (doc.source === "walk_in") {
    await adjustGymCounter(gyms, gymId, "pendingWalkInVisitors", -1);
  }
  return true;
}
