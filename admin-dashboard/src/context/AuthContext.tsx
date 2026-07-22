import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, type AuthResponse } from '../api/auth';

interface AuthContextType {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  register: (data: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (data: { phone?: string; email?: string }) => Promise<{ message: string; otp?: string }>;
  resetPassword: (identifier: string, otp: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi
        .me()
        .then(({ data }) => setUser(data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const isEmail = identifier.includes('@');
    const { data } = await authApi.login(isEmail ? { email: identifier, password } : { phone: identifier, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, []);

  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    const { data } = await authApi.verifyOtp(phone, otp);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await authApi.sendOtp(phone);
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await authApi.changePassword(oldPassword, newPassword);
  }, []);

  const forgotPassword = useCallback(async (data: { phone?: string; email?: string }) => {
    const res = await authApi.forgotPassword(data);
    return res.data;
  }, []);

  const resetPassword = useCallback(async (identifier: string, otp: string, newPassword: string) => {
    await authApi.resetPassword(identifier, otp, newPassword);
  }, []);

  const register = useCallback(
    async (regData: { name: string; email?: string; phone?: string; password: string }) => {
      const { data } = await authApi.register(regData);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: !!user,
          loading,
          login,
          loginWithOtp,
          sendOtp,
          register,
          changePassword,
          forgotPassword,
          resetPassword,
          logout,
        }}
      >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
