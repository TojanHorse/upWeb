import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ActivitySquare, CheckCircle, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const { user, loading, error, requestVerification, verifyEmail } = useAuth();
  const navigate = useNavigate();
  
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''));
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  
  // Redirect if already verified
  useEffect(() => {
    if (user?.isVerified) {
      navigate(user.role === 'contributor' ? '/contributor' : '/user');
    }
  }, [user, navigate]);
  
  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  const handleInputChange = (index: number, value: string) => {
    // Only allow one digit
    if (value.length > 1) {
      value = value.slice(0, 1);
    }
    
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) {
      return;
    }
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    // Move to next input if current one is filled
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Submit if all fields are filled
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Allow navigation with arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    
    // Check if pasted data contains 6 digits
    if (/^\d{6}$/.test(pasteData)) {
      const newCode = pasteData.split('');
      setVerificationCode(newCode);
      
      // Focus the last input
      inputRefs.current[5]?.focus();
      
      // Submit code
      handleVerify(pasteData);
    }
  };
  
  const requestNewCode = async () => {
    if (countdown > 0) return;
    
    setIsRequesting(true);
    setRequestError(null);
    
    try {
      await requestVerification();
      setVerificationSent(true);
      setCountdown(60); // 1 minute cooldown
    } catch (err: any) {
      setRequestError(err.message || 'Failed to send verification code');
    } finally {
      setIsRequesting(false);
    }
  };
  
  const handleVerify = async (code: string) => {
    try {
      const isSuccess = await verifyEmail(code);
      if (isSuccess) {
        setSuccess(true);
        
        // After successful verification, redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Verification failed:', err);
      // Error is already set in the AuthContext
    }
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
          <h2 className="mt-4 text-3xl font-bold text-white">Verify your email</h2>
          <p className="mt-2 text-sm text-dark-400">
            We've sent a 6-digit code to {user?.email || 'your email'}
          </p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glassmorphism sm:rounded-lg px-6 py-8 sm:mx-auto sm:w-full sm:max-w-md"
        >
          {success ? (
            <div className="text-center">
              <div className="rounded-full bg-success-900/30 w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-success-500" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Email Verified!</h3>
              <p className="text-dark-300 mb-6">
                Your email has been successfully verified. You'll be redirected to the login page.
              </p>
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start mb-6">
                  <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {verificationSent && (
                <div className="bg-success-900/30 border border-success-700 text-success-400 px-4 py-3 rounded-md flex items-start mb-6">
                  <CheckCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Verification code sent to your email</span>
                </div>
              )}
              
              {requestError && (
                <div className="bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start mb-6">
                  <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{requestError}</span>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-3">
                  Enter verification code
                </label>
                <div className="flex justify-between gap-2">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleInputChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="w-full aspect-square text-center text-lg font-bold bg-dark-800 border border-dark-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <button
                  type="button"
                  onClick={requestNewCode}
                  disabled={isRequesting || countdown > 0}
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center"
                >
                  <RefreshCw size={14} className="mr-1" />
                  {countdown > 0 
                    ? `Resend code (${countdown}s)` 
                    : 'Resend code'}
                </button>
                
                <button
                  type="button"
                  onClick={() => handleVerify(verificationCode.join(''))}
                  disabled={verificationCode.some(digit => digit === '') || loading}
                  className="btn btn-primary py-2 px-4 text-sm"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Verify'}
                </button>
              </div>
              
              <div className="border-t border-dark-800 pt-4">
                <Link to="/login" className="flex items-center justify-center text-sm text-dark-400 hover:text-white">
                  <ArrowLeft size={14} className="mr-1" />
                  Back to login
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;