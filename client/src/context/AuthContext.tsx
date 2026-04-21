import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User };

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, isLoading: false };
    case 'LOGOUT':
      return { user: null, token: null, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('token'),
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    api
      .get('/auth/me')
      .then((res) => dispatch({ type: 'SET_USER', payload: res.data.data }))
      .catch(() => {
        localStorage.removeItem('token');
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    dispatch({ type: 'LOGIN', payload: { token, user } });
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
