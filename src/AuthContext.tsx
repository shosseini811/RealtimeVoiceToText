// 🔐 AUTHENTICATION CONTEXT FOR REACT
//
// This file creates a React Context that manages user authentication throughout the app.
// Context is like a "global state" that any component can access without prop drilling.
//
// WHAT THIS PROVIDES:
// - Login and signup functions
// - Current user information
// - Authentication status
// - JWT token management
// - Automatic token storage in localStorage
// - Token validation and refresh

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, User, LoginRequest, SignupRequest, AuthResponse } from './types';

/**
 * 🎯 AUTHENTICATION CONTEXT INTERFACE
 * 
 * This defines what functions and data the AuthContext provides.
 * Any component that uses useAuth() will get access to these.
 */
interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;     // Function to log in user
  signup: (userData: SignupRequest) => Promise<void>;      // Function to create new account
  logout: () => void;                                      // Function to log out user
}

/**
 * 🏗️ CREATE AUTHENTICATION CONTEXT
 * 
 * createContext creates a new React Context.
 * We initialize it as undefined and will provide the real value in AuthProvider.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 🔧 AUTHENTICATION PROVIDER COMPONENT
 * 
 * This component wraps our entire app and provides authentication functionality.
 * It manages the authentication state and provides functions to login/signup/logout.
 * 
 * PROPS:
 * - children: The components that will have access to authentication (usually the entire app)
 */
interface AuthProviderProps {
  children: ReactNode;    // ReactNode means any React component or elements
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🔐 AuthProvider initializing...');

  // 🏠 AUTHENTICATION STATE
  // These useState hooks manage all our authentication data
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);  // Start as loading while we check for existing token
  const [error, setError] = useState<string | null>(null);

  console.log('🔐 Current auth state:', {
    isAuthenticated,
    hasUser: !!user,
    hasToken: !!token,
    isLoading,
    hasError: !!error
  });

  /**
   * 🔍 CHECK FOR EXISTING TOKEN ON APP START
   * 
   * When the app loads, we check if there's a saved token in localStorage.
   * If there is, we validate it and automatically log the user in.
   * 
   * useEffect with empty dependency array [] runs once when component mounts.
   */
  useEffect(() => {
    console.log('🔍 Checking for existing authentication token...');
    
    const checkExistingAuth = async () => {
      try {
        // Look for saved token in browser's localStorage
        const savedToken = localStorage.getItem('auth_token');
        console.log('💾 Saved token found:', !!savedToken);
        
        if (savedToken) {
          console.log('✅ Token exists, validating with server...');
          
          // Validate token with backend
          const response = await fetch('http://localhost:8000/api/auth/validate', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${savedToken}`,  // Send token in Authorization header
              'Content-Type': 'application/json',
            },
          });

          console.log('📨 Token validation response:', {
            status: response.status,
            ok: response.ok
          });

          if (response.ok) {
            // Token is valid, get user data
            const userData: User = await response.json();
            console.log('✅ Token valid, user data received:', userData);
            
            // Update state to logged in
            setToken(savedToken);
            setUser(userData);
            setIsAuthenticated(true);
            setError(null);
            console.log('🎉 User automatically logged in!');
          } else {
            console.log('❌ Token invalid, removing from storage');
            // Token is invalid, remove it
            localStorage.removeItem('auth_token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('ℹ️ No saved token found');
        }
      } catch (error) {
        console.error('❌ Error checking existing auth:', error);
        // If there's an error, clear any stored token
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Always stop loading, whether success or failure
        setIsLoading(false);
        console.log('✅ Auth check complete, app ready to use');
      }
    };

    checkExistingAuth();
  }, []); // Empty dependency array = run once on mount

  /**
   * 📝 LOGIN FUNCTION
   * 
   * Sends user credentials to backend and handles the response.
   * If successful, saves the token and updates authentication state.
   * 
   * @param credentials - Email and password from login form
   */
  const login = async (credentials: LoginRequest): Promise<void> => {
    console.log('🔑 Login attempt for:', credentials.email);
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Setting loading state and clearing errors');

      console.log('📤 Sending login request to backend...');
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),  // Convert credentials object to JSON string
      });

      console.log('📨 Login response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        // Login failed, get error message from response
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Login failed';
        console.log('❌ Login failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Login successful, parse response data
      const authData: AuthResponse = await response.json();
      console.log('✅ Login successful! Auth data received:', {
        hasToken: !!authData.access_token,
        tokenType: authData.token_type,
        userEmail: authData.user.email
      });

      // Save token to localStorage for persistence across browser sessions
      localStorage.setItem('auth_token', authData.access_token);
      console.log('💾 Token saved to localStorage');

      // Update authentication state
      setToken(authData.access_token);
      setUser(authData.user);
      setIsAuthenticated(true);
      setError(null);
      console.log('🎉 User successfully logged in!');

    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      
      // Clear any partial auth state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
      console.log('✅ Login process complete');
    }
  };

  /**
   * 📝 SIGNUP FUNCTION
   * 
   * Creates a new user account and automatically logs them in.
   * Validates that passwords match before sending to backend.
   * 
   * @param userData - Email, password, and password confirmation from signup form
   */
  const signup = async (userData: SignupRequest): Promise<void> => {
    console.log('📝 Signup attempt for:', userData.email);
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Setting loading state and clearing errors');

      // Frontend validation: check if passwords match
      if (userData.password !== userData.confirmPassword) {
        console.log('❌ Password confirmation mismatch');
        throw new Error('Passwords do not match');
      }

      console.log('📤 Sending signup request to backend...');
      const response = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          // Don't send confirmPassword to backend, it's only for frontend validation
        }),
      });

      console.log('📨 Signup response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        // Signup failed, get error message from response
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Signup failed';
        console.log('❌ Signup failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Signup successful, parse response data
      const authData: AuthResponse = await response.json();
      console.log('✅ Signup successful! Auth data received:', {
        hasToken: !!authData.access_token,
        tokenType: authData.token_type,
        userEmail: authData.user.email
      });

      // Save token to localStorage for persistence
      localStorage.setItem('auth_token', authData.access_token);
      console.log('💾 Token saved to localStorage');

      // Update authentication state (automatically log in after signup)
      setToken(authData.access_token);
      setUser(authData.user);
      setIsAuthenticated(true);
      setError(null);
      console.log('🎉 User successfully signed up and logged in!');

    } catch (error) {
      console.error('❌ Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      setError(errorMessage);
      
      // Clear any partial auth state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
      console.log('✅ Signup process complete');
    }
  };

  /**
   * 🚪 LOGOUT FUNCTION
   * 
   * Clears all authentication data and removes token from storage.
   * This immediately logs the user out without needing to contact the backend.
   */
  const logout = (): void => {
    console.log('🚪 Logging out user...');
    
    // Clear all authentication state
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    
    // Remove token from localStorage
    localStorage.removeItem('auth_token');
    console.log('💾 Token removed from localStorage');
    
    console.log('✅ User successfully logged out');
  };

  /**
   * 🎁 CONTEXT VALUE
   * 
   * This object contains all the data and functions that components can access
   * through the useAuth() hook.
   */
  const contextValue: AuthContextType = {
    // State values
    isAuthenticated,
    user,
    token,
    isLoading,
    error,
    
    // Action functions
    login,
    signup,
    logout,
  };

  console.log('🎁 Providing auth context value:', {
    isAuthenticated: contextValue.isAuthenticated,
    hasUser: !!contextValue.user,
    hasToken: !!contextValue.token,
    isLoading: contextValue.isLoading,
    hasError: !!contextValue.error
  });

  /**
   * 🏗️ RENDER PROVIDER
   * 
   * AuthContext.Provider makes the contextValue available to all child components.
   * Any component wrapped by this provider can use useAuth() to access authentication.
   */
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 🪝 USE AUTH HOOK
 * 
 * This is a custom hook that components use to access authentication functionality.
 * It's much cleaner than using useContext directly.
 * 
 * USAGE IN COMPONENTS:
 * const { isAuthenticated, user, login, logout } = useAuth();
 * 
 * @returns AuthContextType - All authentication state and functions
 */
export const useAuth = (): AuthContextType => {
  console.log('🪝 useAuth hook called');
  
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    console.error('❌ useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  console.log('✅ useAuth returning context:', {
    isAuthenticated: context.isAuthenticated,
    hasUser: !!context.user,
    isLoading: context.isLoading
  });
  
  return context;
}; 