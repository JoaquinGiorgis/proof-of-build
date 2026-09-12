import { notFound } from "next/navigation";
import { CreateFlow } from "@/components/create/create-flow";
import { ShaderBackdrop } from "@/components/shader-backdrop";
import { CORDOBA_HACK } from "@/lib/mock";
import { getEvent } from "@/lib/queries";

export const metadata = { title: "Register your build" };

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const { event: eventParam } = await searchParams;
  const slug = typeof eventParam === "string" ? eventParam : CORDOBA_HACK.slug;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <div className="relative isolate">
      {/* "Shader · quiet" — the same plate, dialled back so the panels lead. */}
      <ShaderBackdrop className="opacity-60" />
      <CreateFlow event={event} />
    </div>
  );
}
