import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type UserRole = 'user' | 'contributor' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  profileImage?: string;
  walletBalance?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  requestVerification: () => Promise<void>;
  verifyEmail: (code: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Add token to axios default headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Try to get user profile, if that fails try contributor, then admin
        try {
          const userResponse = await api.get('/user/profile');
          if (userResponse.data && userResponse.data.user) {
            setUser({
              id: userResponse.data.user.id,
              name: userResponse.data.user.name,
              email: userResponse.data.user.email,
              role: 'user',
              isVerified: userResponse.data.user.isEmailVerified,
              profileImage: userResponse.data.user.profilePicture,
              walletBalance: userResponse.data.wallet?.balance
            });
            return;
          }
        } catch (err) {
          // Not a user, try contributor
          try {
            const contributorResponse = await api.get('/contributor/profile');
            if (contributorResponse.data && contributorResponse.data.contributor) {
              setUser({
                id: contributorResponse.data.contributor.id,
                name: contributorResponse.data.contributor.name,
                email: contributorResponse.data.contributor.email,
                role: 'contributor',
                isVerified: contributorResponse.data.contributor.isEmailVerified,
                profileImage: contributorResponse.data.contributor.profilePicture,
                walletBalance: contributorResponse.data.wallet?.balance
              });
              return;
            }
          } catch (err) {
            // Not a contributor, try admin
            try {
              const adminResponse = await api.get('/admin/profile');
              if (adminResponse.data && adminResponse.data.admin) {
                setUser({
                  id: adminResponse.data.admin.id,
                  name: adminResponse.data.admin.name,
                  email: adminResponse.data.admin.email,
                  role: 'admin',
                  isVerified: adminResponse.data.admin.isEmailVerified,
                  profileImage: adminResponse.data.admin.profilePicture
                });
                return;
              }
            } catch (err) {
              // Not any valid user type
              console.error('Authentication check failed, not a valid user type');
              localStorage.removeItem('token');
              api.defaults.headers.common['Authorization'] = '';
            }
          }
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        localStorage.removeItem('token');
        api.defaults.headers.common['Authorization'] = '';
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine endpoint based on role
      const endpoint = role === 'admin' 
        ? '/admin/signin'
        : role === 'contributor' 
          ? '/contributor/signin' 
          : '/user/signin';
      
      const response = await api.post(endpoint, { email, password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Use user data directly from the login response
        if (role === 'admin' && response.data.admin) {
          setUser({
            id: response.data.admin.id,
            name: response.data.admin.name,
            email: response.data.admin.email,
            role: 'admin',
            isVerified: response.data.admin.isEmailVerified || true,
            profileImage: response.data.admin.profilePicture
          });
        } else if (role === 'contributor' && response.data.contributor) {
          setUser({
            id: response.data.contributor.id,
            name: response.data.contributor.name,
            email: response.data.contributor.email,
            role: 'contributor',
            isVerified: response.data.contributor.isEmailVerified || false,
            profileImage: response.data.contributor.profilePicture,
            walletBalance: response.data.wallet?.balance
          });
        } else if (response.data.user) {
          // User role
          setUser({
            id: response.data.user.id,
            name: response.data.user.name,
            email: response.data.user.email,
            role: 'user',
            isVerified: response.data.user.isEmailVerified || false,
            profileImage: response.data.user.profilePicture,
            walletBalance: response.data.wallet?.balance
          });
        } else {
          // Fallback to fetching profile if user data is not in the response
          try {
            const userResponse = await api.get(
              role === 'admin' 
                ? '/admin/profile'
                : role === 'contributor' 
                  ? '/contributor/profile' 
                  : '/user/profile'
            );
            
            // Process the userResponse as before
            if (role === 'admin' && userResponse.data.admin) {
              setUser({
                id: userResponse.data.admin.id,
                name: userResponse.data.admin.name,
                email: userResponse.data.admin.email,
                role: 'admin',
                isVerified: userResponse.data.admin.isEmailVerified || true,
                profileImage: userResponse.data.admin.profilePicture
              });
            } else if (role === 'contributor' && userResponse.data.contributor) {
              setUser({
                id: userResponse.data.contributor.id,
                name: userResponse.data.contributor.name,
                email: userResponse.data.contributor.email,
                role: 'contributor',
                isVerified: userResponse.data.contributor.isEmailVerified || false,
                profileImage: userResponse.data.contributor.profilePicture,
                walletBalance: userResponse.data.wallet?.balance
              });
            } else if (userResponse.data.user) {
              setUser({
                id: userResponse.data.user.id,
                name: userResponse.data.user.name,
                email: userResponse.data.user.email,
                role: 'user',
                isVerified: userResponse.data.user.isEmailVerified || false,
                profileImage: userResponse.data.user.profilePicture,
                walletBalance: userResponse.data.wallet?.balance
              });
            }
          } catch (err) {
            console.error('Failed to get user profile after login:', err);
            setError('Failed to get user profile');
            localStorage.removeItem('token');
            api.defaults.headers.common['Authorization'] = '';
            return;
          }
        }
        
        // Check verification status
        const isVerified = 
          role === 'admin' ? true : 
          role === 'contributor' ? 
            (response.data.contributor?.isEmailVerified || false) : 
            (response.data.user?.isEmailVerified || false);
        
        // If not verified, redirect to verification page instead
        if (!isVerified && role !== 'admin') {
          navigate('/verify-email');
          return;
        }
        
        // Redirect based on role
        navigate(
          role === 'admin' 
            ? '/admin'
            : role === 'contributor' 
              ? '/contributor' 
              : '/user'
        );
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      setLoading(true);
      setError(null);
      
      if (role === 'admin') {
        setError('Admin accounts cannot be created through registration.');
        return;
      }
      
      // Determine endpoint based on role
      const endpoint = role === 'contributor' 
        ? '/contributor/signup' 
        : '/user/signup';
      
      console.log(`Attempting registration with endpoint: ${endpoint}`);
      console.log(`Registration data: ${JSON.stringify({ name, email, password: '***' })}`);
      
      const response = await api.post(endpoint, { name, email, password });
      
      console.log('Registration response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Get user profile based on role
        try {
          if (role === 'contributor') {
            const contributorResponse = await api.get('/contributor/profile');
            if (contributorResponse.data && contributorResponse.data.contributor) {
              setUser({
                id: contributorResponse.data.contributor.id,
                name: contributorResponse.data.contributor.name,
                email: contributorResponse.data.contributor.email,
                role: 'contributor',
                isVerified: contributorResponse.data.contributor.isEmailVerified || false,
                profileImage: contributorResponse.data.contributor.profilePicture,
                walletBalance: contributorResponse.data.wallet?.balance
              });
            }
          } else {
            // User role
            const userResponse = await api.get('/user/profile');
            if (userResponse.data && userResponse.data.user) {
              setUser({
                id: userResponse.data.user.id,
                name: userResponse.data.user.name,
                email: userResponse.data.user.email,
                role: 'user',
                isVerified: userResponse.data.user.isEmailVerified || false,
                profileImage: userResponse.data.user.profilePicture,
                walletBalance: userResponse.data.wallet?.balance
              });
            }
          }
          
          // Always redirect to verification page after registration
          navigate('/verify-email');
        } catch (err) {
          console.error('Failed to get user profile after registration:', err);
          setError('Failed to get user profile');
        }
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      console.error('Error response:', err.response?.data);
      
      // Handle existing email error with a clear message
      if (err.response?.status === 409) {
        setError('This email is already registered. Please log in or use a different email address.');
        return;
      }
      
      // Format validation errors in a user-friendly way
      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        if (Array.isArray(validationErrors)) {
          // Process formatted errors from backend
          const passwordErrors = validationErrors
            .filter(e => e.field === 'password')
            .map(e => e.message);
          
          const emailErrors = validationErrors
            .filter(e => e.field === 'email')
            .map(e => e.message);
          
          const nameErrors = validationErrors
            .filter(e => e.field === 'name')
            .map(e => e.message);
          
          // Create a readable error message
          const errorMessages = [];
          
          if (passwordErrors.length > 0) {
            errorMessages.push(`Password: ${passwordErrors.join(', ')}`);
          }
          
          if (emailErrors.length > 0) {
            errorMessages.push(`Email: ${emailErrors.join(', ')}`);
          }
          
          if (nameErrors.length > 0) {
            errorMessages.push(`Name: ${nameErrors.join(', ')}`);
          }
          
          // If we have specific errors, join them with line breaks
          if (errorMessages.length > 0) {
            setError(errorMessages.join(' | '));
          } else {
            // Fallback if we can't parse the errors
            setError('Registration failed. Please check your information and try again.');
          }
        } else {
          setError(JSON.stringify(validationErrors));
        }
      } else {
        // Handle other types of errors
        setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    api.defaults.headers.common['Authorization'] = '';
    setUser(null);
    navigate('/login');
  };

  const requestVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine endpoint based on user role
      const endpoint = user?.role === 'contributor' 
        ? '/contributor/verify/request' 
        : '/user/verify/request';
      
      await api.post(endpoint);
      
    } catch (err: any) {
      console.error('Verification request failed:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine endpoint based on user role
      const endpoint = user?.role === 'contributor' 
        ? '/contributor/verify' 
        : '/user/verify';
      
      const response = await api.post(endpoint, { code });
      
      if (response.data.success) {
        // Update verification status
        setUser(prev => {
          if (!prev) return null;
          return { ...prev, isVerified: true };
        });
        
        return true; // Return success status
      }
      
      return false; // Return failure status
    } catch (err: any) {
      console.error('Email verification failed:', err);
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine endpoint based on role
      const endpoint = user?.role === 'admin' 
        ? '/admin/update'
        : user?.role === 'contributor' 
          ? '/contributor/update' 
          : '/user/update';
      
      const response = await api.put(endpoint, data);
      
      if (response.data) {
        setUser(prev => prev ? { ...prev, ...response.data } : null);
      }
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setError(err.response?.data?.message || 'Profile update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        requestVerification,
        verifyEmail,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};