export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  avatar: {
    id: string;
    name: string;
    fileId: string;
    path: string;
  } | null;
}

export interface UpdateProfileInput {
  name: string;
}