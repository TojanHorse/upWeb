import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ActivitySquare, CheckCircle, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';

const VerifyEmailLinkPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Extract token from URL query params
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        
        if (!token) {
          setError('Verification token is missing. Please check your email link.');
          setLoading(false);
          return;
        }
        
        // Call the verification endpoint
        const response = await api.get(`/contributor/verify-email?token=${token}`);
        
        if (response.data.success) {
          setSuccess(true);
          setRedirectUrl(response.data.redirectUrl || '/contributor');
          
          // Auto redirect after 3 seconds
          setTimeout(() => {
            navigate(response.data.redirectUrl || '/contributor');
          }, 3000);
        } else {
          setError(response.data.error || 'Verification failed. Please try again.');
        }
      } catch (err: any) {
        console.error('Email verification failed:', err);
        setError(err.response?.data?.error || 'Verification failed. Please contact support.');
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-full h-64 bg-primary-900/5 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-64 bg-secondary-900/5 -z-10"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center justify-center">
            <ActivitySquare size={40} className="text-primary-500" />
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-white">Email Verification</h2>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glassmorphism sm:rounded-lg px-6 py-8 sm:mx-auto sm:w-full sm:max-w-md"
        >
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-dark-300">Verifying your email...</p>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="rounded-full bg-success-900/30 w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-success-500" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Email Verified!</h3>
              <p className="text-dark-300 mb-6">
                Your email has been successfully verified. You'll be redirected to the dashboard in a few seconds.
              </p>
              <Link to={redirectUrl || '/contributor'} className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <div className="rounded-full bg-error-900/30 w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-error-500" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Verification Failed</h3>
              <p className="text-dark-300 mb-6">
                {error || 'There was a problem verifying your email. Please try again or contact support.'}
              </p>
              <div className="space-y-3">
                <Link to="/verify-email" className="btn btn-primary w-full">
                  Try Manual Verification
                </Link>
                <Link to="/login" className="btn btn-outline w-full">
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyEmailLinkPage; 