import { MyBuilds } from "@/components/my-builds";

export const metadata = { title: "My Builds" };

export default function MyBuildsPage() {
  return (
    <div className="relative">
      <MyBuilds />
    </div>
  );
}
