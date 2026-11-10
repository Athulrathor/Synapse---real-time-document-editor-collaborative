import { apiRequest } from "@/apis/api-client";
import { API_ENDPOINTS } from "./api-endpoint";
import { UpdateProfileInput, UserProfile } from "@/types/user-type";

export const userService = {
  async getProfile(): Promise<UserProfile> {
    return await apiRequest(API_ENDPOINTS.users.detail);
  },

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    return await apiRequest(API_ENDPOINTS.users.update, {
      method: "PATCH",
      json: input,
    });
  },

  async uploadAvatar(file: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append("avatar", file);

    return await apiRequest(
      `${API_ENDPOINTS.users.detail}/avatar`,
      {
        method: "POST",
        json: formData
      },
    );
  },

  async removeAvatar(): Promise<{ message: string }> {
    return await apiRequest(`${API_ENDPOINTS.users.detail}/avatar`,{method: "DELETE"});
  },
};
