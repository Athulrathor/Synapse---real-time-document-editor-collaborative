import { apiRequest } from "@/apis/api-client";
import { API_ENDPOINTS } from "@/apis/api-endpoint";

import type { PaginatedActivity } from "@/types/activity.type";

export const activityService = {
  getGlobalActivity(
    limit = 20,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<PaginatedActivity> {
    const params = new URLSearchParams({
      limit: String(limit),
    });

    if (cursor) {
      params.set("cursor", cursor);
    }

    return apiRequest<PaginatedActivity>(
      `${API_ENDPOINTS.activity.list}?${params}`,
      { signal },
    );
  },
};