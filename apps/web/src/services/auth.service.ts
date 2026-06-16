import Cookies from 'js-cookie';
import apiClient from '@/lib/api-client';
import type { AuthResponse, LoginCredentials } from '@/types/auth.types';

const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(
      '/auth/login',
      credentials,
    );

    // Store access token in cookie; refresh token is httpOnly (set by server)
    Cookies.set('access_token', data.accessToken, COOKIE_OPTIONS);

    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Backend logout failed, proceeding with local logout', error);
    } finally {
      Cookies.remove('access_token');
    }
  },

  async me() {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  getAccessToken(): string | undefined {
    return Cookies.get('access_token');
  },

  isAuthenticated(): boolean {
    return !!Cookies.get('access_token');
  },
};
