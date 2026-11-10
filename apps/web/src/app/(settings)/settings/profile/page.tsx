"use client";

import { useEffect, useRef, useState } from "react";
import { User, Mail, CalendarDays, Camera, Trash2, X } from "lucide-react";

import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
  useRemoveAvatar,
} from "@/hooks/use-user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/libs/env";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfileSettingsPage() {
  const { data: profile, isPending, isError } = useProfile();

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameDraft, setNameDraft] = useState<{
    originalName: string;
    value: string;
  } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState("");

  const isAvatarPending = uploadAvatar.isPending || removeAvatar.isPending;

  const name =
    profile && nameDraft?.originalName === profile.name
      ? nameDraft.value
      : (profile?.name ?? "");

  const hasChanges = profile ? name.trim() !== profile.name : false;

  // Clean up the local image preview URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!avatarMessage) return;

    const timer = setTimeout(() => {
      setAvatarMessage("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [avatarMessage]);

  const handleSave = () => {
    if (!name.trim() || !hasChanges) return;

    updateProfile.mutate({ name: name.trim() });
  };

  const handleCancel = () => {
    setNameDraft(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setAvatarMessage("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarMessage("Only JPEG, PNG, and WebP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAvatarMessage("Image must be smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setAvatarMessage("");

    try {
      await uploadAvatar.mutateAsync(selectedFile);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setAvatarMessage("Profile photo updated successfully.");
    } catch {
      setAvatarMessage("Unable to upload your profile photo.");
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarMessage("");

    try {
      await removeAvatar.mutateAsync();
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setAvatarMessage("Profile photo removed successfully.");
    } catch {
      setAvatarMessage("Unable to remove your profile photo.");
    }
  };

  if (isPending) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-3xl rounded-xl border p-6">
        <p className="text-sm text-muted-foreground">
          Unable to load your profile. Please try again.
        </p>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarSrc = previewUrl
    ? previewUrl
    : profile.avatar?.path
      ? `${env.urls.ImagekitUrl}/${profile.avatar.path}`
      : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information and profile details.
        </p>
      </div>

      {/* Avatar */}
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-5">
          <Avatar className="size-20">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="text-lg font-semibold">
              {initials || <User className="size-7" />}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h2 className="font-medium">Profile photo</h2>
              <p className="text-sm text-muted-foreground">
                Your profile photo is visible to workspace members.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isAvatarPending}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAvatarPending}
              >
                <Camera className="mr-2 size-4" />
                Choose photo
              </Button>

              {profile.avatar && !selectedFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isAvatarPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  {removeAvatar.isPending ? "Removing..." : "Remove"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isAvatarPending}
              >
                <X className="mr-1 size-4" />
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isAvatarPending}
              >
                {uploadAvatar.isPending ? "Uploading..." : "Save photo"}
              </Button>
            </div>
          </div>
        )}

        {avatarMessage && (
          <p
            className={`mt-3 text-sm ${
              avatarMessage.startsWith("Unable") ||
              avatarMessage.startsWith("Only") ||
              avatarMessage.startsWith("Image")
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {avatarMessage}
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          JPEG, PNG or WebP. Maximum file size: 2 MB.
        </p>
      </section>

      {/* Personal Information */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-6">
          <h2 className="font-semibold">Personal information</h2>
          <p className="text-sm text-muted-foreground">
            Update your personal details.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Full name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(event) =>
                setNameDraft({
                  originalName: profile.name,
                  value: event.target.value,
                })
              }
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                value={profile.email}
                readOnly
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your email address cannot be changed here.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Account created</label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t pt-5">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges || updateProfile.isPending}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || !name.trim() || updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </section>
    </div>
  );
}
