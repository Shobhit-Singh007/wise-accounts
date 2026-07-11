import client from './client';

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
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
    role: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', data),

  refresh: (refreshToken: string) =>
    client.post<{ accessToken: string; refreshToken?: string }>(
      '/auth/refresh',
      { refreshToken },
    ),

  me: () => client.get<AuthResponse['user']>('/auth/me'),
};
