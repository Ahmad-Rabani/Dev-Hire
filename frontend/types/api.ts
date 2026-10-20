export type ApiSuccessResponse<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: ApiFieldError[];
};

export type HealthData = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  database: {
    connected: boolean;
    readyState: number;
  };
};
