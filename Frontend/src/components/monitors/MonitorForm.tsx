import React from 'react';
import { useForm } from 'react-hook-form';
import { Globe, Clock, Server, AlertCircle } from 'lucide-react';

interface MonitorFormData {
  name: string;
  url: string;
  checkInterval: number;
  protocol: 'http' | 'https';
  notifyOnDown: boolean;
  location?: string;
  timeout?: number;
  expectedStatusCode?: number;
}

interface MonitorFormProps {
  onSubmit: (data: MonitorFormData) => void;
  loading: boolean;
  error?: string;
  initialData?: Partial<MonitorFormData>;
}

const MonitorForm: React.FC<MonitorFormProps> = ({
  onSubmit,
  loading,
  error,
  initialData
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<MonitorFormData>({
    defaultValues: {
      name: initialData?.name || '',
      url: initialData?.url || '',
      checkInterval: initialData?.checkInterval || 5,
      protocol: initialData?.protocol || 'https',
      notifyOnDown: initialData?.notifyOnDown !== undefined ? initialData.notifyOnDown : true,
      location: initialData?.location || undefined,
      timeout: initialData?.timeout || 30,
      expectedStatusCode: initialData?.expectedStatusCode || 200
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-300 mb-1">
            Monitor Name <span className="text-error-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className={`input ${errors.name ? 'border-error-600 focus:ring-error-500' : ''}`}
            placeholder="My Website"
            {...register('name', { 
              required: 'Monitor name is required',
              maxLength: { 
                value: 100, 
                message: 'Name must be less than 100 characters' 
              }
            })}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-error-500">{errors.name.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-dark-300 mb-1">
            URL <span className="text-error-500">*</span>
          </label>
          <div className="flex">
            <select
              id="protocol"
              className="select rounded-r-none py-2 px-2 w-auto"
              {...register('protocol')}
            >
              <option value="https">https://</option>
              <option value="http">http://</option>
            </select>
            <input
              id="url"
              type="text"
              className={`input flex-1 rounded-l-none border-l-0 ${errors.url ? 'border-error-600 focus:ring-error-500' : ''}`}
              placeholder="example.com"
              {...register('url', { 
                required: 'URL is required',
                pattern: {
                  value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+|localhost(?::\d+)?|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::\d+)?$/,
                  message: 'Enter a valid domain or IP address'
                }
              })}
            />
          </div>
          {errors.url && (
            <p className="mt-1 text-sm text-error-500">{errors.url.message}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="checkInterval" className="block text-sm font-medium text-dark-300 mb-1">
            Check Interval (minutes) <span className="text-error-500">*</span>
          </label>
          <input
            id="checkInterval"
            type="number"
            className={`input ${errors.checkInterval ? 'border-error-600 focus:ring-error-500' : ''}`}
            {...register('checkInterval', { 
              required: 'Check interval is required',
              min: { 
                value: 1, 
                message: 'Minimum interval is 1 minute' 
              },
              max: { 
                value: 1440, 
                message: 'Maximum interval is 1440 minutes (24 hours)' 
              }
            })}
          />
          {errors.checkInterval && (
            <p className="mt-1 text-sm text-error-500">{errors.checkInterval.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="timeout" className="block text-sm font-medium text-dark-300 mb-1">
            Timeout (seconds)
          </label>
          <input
            id="timeout"
            type="number"
            className={`input ${errors.timeout ? 'border-error-600 focus:ring-error-500' : ''}`}
            {...register('timeout', { 
              min: { 
                value: 1, 
                message: 'Minimum timeout is 1 second' 
              },
              max: { 
                value: 120, 
                message: 'Maximum timeout is 120 seconds' 
              }
            })}
          />
          {errors.timeout && (
            <p className="mt-1 text-sm text-error-500">{errors.timeout.message}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="expectedStatusCode" className="block text-sm font-medium text-dark-300 mb-1">
            Expected Status Code
          </label>
          <input
            id="expectedStatusCode"
            type="number"
            className={`input ${errors.expectedStatusCode ? 'border-error-600 focus:ring-error-500' : ''}`}
            {...register('expectedStatusCode', { 
              min: { 
                value: 100, 
                message: 'Status code must be between 100 and 599' 
              },
              max: { 
                value: 599, 
                message: 'Status code must be between 100 and 599' 
              }
            })}
          />
          {errors.expectedStatusCode && (
            <p className="mt-1 text-sm text-error-500">{errors.expectedStatusCode.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-dark-300 mb-1">
            Preferred Location
          </label>
          <select
            id="location"
            className="select"
            {...register('location')}
          >
            <option value="">Auto-select best location</option>
            <option value="us-east">US East (N. Virginia)</option>
            <option value="us-west">US West (Oregon)</option>
            <option value="eu-central">EU Central (Frankfurt)</option>
            <option value="eu-west">EU West (Ireland)</option>
            <option value="ap-south">Asia Pacific (Mumbai)</option>
            <option value="ap-southeast">Asia Pacific (Singapore)</option>
            <option value="ap-northeast">Asia Pacific (Tokyo)</option>
          </select>
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          id="notifyOnDown"
          type="checkbox"
          className="h-4 w-4 rounded text-primary-600 bg-dark-800 border-dark-700 focus:ring-primary-500"
          {...register('notifyOnDown')}
        />
        <label htmlFor="notifyOnDown" className="ml-2 block text-sm text-dark-300">
          Notify me when website goes down
        </label>
      </div>
      
      <div className="flex justify-end">
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
            <>
              <Server size={18} className="mr-2" />
              Create Monitor
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default MonitorForm;