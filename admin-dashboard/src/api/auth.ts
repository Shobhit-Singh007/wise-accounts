import client from './client';

export interface LoginRequest {
  phone?: string;
  email?: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  businessName?: string;
  gstin?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', data),

  sendOtp: (phone: string, email?: string) =>
    client.post<{ success: boolean; message: string; expiresIn: number; otp?: string }>(
      '/auth/send-otp',
      { phone, email },
    ),

  verifyOtp: (phone: string, otp: string) =>
    client.post<AuthResponse>('/auth/verify-otp', { phone, otp }),

  changePassword: (oldPassword: string, newPassword: string) =>
    client.post<{ message: string }>('/auth/change-password', { oldPassword, newPassword }),

  forgotPassword: (data: { phone?: string; email?: string }) =>
    client.post<{ message: string; otp?: string }>('/auth/forgot-password', data),

  resetPassword: (identifier: string, otp: string, newPassword: string) =>
    client.post<{ message: string }>('/auth/reset-password', { identifier, otp, newPassword }),

  refresh: (refreshToken: string) =>
    client.post<{ accessToken: string; refreshToken?: string }>(
      '/auth/refresh',
      { refreshToken },
    ),

  me: () => client.get<AuthResponse['user']>('/auth/me'),
};
