import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';  // Import useNavigate
import './dashboard/css/ResetPassword.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();  // Initialize useNavigate

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (error) {
      setError('Error: Unable to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBackToLogin = () => {
    navigate('/login');  // Navigate back to the login page
  };

  return (
    <div className="reset-password-container">
      <h2 className="reset-password-title">Reset Your Password</h2>
      <h2 className="reset-password-description">Enter your email below to reset your password</h2>
      <div className="reset-password-card">
        <div className="reset-password-form">
          <label htmlFor="email-address" className="reset-password-label">Email address</label>
          <input
            id="email-address"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="reset-password-input"
          />
        </div>
        {error && <p className="reset-password-error">{error}</p>}
        {message && <p className="reset-password-message">{message}</p>}
        <button
          onClick={handlePasswordReset}
          disabled={loading}
          className="reset-password-button"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <button
          onClick={handleGoBackToLogin}
          className="reset-password-back-button"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
