import React, { useState } from 'react';
import { auth } from '../../firebase';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { User, Mail, Lock, Save, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import './css/Profile.css';

const Profile = ({ user, onSignOut }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Update profile info (name and email)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!displayName) {
      setError('Display name cannot be empty');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Update display name
      if (displayName !== user.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: displayName
        });
      }
      
      // Update email if changed
      if (email !== user.email) {
        await updateEmail(auth.currentUser, email);
      }
      
      setSuccess('Profile updated successfully!');
    } catch (error) {
      setError(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error) {
      setError(`Failed to change password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out with confirmation
  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    }
    setShowSignOutConfirm(false);
  };

  return (
    <div className="profile-container">
      {/* Alert messages */}
      {error && (
        <div className="alert error">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="alert success">
          <p>{success}</p>
        </div>
      )}
      
      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={30} />
          </div>
          <div>
            <h2 className="profile-name">{user.displayName || 'User'}</h2>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
        
        <div className="profile-body">
          <h3 className="section-title">Profile Information</h3>
          
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-group">
              <label className="form-label">
                Display Name
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <User className="icon" />
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Mail className="icon" />
                </div>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="button-container">
              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                <Save className="button-icon" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
          
          <div className="divider"></div>
          
          <h3 className="section-title">Security</h3>
            
          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="button primary"
            >
              <Lock className="button-icon" />
              Change Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="form-group">
                <label className="form-label">
                  Current Password
                </label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Lock className="icon" />
                  </div>
                  <input
                    type="password"
                    className="form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  New Password
                </label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Lock className="icon" />
                  </div>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Confirm New Password
                </label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Lock className="icon" />
                  </div>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="button-group">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={loading}
                >
                  <RefreshCw className="button-icon" />
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
          
          <div className="divider"></div>
          
          <div className="signout-section">
            <h3 className="section-title">Account Actions</h3>
            <button 
              className="button danger" 
              onClick={() => setShowSignOutConfirm(true)}
            >
              <LogOut className="button-icon" />
              Sign Out
            </button>
          </div>

          {/* Sign Out Confirmation Modal */}
          {showSignOutConfirm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h4 className="modal-title">Sign Out Confirmation</h4>
                <p className="modal-text">Are you sure you want to sign out of your account?</p>
                <div className="modal-actions">
                  <button 
                    className="button secondary" 
                    onClick={() => setShowSignOutConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="button danger" 
                    onClick={handleSignOut}
                  >
                    Yes, Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;