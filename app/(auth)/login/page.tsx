import { Suspense } from "react";
import { Metadata } from "next";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { Package2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in — BFS Inventory",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 flex">

      {/* Left panel — hidden below lg */}
      <div className="bg-zinc-900 relative hidden h-full flex-col p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />

        {/* Logo */}
        <div className="relative z-20 flex items-center gap-2 text-lg font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-white/10">
            <Package2 className="size-4" />
          </div>
          BFS Inventory
        </div>

        {/* Bottom quote */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-base leading-relaxed text-zinc-200">
              Real-time stock visibility, automated reorder alerts, and purchase order
              tracking — purpose-built for the Beauty First warehouse.
            </p>
            <footer className="text-sm text-zinc-400">Beauty Logix Inc.</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex h-full items-center justify-center p-6 lg:p-10">
        <div className="flex w-full max-w-sm flex-col gap-8">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <Package2 className="size-4" />
            </div>
            <span className="text-base font-semibold">BFS Inventory</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access the inventory dashboard.
            </p>
          </div>

          {/* Unauthorized error */}
          {error === "unauthorized" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Your account is not authorised to access BFS Inventory. Contact your administrator.
            </div>
          )}

          {/* OAuth buttons */}
          <Suspense fallback={null}>
            <SignInButtons />
          </Suspense>

          <p className="text-center text-xs text-muted-foreground">
            Access is restricted to authorised Beauty Logix team members.
          </p>
        </div>
      </div>
    </div>
  );
}
