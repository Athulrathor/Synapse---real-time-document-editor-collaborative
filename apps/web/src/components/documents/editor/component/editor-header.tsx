import { Check, Cloud, CloudOff, LoaderCircle, Wifi, WifiOff } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export type SaveStatus = "SAVED" | "SAVING" | "ERROR";
export type ConnectionStatus =
  | "CONNECTED"
  | "CONNECTING"
  | "DISCONNECTED"
  | "RECONNECTING";

interface Collaborator {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface EditorHeaderProps {
  title: string;
  saveStatus: SaveStatus;
  connectionStatus: ConnectionStatus;
  collaborators: Collaborator[];
}

export default function EditorHeader({
  title,
  saveStatus,
  connectionStatus,
  collaborators,
}: EditorHeaderProps) {
  const saveState = {
    SAVED: {
      label: "All changes saved",
      icon: Check,
    },
    SAVING: {
      label: "Saving changes...",
      icon: LoaderCircle,
    },
    ERROR: {
      label: "Save failed",
      icon: CloudOff,
    },
  }[saveStatus];

  const connectionState = {
    CONNECTED: { label: "Connected", variant: "default" as const, icon: Wifi },
    CONNECTING: { label: "Connecting...", variant: "secondary" as const, icon: LoaderCircle },
    DISCONNECTED: { label: "Disconnected", variant: "destructive" as const, icon: WifiOff },
    RECONNECTING: { label: "Reconnecting...", variant: "secondary" as const, icon: LoaderCircle },
  }[connectionStatus];

  const SaveIcon = saveState.icon;
  const ConnectionIcon = connectionState.icon;

  return (
    <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="truncate text-lg font-semibold">{title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <SaveIcon
              className={`size-3.5 ${
                saveStatus === "SAVING" ? "animate-spin" : ""
              }`}
            />
            {saveState.label}
          </span>

          <Badge variant={connectionState.variant} className="gap-1">
            <ConnectionIcon
              className={`size-3 ${
                connectionStatus === "CONNECTING" ||
                connectionStatus === "RECONNECTING"
                  ? "animate-spin"
                  : ""
              }`}
            />
            {connectionState.label}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {collaborators.length} active
        </span>

        <div className="flex -space-x-2">
          {collaborators.slice(0, 4).map((user) => (
            <Avatar key={user.id} className="size-8 border-2 border-background">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
              <AvatarFallback>
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}

          {collaborators.length > 4 && (
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
              +{collaborators.length - 4}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}