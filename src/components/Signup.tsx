// 📝 SIGNUP COMPONENT
//
// This component provides a user registration form where new users can create
// an account to access the Voice to Text application.
//
// FEATURES:
// - Email, password, and confirm password input fields
// - Comprehensive form validation (email format, password strength, password matching)
// - Loading state during registration
// - Error message display
// - Link to login page for existing users
// - Password strength indicator
// - Clean, modern UI design

import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { SignupRequest } from '../types';

/**
 * 📝 SIGNUP COMPONENT
 * 
 * This is a React functional component that renders the user registration form.
 * It includes advanced validation and user feedback features.
 */
const Signup: React.FC = () => {
  console.log('📝 Signup component rendering');

  // Get authentication functions from our context
  const { signup, isLoading, error } = useAuth();

  // 📝 FORM STATE MANAGEMENT
  // These useState hooks track what the user types in the form
  const [email, setEmail] = useState<string>('');                    // User's email input
  const [password, setPassword] = useState<string>('');              // User's password input
  const [confirmPassword, setConfirmPassword] = useState<string>(''); // Password confirmation
  const [showPassword, setShowPassword] = useState<boolean>(false);   // Whether to show password text
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false); // Whether to show confirm password
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({}); // Form validation errors

  console.log('📝 Signup form state:', {
    emailLength: email.length,
    passwordLength: password.length,
    confirmPasswordLength: confirmPassword.length,
    showPassword,
    showConfirmPassword,
    hasFormErrors: Object.keys(formErrors).length > 0,
    isLoading,
    hasAuthError: !!error
  });

  /**
   * 💪 PASSWORD STRENGTH CHECKER
   * 
   * Evaluates password strength and provides feedback to users.
   * Helps users create secure passwords.
   * 
   * @param password - The password to evaluate
   * @returns object with strength score and feedback
   */
  const checkPasswordStrength = (password: string) => {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    // Uppercase letter check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    // Lowercase letter check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character');
    }

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
    
    return { score, strength, feedback };
  };

  const passwordStrength = password ? checkPasswordStrength(password) : null;

  /**
   * ✅ FORM VALIDATION FUNCTION
   * 
   * Validates all form inputs before submitting to the backend.
   * Provides comprehensive validation with helpful error messages.
   * 
   * @returns boolean - true if form is valid, false if there are errors
   */
  const validateForm = (): boolean => {
    console.log('✅ Validating signup form...');
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
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
      console.log('❌ Password validation failed: too short');
    } else if (passwordStrength && passwordStrength.strength === 'weak') {
      errors.password = 'Password is too weak. Please include uppercase, lowercase, numbers, and special characters.';
      console.log('❌ Password validation failed: too weak');
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password';
      console.log('❌ Confirm password validation failed: empty');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      console.log('❌ Confirm password validation failed: mismatch');
    }

    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log('✅ Form validation result:', { isValid, errorCount: Object.keys(errors).length });
    
    return isValid;
  };

  /**
   * 📤 FORM SUBMIT HANDLER
   * 
   * This function runs when the user clicks the "Create Account" button.
   * It validates the form, then calls the signup function from our auth context.
   * 
   * @param e - Form submit event (we prevent default browser form submission)
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    console.log('📤 Signup form submitted');
    
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

    console.log('✅ Form validation passed, attempting signup...');

    try {
      // Create signup request object
      const userData: SignupRequest = {
        email: email.trim(),           // Remove any extra whitespace
        password: password,            // Keep password as-is
        confirmPassword: confirmPassword // Keep confirm password as-is
      };

      console.log('🔄 Calling signup function with data for:', userData.email);
      
      // Call the signup function from our auth context
      // This will handle the API call and update authentication state
      await signup(userData);
      
      console.log('✅ Signup function completed successfully');
      // Note: If signup is successful, the user will be automatically logged in
      // and redirected by the router because isAuthenticated will become true
      
    } catch (error) {
      console.error('❌ Signup form error:', error);
      // The error will be handled by the auth context and displayed via the error state
    }
  };

  /**
   * 🎨 RENDER SIGNUP FORM
   * 
   * This JSX defines what the user sees - a comprehensive registration form.
   * It includes proper accessibility features and responsive design.
   */
  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* 🏠 HEADER SECTION */}
        <div className="auth-header">
          <h1>🎤 Voice to Text</h1>
          <h2>Create Account</h2>
          <p>Sign up to start using voice transcription</p>
        </div>

        {/* 📝 SIGNUP FORM */}
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  // Clear error when user starts typing
                  if (formErrors.password) {
                    setFormErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                disabled={isLoading}
                autoComplete="new-password"
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
            
            {/* PASSWORD STRENGTH INDICATOR */}
            {password && passwordStrength && (
              <div className="password-strength">
                <div className={`strength-bar strength-${passwordStrength.strength}`}>
                  <div className="strength-fill"></div>
                </div>
                <div className="strength-text">
                  Password strength: <span className={`strength-${passwordStrength.strength}`}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="strength-feedback">
                    Missing: {passwordStrength.feedback.join(', ')}
                  </div>
                )}
              </div>
            )}
            
            {/* Show password validation error */}
            {formErrors.password && (
              <span className="error-message">{formErrors.password}</span>
            )}
          </div>

          {/* 🔒 CONFIRM PASSWORD INPUT FIELD */}
          <div className="input-group">
            <label htmlFor="confirmPassword" className="input-label">
              Confirm Password
            </label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                className={`auth-input ${formErrors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  // Clear error when user starts typing
                  if (formErrors.confirmPassword) {
                    setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              {/* Password visibility toggle button */}
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {/* Show confirm password validation error */}
            {formErrors.confirmPassword && (
              <span className="error-message">{formErrors.confirmPassword}</span>
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
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* 🔗 LOGIN LINK */}
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 