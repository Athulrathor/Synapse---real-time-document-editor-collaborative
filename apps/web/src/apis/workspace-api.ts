
import { API_ENDPOINTS } from "@/apis/api-endpoint";
import { apiRequest } from "@/apis/api-client";

import type {
  Workspace,
  CreateWorkspaceInput,
} from "@/types/workspace.type";

export const workspaceService = {
  list(): Promise<Workspace[]> {
    return apiRequest<Workspace[]>(API_ENDPOINTS.workspaces.list);
  },

  create(input: CreateWorkspaceInput): Promise<Workspace> {
    return apiRequest<Workspace>(API_ENDPOINTS.workspaces.create, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getById(workspaceId: string): Promise<Workspace> {
    return apiRequest<Workspace>(
      API_ENDPOINTS.workspaces.detail(workspaceId),
    );
  },
};
