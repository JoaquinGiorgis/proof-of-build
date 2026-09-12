import { notFound } from "next/navigation";
import { CreateFlow } from "@/components/create/create-flow";
import { CORDOBA_HACK } from "@/lib/mock";
import { getEvent } from "@/lib/queries";

export const metadata = { title: "Register your build" };

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const { event: eventParam } = await searchParams;
  const slug = typeof eventParam === "string" ? eventParam : CORDOBA_HACK.slug;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <div className="relative">
      {/* "Shader · quiet" — the same plate, dialled back so the panels lead. */}
      <CreateFlow event={event} />
    </div>
  );
}
