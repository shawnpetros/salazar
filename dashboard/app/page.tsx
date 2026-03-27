import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="flex-1 flex flex-col">
      <Dashboard />
    </main>
  );
}
