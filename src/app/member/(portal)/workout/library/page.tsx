import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ addTo?: string }>;
};

export default async function MemberExerciseLibraryRedirectPage({
  searchParams,
}: PageProps) {
  const { addTo } = await searchParams;
  const q = addTo?.trim()
    ? `?tab=library&addTo=${encodeURIComponent(addTo.trim())}`
    : "?tab=library";
  redirect(`/member/workout${q}`);
}
