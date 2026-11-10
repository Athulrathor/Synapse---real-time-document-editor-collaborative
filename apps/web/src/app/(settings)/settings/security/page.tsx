"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth-store-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: PasswordFieldProps) {
  return (
    <div className="grid gap-1.5 md:grid-cols-[200px_minmax(0,1fr)] md:items-center md:gap-4">
      <Label htmlFor={id} className="text-xs sm:text-sm">
        {label}
      </Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={128}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // text-base on mobile prevents iOS Safari zooming on focus
        className="h-9 w-full text-base sm:h-10 sm:text-sm md:max-w-md"
      />
    </div>
  );
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const changePassword = useAuthStore((state) => state.changePassword);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different.");
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      toast.success("Password changed successfully. Please log in again.");
      router.replace("/login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to change password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg font-semibold sm:text-xl md:text-2xl">
          Security
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Manage your account security and authentication.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border p-3 sm:space-y-4 sm:p-4 md:p-5">
        <div>
          <h2 className="text-sm font-semibold sm:text-base">
            Change password
          </h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs md:text-sm">
            Update your password to keep your account secure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <PasswordField
            id="currentPassword"
            label="Current password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="newPassword"
            label="New password"
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          <div className="flex justify-end pt-1 sm:pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}