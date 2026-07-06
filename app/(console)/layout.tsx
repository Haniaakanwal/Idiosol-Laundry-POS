import { Sidebar } from "@/components/Sidebar";
import { RequireAdmin } from "@/components/guards";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <div className="min-h-screen">
        <Sidebar />
        <main className="pl-60">
          <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
        </main>
      </div>
    </RequireAdmin>
  );
}
