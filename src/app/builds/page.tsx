import { MyBuilds } from "@/components/my-builds";
import { ShaderBackdrop } from "@/components/shader-backdrop";

export const metadata = { title: "My Builds" };

export default function MyBuildsPage() {
  return (
    <div className="relative isolate">
      <ShaderBackdrop className="opacity-40" height="h-[560px]" />
      <MyBuilds />
    </div>
  );
}
