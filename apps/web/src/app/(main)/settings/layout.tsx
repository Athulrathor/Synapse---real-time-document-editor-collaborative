
import type { ReactNode } from "react";
// import Link from "next/link";
// import { Bell, LockKeyhole, Palette, Settings2, UserRound } from "lucide-react";

// const settingsItems = [
//   { label: "General", href: "/settings", icon: Settings2 },
//   { label: "Profile", href: "/settings/profile", icon: UserRound },
//   { label: "Appearance", href: "/settings/appearance", icon: Palette },
//   { label: "Notifications", href: "/settings/notifications", icon: Bell },
//   { label: "Security", href: "/settings/security", icon: LockKeyhole },
// ];


export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">General</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your basic preferences.
      </p>

      <div>{children}</div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-sm font-medium">Language</p>
          <p className="mt-1 text-sm text-muted-foreground">
            English (India)
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <p className="text-sm font-medium">Time zone</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Asia/Kolkata
          </p>
        </div>
      </div>
    </section>
  );
}
