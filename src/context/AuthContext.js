import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSession, setSession, clearSession, getToken, setToken, clearToken } from '../utils/storage';
import { authAPI } from '../utils/api';
import { disconnectSocket, getSocket } from '../utils/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const restoreSession = async () => {
      const session = getSession();
      const token = getToken();

      if (!session || !token) {
        clearSession();
        clearToken();
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.me();
        setSession(response.user);
        setUser(response.user);
        getSocket();
      } catch (err) {
        clearSession();
        clearToken();
        setUser(null);
      }

      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      setToken(response.token);
      setSession(response.user);
      setUser(response.user);
      getSocket();
      return response.user;
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      throw err;
    }
  };

  const signup = async (name, email, password) => {
    try {
      setError(null);
      const response = await authAPI.signup(name, email, password);
      setToken(response.token);
      setSession(response.user);
      setUser(response.user);
      getSocket();
      return response.user;
    } catch (err) {
      const errorMsg = err.message || 'Signup failed';
      setError(errorMsg);
      throw err;
    }
  };

  const logout = () => {
    disconnectSocket();
    clearToken();
    clearSession();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
