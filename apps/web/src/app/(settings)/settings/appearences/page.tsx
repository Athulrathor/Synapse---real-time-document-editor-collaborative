"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "cn";

const themes = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
  },
] as const;

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg font-semibold sm:text-xl md:text-2xl">
          Appearance
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Customize how Synapse looks on your device.
        </p>
      </div>

      <section className="space-y-2 sm:space-y-3 p-2 border border-muted rounded-lg">
        <div>
          <h2 className="text-xs font-semibold sm:text-sm">Theme preference</h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Choose how Synapse looks on your device.
          </p>
        </div>

        {/* Always a single row: equal-width columns that shrink with the screen */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3">
          {themes.map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTheme(item.value)}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors",
                  "sm:gap-2 sm:px-3 sm:py-2 md:gap-3 md:px-4",
                  "hover:bg-accent/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isSelected ? "border-primary bg-accent/30" : "border-border",
                )}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground sm:size-4" />

                <span className="truncate text-[11px] font-medium sm:text-xs md:text-sm">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}