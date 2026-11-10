"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";

const notificationOptions = [
  {
    id: "mentions",
    label: "Mentions",
    description: "When someone mentions you.",
  },
  {
    id: "comments",
    label: "Comments",
    description: "When someone comments on your documents.",
  },
  {
    id: "documentUpdates",
    label: "Document updates",
    description: "When shared documents are updated.",
  },
  {
    id: "workspaceInvitations",
    label: "Workspace invitations",
    description: "When someone invites you to a workspace.",
  },
];

const notificationChannels = [
  {
    id: "inApp",
    label: "In-app notifications",
    description: "Receive notifications inside Synapse.",
  },
  {
    id: "email",
    label: "Email notifications",
    description: "Receive activity updates by email.",
  },
] as const;

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState({
    mentions: true,
    comments: true,
    documentUpdates: true,
    workspaceInvitations: true,
    inApp: true,
    email: true,
  });
  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold sm:text-xl">Notifications</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Manage how and when Synapse notifies you.
        </p>
      </div>

      <section className="space-y-2 rounded-lg border px-3 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Activity notifications</h2>
          <p className="text-xs text-muted-foreground">
            Choose which activities you want to be notified about.
          </p>
        </div>

        <div className="">
          {notificationOptions.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium sm:text-sm">{option.label}</p>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  {option.description}
                </p>
              </div>

              <Switch
                checked={preferences[option.id as keyof typeof preferences]}
                onCheckedChange={() =>
                  handleToggle(option.id as keyof typeof preferences)
                }
                aria-label={option.label}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-lg border px-3 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Notification channels</h2>
          <p className="text-xs text-muted-foreground">
            Choose where you want to receive notifications.
          </p>
        </div>

        <div className="divide-y rounded-lg border">
          {notificationChannels.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium sm:text-sm">{option.label}</p>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  {option.description}
                </p>
              </div>

              <Switch
                checked={preferences[option.id]}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    [option.id]: checked,
                  }))
                }
                aria-label={option.label}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
