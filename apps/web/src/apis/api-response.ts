export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  timestamp: string;
  data: T;
}