import { notFound, redirect } from "next/navigation";
import { CreateFlow } from "@/components/create/create-flow";
import { getEvent } from "@/lib/queries";

export const metadata = { title: "Register your build" };

/**
 * There is no default event.
 *
 * A build belongs to the event that vouched for it, and the credential carries
 * that issuer's signature — so arriving here without saying which event you
 * were at is not a case to guess at. It sends you to pick one.
 */
export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const { event: eventParam } = await searchParams;
  if (typeof eventParam !== "string" || !eventParam) redirect("/events");

  const event = await getEvent(eventParam);
  if (!event) notFound();

  return (
    <div className="relative">
      <CreateFlow event={event} />
    </div>
  );
}
