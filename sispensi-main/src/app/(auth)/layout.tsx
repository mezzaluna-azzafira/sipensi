import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-brand/5 flex min-h-svh flex-1 items-center justify-center p-4">
      {children}
    </main>
  );
}
