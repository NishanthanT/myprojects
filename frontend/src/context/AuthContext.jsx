import React, { createContext, useContext, useState, useEffect } from 'react';
import {hasPermission} from '../utils/permissions.mjs';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const refreshUser=async()=>{
    const currentToken=localStorage.getItem('token');
    if(!currentToken)return;
    try{
      const response=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${currentToken}`}});
      if(response.status===401||response.status===403){logout();return;}
      const data=await response.json();
      if(data.success&&localStorage.getItem('token')===currentToken)setUser(data.user);
    }catch(error){console.error('Permission refresh failed:',error);}
  };
  useEffect(()=>{
    if(!token)return;
    const timer=setInterval(refreshUser,15000);
    const focus=()=>refreshUser();
    window.addEventListener('focus',focus);
    return ()=>{clearInterval(timer);window.removeEventListener('focus',focus);};
  },[token]);

  // Set auth header in requests
  const getAuthHeaders = () => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
          setUser(data.user);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (error) {
        console.error('Session verification failed:', error);
        logout(); // Force logout on API failures
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed.' };
      }
    } catch (error) {
      console.error('Login request failed:', error);
      return { success: false, message: 'Could not connect to authentication server.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeaders, refreshUser, canAccess:key=>hasPermission(user,key) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
