import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { AlertCircle, Loader2, ArrowLeft, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { monitorService } from '../../services/api';

interface FormData {
  name: string;
  url: string;
  checkFrequency: number;
  description: string;
}

const CreateMonitorPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<FormData>({
    defaultValues: {
      checkFrequency: 15,
    }
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Add protocol if missing
      if (!data.url.startsWith('http://') && !data.url.startsWith('https://')) {
        data.url = 'https://' + data.url;
      }
      
      // Create monitor
      await monitorService.createMonitor(data);
      
      setIsSuccess(true);
      
      // Redirect after a delay
      setTimeout(() => {
        navigate('/contributor/websites');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error creating monitor:', err);
      setError(err.response?.data?.message || 'Failed to create monitor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Add New Website</h1>
          <p className="text-dark-400">Register a new website for monitoring</p>
        </div>
        
        <Link 
          to="/contributor/websites"
          className="btn btn-outline flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Link>
      </motion.div>
      
      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card bg-dark-900/30"
      >
        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="rounded-full bg-success-900/30 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Check size={32} className="text-success-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">Website Added Successfully!</h3>
            <p className="text-dark-400 mb-6">
              Your website has been submitted for monitoring and is pending review.
            </p>
            <Link 
              to="/contributor/websites"
              className="btn btn-primary"
            >
              Go to My Websites
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Website name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Website Name <span className="text-error-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="My Awesome Website"
                className={`input ${errors.name ? 'border-error-600 focus:ring-error-500' : ''}`}
                {...register('name', { required: 'Website name is required' })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error-400 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.name.message}
                </p>
              )}
            </div>
            
            {/* Website URL */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Website URL <span className="text-error-500">*</span>
              </label>
              <input
                id="url"
                type="text"
                placeholder="https://example.com"
                className={`input ${errors.url ? 'border-error-600 focus:ring-error-500' : ''}`}
                {...register('url', { 
                  required: 'Website URL is required',
                  pattern: {
                    value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                    message: 'Please enter a valid URL'
                  }
                })}
              />
              <p className="mt-1 text-xs text-dark-500">
                Protocol (http:// or https://) will be added automatically if not provided
              </p>
              {errors.url && (
                <p className="mt-1 text-sm text-error-400 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.url.message}
                </p>
              )}
            </div>
            
            {/* Check frequency */}
            <div>
              <label htmlFor="checkFrequency" className="block text-sm font-medium mb-2">
                Check Frequency (minutes)
              </label>
              <select
                id="checkFrequency"
                className="select"
                {...register('checkFrequency')}
              >
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every 60 minutes</option>
              </select>
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Brief description of your website (optional)"
                className="input"
                {...register('description')}
              ></textarea>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="p-4 bg-error-900/30 border border-error-800 rounded-md text-error-400 text-sm">
                {error}
              </div>
            )}
            
            {/* Submit button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary min-w-[120px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Submitting
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default CreateMonitorPage; 