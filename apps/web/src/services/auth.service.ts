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

    // Store tokens in cookies
    Cookies.set('access_token', data.accessToken, COOKIE_OPTIONS);
    Cookies.set('refresh_token', data.refreshToken, COOKIE_OPTIONS);

    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore API errors during logout to ensure local state is cleared
      console.warn('Backend logout failed, proceeding with local logout', error);
    } finally {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
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
