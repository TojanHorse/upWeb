import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type MonitorType = 'http' | 'https' | 'tcp' | 'ping';

interface MonitorFormProps {
  initialData?: {
    id?: string;
    name: string;
    url: string;
    type: MonitorType;
    interval: number;
    timeout: number;
    retries: number;
    active: boolean;
    description?: string;
  };
  onSubmit: (data: any) => Promise<void>;
  isEditing?: boolean;
}

const MonitorForm = ({ initialData, onSubmit, isEditing = false }: MonitorFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'https' as MonitorType,
    interval: 5,
    timeout: 30,
    retries: 1,
    active: true,
    description: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        description: initialData.description || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      await onSubmit(formData);
      navigate('/monitors');
    } catch (error) {
      console.error('Error submitting monitor:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to save monitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
      {formError && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {formError}
        </div>
      )}
      
      <div className="space-y-4">
        {/* Basic Info Section */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
                Monitor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="My Website"
              />
            </div>
            
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-neutral-700">
                URL or IP Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-neutral-700">
                Monitor Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
                <option value="ping">Ping</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="active" className="flex items-center text-sm font-medium text-neutral-700">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2">Active</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Advanced Settings Section */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 mb-4">Advanced Settings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="interval" className="block text-sm font-medium text-neutral-700">
                Check Interval (minutes)
              </label>
              <input
                type="number"
                id="interval"
                name="interval"
                value={formData.interval}
                onChange={handleChange}
                min="1"
                max="60"
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="timeout" className="block text-sm font-medium text-neutral-700">
                Timeout (seconds)
              </label>
              <input
                type="number"
                id="timeout"
                name="timeout"
                value={formData.timeout}
                onChange={handleChange}
                min="5"
                max="120"
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="retries" className="block text-sm font-medium text-neutral-700">
                Retries before alert
              </label>
              <input
                type="number"
                id="retries"
                name="retries"
                value={formData.retries}
                onChange={handleChange}
                min="0"
                max="5"
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Description Section */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Additional details about this monitor"
          />
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => navigate('/monitors')}
          className="inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Monitor' : 'Create Monitor'}
        </button>
      </div>
    </form>
  );
};

export default MonitorForm; 