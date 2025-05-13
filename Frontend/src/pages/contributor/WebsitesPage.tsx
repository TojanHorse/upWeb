import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, ExternalLink, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { websiteService } from '../../services/api';

const WebsitesPage = () => {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await websiteService.getContributorWebsites();
        setWebsites(response.data || []);
      } catch (err) {
        console.error('Error fetching websites:', err);
        setError('Failed to load websites. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getStatusBadge = (status: string, healthStatus?: string) => {
    if (status === 'pending') {
      return (
        <span className="badge badge-warning flex items-center">
          <Clock size={12} className="mr-1" /> Pending
        </span>
      );
    } else if (status === 'rejected') {
      return (
        <span className="badge badge-error flex items-center">
          <AlertTriangle size={12} className="mr-1" /> Rejected
        </span>
      );
    } else if (healthStatus === 'down') {
      return (
        <span className="badge badge-error flex items-center">
          <AlertTriangle size={12} className="mr-1" /> Down
        </span>
      );
    } else {
      return (
        <span className="badge badge-success flex items-center">
          <CheckCircle size={12} className="mr-1" /> Active
        </span>
      );
    }
  };
  
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">My Websites</h1>
          <p className="text-dark-400">Manage your registered websites and their monitoring status</p>
        </div>
        
        <Link 
          to="/contributor/create-monitor"
          className="btn btn-primary mt-4 md:mt-0 flex items-center justify-center"
        >
          <Plus size={16} className="mr-2" />
          Add Website
        </Link>
      </motion.div>
      
      {/* Websites list */}
      <div className="space-y-4">
        {loading ? (
          <div className="card bg-dark-900/30 p-8">
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-dark-800 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-dark-800 rounded"></div>
                    <div className="h-4 bg-dark-800 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : websites.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-dark-900/50 text-left">
                  <th className="px-4 py-3 text-sm font-medium">Website</th>
                  <th className="px-4 py-3 text-sm font-medium">URL</th>
                  <th className="px-4 py-3 text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-sm font-medium">Uptime</th>
                  <th className="px-4 py-3 text-sm font-medium">Last Check</th>
                  <th className="px-4 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {websites.map((website: any) => (
                  <tr key={website.id} className="hover:bg-dark-900/30">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded bg-primary-900/30 flex items-center justify-center mr-2">
                          {website.favicon ? (
                            <img src={website.favicon} alt="" className="w-4 h-4" />
                          ) : (
                            <span className="text-xs text-primary-400">{website.name.charAt(0)}</span>
                          )}
                        </div>
                        <span>{website.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a 
                        href={website.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-primary-400 hover:text-primary-300"
                      >
                        {website.url}
                        <ExternalLink size={12} className="ml-1" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(website.status, website.healthStatus)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {website.uptime ? `${website.uptime}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-400">
                      {website.lastChecked ? new Date(website.lastChecked).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <button className="text-primary-400 hover:text-primary-300">
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <div className="card bg-dark-900/30 p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No websites found</h3>
            <p className="text-dark-400 mb-4">You haven't added any websites for monitoring yet.</p>
            <Link 
              to="/contributor/create-monitor"
              className="btn btn-primary inline-flex items-center justify-center"
            >
              <Plus size={16} className="mr-2" />
              Add Your First Website
            </Link>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="p-4 bg-error-900/30 border border-error-800 rounded-md text-error-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default WebsitesPage; 