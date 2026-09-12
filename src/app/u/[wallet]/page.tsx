import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { ShaderBackdrop } from "@/components/shader-backdrop";
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
    <div className="relative isolate">
      <ShaderBackdrop className="opacity-40" height="h-[560px]" />
      <ProfileView profile={profile} events={events} />
    </div>
  );
}
