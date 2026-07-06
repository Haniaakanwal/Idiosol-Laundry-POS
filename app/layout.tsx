import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { PosStoreProvider } from "@/lib/pos-store";
import { AuthProvider } from "@/lib/auth-store";

export const metadata: Metadata = {
  title: "LaundryPOS — Control Plane",
  description: "Multi-tenant admin console for the LaundryPOS platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <StoreProvider>
        <AuthProvider>
          
            <PosStoreProvider>{children}</PosStoreProvider>
          
        </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
