import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ActivitySquare, LogIn, User, AtSign, Lock, AlertCircle, Server, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type UserRole = 'user' | 'contributor' | 'admin';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const { login, error, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname || '/';
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormData>();
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, selectedRole);
      
      // Navigation will be handled by the auth context
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    // Clear form fields when switching roles
    reset({ email: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-full h-64 bg-primary-900/5 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-64 bg-secondary-900/5 -z-10"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center justify-center">
            <ActivitySquare size={40} className="text-primary-500" />
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-white">Sign in to upWeb</h2>
          <p className="mt-2 text-sm text-dark-400">
            Monitor your web presence with community power
          </p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glassmorphism sm:rounded-lg px-6 py-8 sm:mx-auto sm:w-full sm:max-w-md"
        >
          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-dark-300 mb-2">Sign in as:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange('user')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border ${
                  selectedRole === 'user'
                    ? 'bg-primary-900/30 border-primary-500 text-primary-400'
                    : 'border-dark-700 hover:bg-dark-800/50'
                }`}
              >
                <User size={20} className={selectedRole === 'user' ? 'text-primary-400' : 'text-dark-400'} />
                <span className="text-xs mt-1">User</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleRoleChange('contributor')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border ${
                  selectedRole === 'contributor'
                    ? 'bg-secondary-900/30 border-secondary-500 text-secondary-400'
                    : 'border-dark-700 hover:bg-dark-800/50'
                }`}
              >
                <Server size={20} className={selectedRole === 'contributor' ? 'text-secondary-400' : 'text-dark-400'} />
                <span className="text-xs mt-1">Contributor</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border ${
                  selectedRole === 'admin'
                    ? 'bg-error-900/30 border-error-500 text-error-400'
                    : 'border-dark-700 hover:bg-dark-800/50'
                }`}
              >
                <Shield size={20} className={selectedRole === 'admin' ? 'text-error-400' : 'text-dark-400'} />
                <span className="text-xs mt-1">Admin</span>
              </button>
            </div>
          </div>
          
          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start">
                <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign size={18} className="text-dark-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input pl-10 ${errors.email ? 'border-error-600 focus:ring-error-500' : ''}`}
                  placeholder="your@email.com"
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
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-dark-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className={`input pl-10 ${errors.password ? 'border-error-600 focus:ring-error-500' : ''}`}
                  placeholder="••••••••"
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: { 
                      value: 6, 
                      message: 'Password must be at least 6 characters' 
                    }
                  })}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-500">{errors.password.message}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded text-primary-600 bg-dark-800 border-dark-700 focus:ring-primary-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-dark-300">
                  Remember me
                </label>
              </div>
              
              <a href="#" className="text-sm text-primary-400 hover:text-primary-300">
                Forgot password?
              </a>
            </div>
            
            <div>
              <button
                type="submit"
                className="btn btn-primary w-full flex justify-center items-center"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <LogIn size={18} className="mr-2" />
                )}
                Sign in
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-dark-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;