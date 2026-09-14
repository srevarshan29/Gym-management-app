import { adjustGymCounter } from "@/lib/firestore/gym-counters";
import { newDocId, platformContext } from "@/lib/firestore/helpers";
import { getRepositories } from "@/lib/firestore";
import type { CreateEventInput } from "@/lib/firestore/repositories/events";

export async function createEventRecord(gymId: string, input: CreateEventInput) {
  const { events, gyms } = getRepositories();
  const id = newDocId();
  const doc = await events.createEvent(platformContext, gymId, id, input);
  await adjustGymCounter(gyms, gymId, "eventCount", 1);
  return doc;
}

export async function deleteEventRecord(
  gymId: string,
  id: string,
): Promise<boolean> {
  const { events, gyms } = getRepositories();
  const doc = await events.getById(platformContext, gymId, id);
  if (!doc) return false;

  await events.delete(platformContext, gymId, id);
  await adjustGymCounter(gyms, gymId, "eventCount", -1);
  return true;
}
