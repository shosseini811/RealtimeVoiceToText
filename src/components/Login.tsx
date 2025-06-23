// 🔑 LOGIN COMPONENT
//
// This component provides a user-friendly login form where users can enter
// their email and password to access the Voice to Text application.
//
// FEATURES:
// - Email and password input fields
// - Form validation (required fields, email format)
// - Loading state during login attempt
// - Error message display
// - Link to signup page for new users
// - Clean, modern UI design

import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { LoginRequest } from '../types';

/**
 * 🔑 LOGIN COMPONENT
 * 
 * This is a React functional component that renders the login form.
 * It uses React hooks to manage form state and handle user interactions.
 */
const Login: React.FC = () => {
  console.log('🔑 Login component rendering');

  // Get authentication functions from our context
  const { login, isLoading, error } = useAuth();

  // 📝 FORM STATE MANAGEMENT
  // These useState hooks track what the user types in the form
  const [email, setEmail] = useState<string>('');           // User's email input
  const [password, setPassword] = useState<string>('');     // User's password input
  const [showPassword, setShowPassword] = useState<boolean>(false); // Whether to show password text
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({}); // Form validation errors

  console.log('📝 Login form state:', {
    emailLength: email.length,
    passwordLength: password.length,
    showPassword,
    hasFormErrors: Object.keys(formErrors).length > 0,
    isLoading,
    hasAuthError: !!error
  });

  /**
   * ✅ FORM VALIDATION FUNCTION
   * 
   * Validates the form inputs before submitting to the backend.
   * This provides immediate feedback to users about input problems.
   * 
   * @returns boolean - true if form is valid, false if there are errors
   */
  const validateForm = (): boolean => {
    console.log('✅ Validating login form...');
    const errors: {[key: string]: string} = {};

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
      console.log('❌ Email validation failed: empty');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
      console.log('❌ Email validation failed: invalid format');
    }

    // Password validation
    if (!password.trim()) {
      errors.password = 'Password is required';
      console.log('❌ Password validation failed: empty');
    }

    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log('✅ Form validation result:', { isValid, errorCount: Object.keys(errors).length });
    
    return isValid;
  };

  /**
   * 📤 FORM SUBMIT HANDLER
   * 
   * This function runs when the user clicks the "Sign In" button or presses Enter.
   * It validates the form, then calls the login function from our auth context.
   * 
   * @param e - Form submit event (we prevent default browser form submission)
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    console.log('📤 Login form submitted');
    
    // Prevent the browser's default form submission (which would reload the page)
    e.preventDefault();

    // Clear any previous form errors
    setFormErrors({});
    console.log('🧹 Cleared previous form errors');

    // Validate form inputs
    if (!validateForm()) {
      console.log('❌ Form validation failed, not submitting');
      return;
    }

    console.log('✅ Form validation passed, attempting login...');

    try {
      // Create login request object
      const credentials: LoginRequest = {
        email: email.trim(),      // Remove any extra whitespace
        password: password        // Keep password as-is (don't trim, might have intentional spaces)
      };

      console.log('🔄 Calling login function with credentials for:', credentials.email);
      
      // Call the login function from our auth context
      // This will handle the API call and update authentication state
      await login(credentials);
      
      console.log('✅ Login function completed successfully');
      // Note: If login is successful, the user will be redirected by the router
      // because isAuthenticated will become true
      
    } catch (error) {
      console.error('❌ Login form error:', error);
      // The error will be handled by the auth context and displayed via the error state
    }
  };

  /**
   * 🎨 RENDER LOGIN FORM
   * 
   * This JSX defines what the user sees - a clean, modern login form.
   * It includes proper accessibility features and responsive design.
   */
  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* 🏠 HEADER SECTION */}
        <div className="auth-header">
          <h1>🎤 Voice to Text</h1>
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {/* 📝 LOGIN FORM */}
        <form onSubmit={handleSubmit} className="auth-form">
          
          {/* 📧 EMAIL INPUT FIELD */}
          <div className="input-group">
            <label htmlFor="email" className="input-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                id="email"
                className={`auth-input ${formErrors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear error when user starts typing
                  if (formErrors.email) {
                    setFormErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>
            {/* Show email validation error */}
            {formErrors.email && (
              <span className="error-message">{formErrors.email}</span>
            )}
          </div>

          {/* 🔒 PASSWORD INPUT FIELD */}
          <div className="input-group">
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className={`auth-input ${formErrors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  // Clear error when user starts typing
                  if (formErrors.password) {
                    setFormErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              {/* Password visibility toggle button */}
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {/* Show password validation error */}
            {formErrors.password && (
              <span className="error-message">{formErrors.password}</span>
            )}
          </div>

          {/* ⚠️ AUTHENTICATION ERROR DISPLAY */}
          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          {/* 🔘 SUBMIT BUTTON */}
          <button
            type="submit"
            className="auth-button primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* 🔗 SIGNUP LINK */}
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 