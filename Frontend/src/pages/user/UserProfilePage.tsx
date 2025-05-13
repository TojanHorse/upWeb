import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { User, Mail, Camera, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileFormData {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfilePage: React.FC = () => {
  const { user, updateProfile, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    }
  });
  
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      setSuccess(false);
      
      await updateProfile({
        name: data.name,
        email: data.email,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      setSuccess(true);
      reset({ 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      });
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        {user?.isVerified ? (
          <div className="flex items-center text-success-500 text-sm">
            <CheckCircle size={16} className="mr-1.5" />
            Verified Account
          </div>
        ) : (
          <div className="flex items-center text-warning-500 text-sm">
            <AlertCircle size={16} className="mr-1.5" />
            Email not verified
          </div>
        )}
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Profile Picture */}
        <div className="card bg-dark-800/40">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary-900 border-2 border-primary-700 flex items-center justify-center overflow-hidden">
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-primary-400" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 rounded-full bg-dark-900 border border-dark-700 text-dark-300 hover:text-white transition-colors">
                <Camera size={16} />
              </button>
            </div>
            
            <div className="ml-6">
              <h3 className="text-lg font-medium mb-1">{user?.name}</h3>
              <p className="text-dark-400 text-sm mb-3">{user?.email}</p>
              <button className="btn btn-outline py-1.5 px-4 text-sm">
                Change Picture
              </button>
            </div>
          </div>
        </div>
        
        {/* Profile Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card bg-dark-800/40">
          {authError && (
            <div className="mb-6 bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{authError}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 bg-success-900/30 border border-success-700 text-success-400 px-4 py-3 rounded-md flex items-start">
              <CheckCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Profile updated successfully</span>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-dark-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-dark-500" />
                </div>
                <input
                  id="name"
                  type="text"
                  className={`input pl-10 ${errors.name ? 'border-error-600 focus:ring-error-500' : ''}`}
                  {...register('name', { 
                    required: 'Name is required',
                    minLength: { 
                      value: 2, 
                      message: 'Name must be at least 2 characters' 
                    }
                  })}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-error-500">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-dark-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  className={`input pl-10 ${errors.email ? 'border-error-600 focus:ring-error-500' : ''}`}
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="pt-6 border-t border-dark-700">
              <h3 className="text-lg font-medium mb-4">Change Password</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-dark-300 mb-1">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className={`input ${errors.currentPassword ? 'border-error-600 focus:ring-error-500' : ''}`}
                    {...register('currentPassword', {
                      required: 'Current password is required to make changes'
                    })}
                  />
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-error-500">{errors.currentPassword.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-dark-300 mb-1">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className={`input ${errors.newPassword ? 'border-error-600 focus:ring-error-500' : ''}`}
                    {...register('newPassword', {
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters'
                      }
                    })}
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-error-500">{errors.newPassword.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className={`input ${errors.confirmPassword ? 'border-error-600 focus:ring-error-500' : ''}`}
                    {...register('confirmPassword', {
                      validate: value => 
                        !watch('newPassword') || value === watch('newPassword') || 
                        'Passwords do not match'
                    })}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-error-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-6 border-t border-dark-700">
              <button
                type="submit"
                className="btn btn-primary px-6"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Shield size={18} className="mr-2" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </form>
        
        {/* Account Security */}
        <div className="card bg-dark-800/40">
          <h3 className="text-lg font-medium mb-4">Account Security</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-dark-700">
              <div>
                <h4 className="font-medium mb-1">Two-Factor Authentication</h4>
                <p className="text-sm text-dark-400">Add an extra layer of security to your account</p>
              </div>
              <button className="btn btn-outline py-1.5 px-4 text-sm">Enable</button>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-dark-700">
              <div>
                <h4 className="font-medium mb-1">Active Sessions</h4>
                <p className="text-sm text-dark-400">Manage your active login sessions</p>
              </div>
              <button className="btn btn-outline py-1.5 px-4 text-sm">View All</button>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="font-medium mb-1">Delete Account</h4>
                <p className="text-sm text-dark-400">Permanently delete your account and all data</p>
              </div>
              <button className="btn py-1.5 px-4 text-sm bg-error-600 hover:bg-error-700 text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfilePage;