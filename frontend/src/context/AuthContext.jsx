import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/auth';
import { setClientAccessToken, getClientAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Clear session
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue cleanup regardless
    } finally {
      setUser(null);
      setClientAccessToken(null);
      localStorage.removeItem('refreshToken');
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Initial session restoration on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        setLoading(false);
        return;
      }

      try {
        const refreshRes = await authApi.refresh(storedRefreshToken);
        const newAccessToken = refreshRes.accessToken || refreshRes.data?.accessToken;
        const newRefreshToken = refreshRes.refreshToken || refreshRes.data?.refreshToken;
        const userData = refreshRes.user || refreshRes.data?.user;

        if (newAccessToken) {
          setClientAccessToken(newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          if (userData) {
            setUser(userData);
          } else {
            // Fetch current user details
            const meRes = await authApi.getMe();
            setUser(meRes.user || meRes);
          }
        } else {
          throw new Error('Refresh failed');
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        setClientAccessToken(null);
        localStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for 401 logout events dispatched from axios client
    const handleLogoutEvent = () => {
      setUser(null);
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, [navigate]);

  // Login handler
  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    const token = data.accessToken || data.token;
    const refreshToken = data.refreshToken;
    const userData = data.user || {
      id: data.id,
      username: data.username,
      role: data.role,
      studentId: data.studentId,
      name: data.name,
    };

    if (token) {
      setClientAccessToken(token);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    setUser(userData);
    return userData;
  };

  const isAuthenticated = Boolean(user && getClientAccessToken());
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const isStudent = user?.role === 'STUDENT' || user?.role === 'student';

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
