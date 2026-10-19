"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  Clock3,
  Command,
  FileText,
  FolderKanban,
  Home,
  Plus,
  Settings2,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { useUIStore } from "@/stores/ui.store";
import Image from "next/image";

import Synapse from "../../../public/Synapse.svg"

const menu = [
  { label: "Home", href: "/", icon: Home },
  { label: "My Documents", href: "/documents", icon: FileText },
  { label: "Shared with me", href: "/shared", icon: Share2 },
  { label: "Favorites", href: "/favorites", icon: Star },
  { label: "Recent", href: "/recent", icon: Clock3 },
  { label: "Trash", href: "/trash", icon: Trash2 },
];

const workspaces = [
  { id: "personal", name: "Personal Workspace", plan: "Free Plan" },
  { id: "design", name: "Design Team", plan: "Team Plan" },
  { id: "development", name: "Development", plan: "Team Plan" },
];

const itemBase =
  "flex min-h-10 w-full items-center rounded-lg text-sm transition-colors";
const itemIdle =
  "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

/* ------------------------------------------------------------------ */
/* Shared sidebar body — used by BOTH the desktop rail and mobile drawer */
/* ------------------------------------------------------------------ */
function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  /** Called after a link is clicked (mobile uses it to close the drawer) */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const storedWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useUIStore((s) => s.setActiveWorkspace);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Close the workspace dropdown on outside click / Escape (no extra hook file)
  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!switcherRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dropdownOpen]);

  const activeId = storedWorkspaceId ?? workspaces[0].id;
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  const pad = collapsed ? "justify-center px-2" : "gap-3 px-3";

  return (
    <>
      {/* Workspace switcher */}
      <div ref={switcherRef} className="relative border-b border-border p-2">
        <button
          type="button"
          title={collapsed ? active.name : undefined}
          aria-label={`Current workspace: ${active.name}`}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          onClick={() => setDropdownOpen((o) => !o)}
          className={`flex w-full items-center rounded-lg border border-border bg-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            collapsed ? "justify-center p-2" : "justify-between gap-2 px-3 py-2.5"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="size-4" aria-hidden="true" />
            </span>
            {!collapsed && (
              <span className="min-w-0 text-left">
                <span className="block truncate text-xs font-medium">
                  {active.name}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {active.plan}
                </span>
              </span>
            )}
          </span>
          {!collapsed && (
            <ChevronDown
              aria-hidden="true"
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {dropdownOpen && (
          <div
            role="listbox"
            aria-label="Select workspace"
            className={`absolute top-full z-30 mt-2 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg ${
              collapsed ? "left-3 w-56" : "left-3 right-3"
            }`}
          >
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={w.id === activeId}
                onClick={() => {
                  setActiveWorkspace(w.id);
                  setDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FolderKanban
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                {w.id === activeId && (
                  <Check className="size-4 text-primary" aria-hidden="true" />
                )}
              </button>
            ))}

            <div className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4 shrink-0" aria-hidden="true" />
                Create workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-1 overflow-y-auto p-2"
      >
        {menu.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`${itemBase} ${pad} ${
                isActive
                  ? "bg-synapse-gradient font-medium text-white shadow-sm"
                  : itemIdle
              }`}
            >
              <Icon className="size-4.25 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <div className="shrink-0 border-t border-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          title={collapsed ? "Settings" : undefined}
          className={`${itemBase} min-h-12 ${pad} ${itemIdle}`}
        >
          <Settings2 className="size-4.25 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <div
          className={`mt-2 flex items-center rounded-lg bg-background p-2 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            A
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">
                Athul Rathor
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Personal account
              </span>
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile drawer (<lg) — driven by mobileSidebarOpen in the store      */
/* ------------------------------------------------------------------ */
function MobileSidebar() {
  const pathname = usePathname();
  const open = useUIStore((s) => s.mobileSidebarOpen);
  const close = useUIStore((s) => s.closeMobileSidebar);

  // Close after navigating
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Escape, scroll lock, and auto-close when the screen grows to desktop
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => e.matches && close();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    mq.addEventListener("change", onChange);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      mq.removeEventListener("change", onChange);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation sidebar"
        onClick={close}
        className="absolute inset-0 bg-black/50 animate-fade-in"
      />

      {/* Panel */}
      <aside
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-xl duration-200"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/" onClick={close} className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg  text-white shadow-sm">
              <Image
              src={Synapse}
              alt="Synapse logo"
              width={36}
              height={36}
              priority
              className="size-9 shrink-0 rounded-lg"
            />
            </span>
            <span className="text-lg font-semibold tracking-tight">Synapse</span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation sidebar"
            onClick={close}
            className="flex size-10 items-center justify-center rounded- lgtext-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <SidebarContent collapsed={false} onNavigate={close} />
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Public component: desktop rail + mobile drawer                      */
/* ------------------------------------------------------------------ */
export function AppSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <>
      <aside
        className={`hidden h-dvh shrink-0 flex-col border-r border-border bg-card/90 transition-[width] duration-200 lg:flex ${
          collapsed ? "w-19" : "w-62"
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <MobileSidebar />
    </>
  );
}