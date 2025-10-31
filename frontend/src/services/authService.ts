import axios from 'axios';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const API_BASE_URL = 'https://workout-marcs-projects-3a713b55.vercel.app/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

class AuthService {
  private token: string | null = null;
  private user: AuthUser | null = null;

  constructor() {
    // Load token from localStorage on init
    this.token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
  }

  /**
   * Redirect to Google OAuth login
   * Uses system browser on mobile to avoid Google's webview restrictions
   */
  async loginWithGoogle() {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Open OAuth in system browser on mobile with mobile flag
      await Browser.open({
        url: `${API_BASE_URL}/auth/google?mobile=true`,
        windowName: '_self'
      });
    } else {
      // Use normal redirect on web
      window.location.href = `${API_BASE_URL}/auth/google`;
    }
  }

  /**
   * Handle OAuth callback with token
   */
  handleAuthCallback(token: string): Promise<AuthUser> {
    return new Promise(async (resolve, reject) => {
      try {
        this.token = token;
        localStorage.setItem('auth_token', token);

        // Decode JWT to get user info (JWT format: header.payload.signature)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.user = {
            id: payload.id,
            email: payload.email,
            name: payload.name
          };
          localStorage.setItem('auth_user', JSON.stringify(this.user));
          console.log('✅ OAuth user saved:', this.user);
          resolve(this.user!);
        } catch (decodeError) {
          console.error('Failed to decode JWT:', decodeError);
          // Fallback: try to fetch user details from API
          const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          this.user = response.data.user;
          localStorage.setItem('auth_user', JSON.stringify(this.user));
          resolve(this.user!);
        }
      } catch (error) {
        console.error('Failed to handle auth callback:', error);
        this.logout();
        reject(error);
      }
    });
  }

  /**
   * Logout user
   */
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.user;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): { Authorization: string } | {} {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }
}

export const authService = new AuthService();
