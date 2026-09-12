import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { getProfile, listEvents } from "@/lib/queries";

export default async function BuilderProfilePage({
  params,
}: PageProps<"/u/[wallet]">) {
  const { wallet } = await params;
  const [profile, events] = await Promise.all([
    getProfile(wallet),
    listEvents(),
  ]);
  if (!profile) notFound();

  return (
    <div className="relative">
      <ProfileView profile={profile} events={events} />
    </div>
  );
}
