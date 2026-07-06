import { PosShell } from "@/components/pos/PosShell";
import { RequireAuth } from "@/components/guards";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PosShell>{children}</PosShell>
    </RequireAuth>
  );
}
