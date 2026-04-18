import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/AxiosConfig';
import { normalizeUser } from '../utils/normalizers';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getErrorMessage = (error, fallbackMessage) => {
    const validationErrors = error.response?.data?.errors;
    const firstValidationError = validationErrors
      ? Object.values(validationErrors).flat()[0]
      : null;

    return firstValidationError || error.response?.data?.message || fallbackMessage;
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };

  const persistAuth = (token, rawUser) => {
    const normalizedUser = normalizeUser(rawUser);

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(normalizedUser);

    return normalizedUser;
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/user');
      const normalizedUser = normalizeUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return {
        success: true,
        user: normalizedUser,
      };
    } catch (error) {
      clearAuth();
      return {
        success: false,
        message: getErrorMessage(error, 'Unable to load your account right now.'),
      };
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    const bootstrapAuth = async () => {
      if (token && userData) {
        try {
          const normalizedUser = normalizeUser(JSON.parse(userData));
          setUser(normalizedUser);
          localStorage.setItem('user', JSON.stringify(normalizedUser));
          api.defaults.headers.common.Authorization = `Bearer ${token}`;

          try {
            const response = await api.get('/user');
            const liveUser = normalizeUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(liveUser));
            setUser(liveUser);
          } catch (error) {
            clearAuth();
          }
        } catch (error) {
          clearAuth();
        }
      }

      setLoading(false);
    };

    bootstrapAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      const { token, user } = response.data;
      const normalizedUser = persistAuth(token, user);

      return {
        success: true,
        user: normalizedUser,
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Login failed'),
      };
    }
  };

  const register = async (payload) => {
    const requestBody = {
      username: payload.username?.trim() || payload.name?.trim() || '',
      email: payload.email?.trim() || '',
      password: payload.password || '',
      password_confirmation:
        payload.passwordConfirmation || payload.password_confirmation || '',
      date_of_birth: payload.dateOfBirth || payload.date_of_birth || undefined,
      gender: payload.gender || undefined,
      phone: payload.phone?.trim() || undefined,
      address: payload.address?.trim() || undefined,
    };

    try {
      const response = await api.post('/register', requestBody);
      const { token, user } = response.data;
      const normalizedUser = persistAuth(token, user);

      return {
        success: true,
        user: normalizedUser,
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Registration failed'),
      };
    }
  };

  const updateProfile = async (payload) => {
    const requestBody = {
      username: payload.username?.trim() || '',
      phone: payload.phone?.trim() || '',
      address: payload.address?.trim() || '',
    };

    if (payload.gender) {
      requestBody.gender = payload.gender;
    }

    if (payload.date_of_birth) {
      requestBody.date_of_birth = payload.date_of_birth;
    }

    try {
      const response = await api.put('/user', requestBody);
      const normalizedUser = normalizeUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      return {
        success: true,
        user: normalizedUser,
        message: response.data.message || 'Profile updated successfully.',
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Profile update failed'),
      };
    }
  };

  const changePassword = async (payload) => {
    try {
      const response = await api.put('/password', payload);
      return {
        success: true,
        message: response.data.message || 'Password changed successfully.',
      };
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, 'Password change failed'),
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      // The local session should still be cleared if the token is already invalid.
    } finally {
      clearAuth();
    }
  };

  const value = {
    user,
    login,
    register,
    refreshUser,
    updateProfile,
    changePassword,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: Boolean(user?.isAdmin),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
