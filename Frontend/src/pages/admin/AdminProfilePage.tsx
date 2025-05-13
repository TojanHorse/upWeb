import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Key, Shield, Save, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { profileService } from '../../services/api';

interface ProfileFormData {
  name: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const AdminProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    }
  });
  
  const watchNewPassword = watch('newPassword');
  
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      // Different API calls based on active tab
      if (activeTab === 'profile') {
        const profileData = {
          name: data.name,
        };
        
        await profileService.updateAdminProfile(profileData);
        setSuccessMessage('Profile updated successfully');
      } else if (activeTab === 'security') {
        if (data.newPassword) {
          if (data.newPassword !== data.confirmPassword) {
            setError('New passwords do not match');
            return;
          }
          
          const securityData = {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          };
          
          await profileService.updateAdminProfile(securityData);
          setSuccessMessage('Password updated successfully');
        }
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Admin Profile</h1>
        <p className="text-dark-400">Manage your admin account settings</p>
      </motion.div>
      
      {/* Admin Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card bg-dark-900/30"
      >
        <div className="flex items-center">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-error-900/30 border border-error-800 flex items-center justify-center mr-4">
            <Shield size={28} className="text-error-400" />
            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-success-500 border border-dark-900"></div>
          </div>
          
          <div>
            <h2 className="text-xl font-bold">{user?.name || 'Admin User'}</h2>
            <div className="flex items-center mt-1">
              <div className="badge badge-error mr-2 flex items-center">
                <Shield size={12} className="mr-1" />
                Admin
              </div>
              <p className="text-dark-400 text-sm">{user?.email || 'admin@example.com'}</p>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Profile settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card bg-dark-900/30 p-0"
      >
        <div className="md:flex">
          {/* Sidebar navigation */}
          <div className="md:w-64 p-4 md:border-r border-dark-800">
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center px-3 py-2 rounded-md text-left ${
                  activeTab === 'profile' 
                    ? 'bg-primary-900/30 text-primary-400' 
                    : 'hover:bg-dark-800/50'
                }`}
              >
                <User size={18} className="mr-3" />
                Profile Information
              </button>
              
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center px-3 py-2 rounded-md text-left ${
                  activeTab === 'security' 
                    ? 'bg-primary-900/30 text-primary-400' 
                    : 'hover:bg-dark-800/50'
                }`}
              >
                <Key size={18} className="mr-3" />
                Security
              </button>
            </div>
          </div>
          
          {/* Form content */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Form tabs */}
              {activeTab === 'profile' && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <User size={16} className="text-dark-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        className={`input pl-10 ${errors.name ? 'border-error-600 focus:ring-error-500' : ''}`}
                        placeholder="Your full name"
                        {...register('name', { required: 'Name is required' })}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-sm text-error-400 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Mail size={16} className="text-dark-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        disabled
                        className="input pl-10 bg-dark-900/50 text-dark-400 cursor-not-allowed"
                        placeholder="Your email address"
                        {...register('email')}
                      />
                    </div>
                    <p className="mt-1 text-xs text-dark-500">
                      Email cannot be changed. Contact the system administrator for assistance.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Admin Permissions
                    </label>
                    <div className="p-4 rounded-md bg-dark-800/50">
                      <div className="flex items-center mb-2">
                        <Shield size={16} className="text-error-400 mr-2" />
                        <span className="font-medium">Full Admin Access</span>
                      </div>
                      <p className="text-dark-400 text-sm">
                        You have full administrative privileges to manage users, websites, and system settings.
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {activeTab === 'security' && (
                <>
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Key size={16} className="text-dark-400" />
                      </div>
                      <input
                        id="currentPassword"
                        type="password"
                        className={`input pl-10 ${errors.currentPassword ? 'border-error-600 focus:ring-error-500' : ''}`}
                        placeholder="Enter your current password"
                        {...register('currentPassword', { 
                          required: 'Current password is required to change password'
                        })}
                      />
                    </div>
                    {errors.currentPassword && (
                      <p className="mt-1 text-sm text-error-400 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.currentPassword.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Key size={16} className="text-dark-400" />
                      </div>
                      <input
                        id="newPassword"
                        type="password"
                        className={`input pl-10 ${errors.newPassword ? 'border-error-600 focus:ring-error-500' : ''}`}
                        placeholder="Enter new password"
                        {...register('newPassword', { 
                          minLength: {
                            value: 10,
                            message: 'Admin password must be at least 10 characters'
                          }
                        })}
                      />
                    </div>
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-error-400 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.newPassword.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-dark-500">
                      For security reasons, admin passwords must be at least 10 characters long and include numbers, symbols, and uppercase letters.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Key size={16} className="text-dark-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        type="password"
                        className={`input pl-10 ${errors.confirmPassword ? 'border-error-600 focus:ring-error-500' : ''}`}
                        placeholder="Confirm new password"
                        {...register('confirmPassword', { 
                          validate: value => 
                            !watchNewPassword || value === watchNewPassword || 'Passwords do not match'
                        })}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-error-400 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </>
              )}
              
              {/* Success message */}
              {successMessage && (
                <div className="p-4 bg-success-900/30 border border-success-800 rounded-md text-success-400 text-sm flex items-start">
                  <CheckCircle size={16} className="mr-2 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="p-4 bg-error-900/30 border border-error-800 rounded-md text-error-400 text-sm flex items-start">
                  <AlertCircle size={16} className="mr-2 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Submit button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || authLoading}
                  className="btn btn-primary min-w-[120px] flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminProfilePage; 
 