import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ActivitySquare, UserPlus, User, AtSign, Lock, AlertCircle, Server, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

type UserRole = 'user' | 'contributor';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

const RegisterPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const { register: registerUser, error, loading } = useAuth();
  const [directError, setDirectError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<RegisterFormData>();
  
  // Set initial role based on URL parameter if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    
    if (type === 'contributor') {
      setSelectedRole('contributor');
    }
  }, [location]);
  
  // Reset form when role changes
  useEffect(() => {
    reset();
  }, [selectedRole, reset]);
  
  const onSubmit = async (data: RegisterFormData) => {
    try {
      setDirectError(null);
      await registerUser(data.name, data.email, data.password, selectedRole);
      
      // Navigation will be handled by the auth context
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  // Direct API test function for debugging
  const testDirectApi = async () => {
    try {
      setDirectError(null);
      const testData = {
        name: "Test User",
        email: "test" + Date.now() + "@example.com",
        password: "TestPassword123"
      };
      
      console.log("Testing direct API call with:", testData);
      
      // Try the test endpoint first
      const testResponse = await api.post('/test/signup', testData);
      console.log("Test endpoint response:", testResponse.data);
      
      // Then try the real endpoint
      const endpoint = selectedRole === 'contributor' ? '/contributor/signup' : '/user/signup';
      const response = await api.post(endpoint, testData);
      console.log("Real signup response:", response.data);
      
      alert("Direct API test successful! Check console for details.");
    } catch (err: any) {
      console.error("Direct API test failed:", err);
      setDirectError(err.response?.data?.error || err.message || "Direct API test failed");
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12">
      <div className="absolute top-0 right-0 w-full h-64 bg-primary-900/5 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-64 bg-secondary-900/5 -z-10"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center justify-center">
            <ActivitySquare size={40} className="text-primary-500" />
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-white">Create your account</h2>
          <p className="mt-2 text-sm text-dark-400">
            Join the upWeb community today
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Register as:</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={`flex flex-col items-center justify-center p-4 rounded-md border ${
                  selectedRole === 'user'
                    ? 'bg-primary-900/30 border-primary-500 text-primary-400'
                    : 'border-dark-700 hover:bg-dark-800/50'
                }`}
              >
                <User size={24} className={selectedRole === 'user' ? 'text-primary-400' : 'text-dark-400'} />
                <span className="text-sm font-medium mt-2">User</span>
                <span className="text-xs text-dark-400 mt-1">Monitor your websites</span>
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedRole('contributor')}
                className={`flex flex-col items-center justify-center p-4 rounded-md border ${
                  selectedRole === 'contributor'
                    ? 'bg-secondary-900/30 border-secondary-500 text-secondary-400'
                    : 'border-dark-700 hover:bg-dark-800/50'
                }`}
              >
                <Server size={24} className={selectedRole === 'contributor' ? 'text-secondary-400' : 'text-dark-400'} />
                <span className="text-sm font-medium mt-2">Contributor</span>
                <span className="text-xs text-dark-400 mt-1">Earn by monitoring</span>
              </button>
            </div>
          </div>
          
          {selectedRole === 'contributor' && (
            <div className="mb-6 bg-dark-800/50 border border-dark-700 rounded-md p-3 flex">
              <Info size={18} className="text-secondary-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-dark-300">
                As a contributor, you'll need to verify your email and provide details about your server location to start earning.
              </p>
            </div>
          )}
          
          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start">
                <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  {error.includes(' | ') ? (
                    <ul className="list-disc pl-4 space-y-1">
                      {error.split(' | ').map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    error
                  )}
                </div>
              </div>
            )}
            
            {directError && (
              <div className="bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start">
                <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{directError}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-dark-300 mb-1">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={`input ${errors.name ? 'border-error-600 focus:ring-error-500' : ''}`}
                placeholder="Your name"
                {...register('name', { 
                  required: 'Name is required',
                  minLength: { 
                    value: 2, 
                    message: 'Name must be at least 2 characters' 
                  }
                })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error-500">{errors.name.message}</p>
              )}
            </div>
            
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
                  autoComplete="new-password"
                  className={`input pl-10 ${errors.password ? 'border-error-600 focus:ring-error-500' : ''}`}
                  placeholder="••••••••"
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: { 
                      value: 8, 
                      message: 'Password must be at least 8 characters' 
                    },
                    pattern: {
                      value: /^(?=.*[A-Z])(?=.*[0-9])/,
                      message: 'Password must contain at least one uppercase letter and one number'
                    }
                  })}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-500">{errors.password.message}</p>
              )}
              <p className="mt-1 text-xs text-dark-400">
                Password must be at least 8 characters with one uppercase letter and one number.
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-300 mb-1">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.confirmPassword ? 'border-error-600 focus:ring-error-500' : ''}`}
                placeholder="••••••••"
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: value => value === watch('password') || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error-500">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                className={`h-4 w-4 rounded text-primary-600 bg-dark-800 border-dark-700 focus:ring-primary-500 ${
                  errors.terms ? 'border-error-600' : ''
                }`}
                {...register('terms', { 
                  required: 'You must agree to the terms and conditions'
                })}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-dark-300">
                I agree to the{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.terms && (
              <p className="text-sm text-error-500">{errors.terms.message}</p>
            )}
            
            {/* Debug buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                className="btn btn-primary flex-1 flex justify-center items-center py-2.5"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <UserPlus size={18} className="mr-2" />
                )}
                Create Account
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={testDirectApi}
              >
                Test API
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-dark-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;