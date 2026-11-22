import { getRepositories, platformContext } from "@/lib/firestore";

export async function loadPurgeOperationContext(gymId: string) {
  const { gyms, gymDeletionJobs, gymFinancialArchives } = getRepositories();
  const gym = await gyms.getById(platformContext, gymId);
  if (!gym) return null;

  const job = gym.purgeJobId
    ? await gymDeletionJobs.getById(gym.purgeJobId)
    : await gymDeletionJobs.getByGymId(gymId);

  const archive = await gymFinancialArchives.getByGymId(gymId);

  return {
    gym: { ...gym, id: gym.id },
    job: job ? { ...job, id: job.id } : null,
    archive: archive ? { ...archive, id: archive.id } : null,
  };
}