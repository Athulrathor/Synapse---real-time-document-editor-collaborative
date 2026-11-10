import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { userService } from "@/apis/user-api";
import { UpdateProfileInput, UserProfile } from "@/types/user-type";
import { useAuthStore } from "@/stores/auth-store-ui";
import { useEffect } from "react";

/* Query Keys */
export const userKeys = {
  all: ["users"] as const,
  profile: () => [...userKeys.all, "profile"] as const,
};

function syncAuthUser(profile: UserProfile) {
  const currentUser = useAuthStore.getState().user;

  if (!currentUser) return;

  useAuthStore.getState().setUser({
    ...currentUser,
    name: profile.name,
    avatar: profile.avatar,
  });
}

/* Get Profile */
export function useProfile() {
  const query = useQuery({
    queryKey: userKeys.profile(),
    queryFn: userService.getProfile,
  });

  useEffect(() => {
    if (query.data) syncAuthUser(query.data);
  }, [query.data]);

  return query;
}

/* Update Profile */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfileInput) =>
      userService.updateProfile(payload),

    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(userKeys.profile(), updatedProfile);
      syncAuthUser(updatedProfile);
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.uploadAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userKeys.profile(),
      });
    },
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.removeAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userKeys.profile(),
      });
    },
  });
}
