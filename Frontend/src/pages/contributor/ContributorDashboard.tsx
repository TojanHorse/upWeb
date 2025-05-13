import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ArrowRight, Globe, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { websiteService } from '../../services/api';

const ContributorDashboard = () => {
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
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Contributor Dashboard</h1>
          <p className="text-dark-400">Monitor and manage your contributed websites</p>
        </div>
      </motion.div>
      
      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-primary-900/30 mr-4">
              <Globe className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total Websites</p>
              <h3 className="text-xl font-bold">{loading ? '...' : websites.length}</h3>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-success-900/30 mr-4">
              <CheckCircle className="h-6 w-6 text-success-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Active Monitors</p>
              <h3 className="text-xl font-bold">{loading ? '...' : websites.filter((site: any) => site.status === 'active').length}</h3>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-warning-900/30 mr-4">
              <Clock className="h-6 w-6 text-warning-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Pending Approval</p>
              <h3 className="text-xl font-bold">{loading ? '...' : websites.filter((site: any) => site.status === 'pending').length}</h3>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-error-900/30 mr-4">
              <AlertTriangle className="h-6 w-6 text-error-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Issues Detected</p>
              <h3 className="text-xl font-bold">{loading ? '...' : websites.filter((site: any) => site.healthStatus === 'down').length}</h3>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Recent earnings chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card bg-dark-900/30"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Earnings</h2>
          <button className="text-sm text-primary-400 flex items-center">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </div>
        
        <div className="h-64 flex items-center justify-center">
          <div className="flex items-center flex-col">
            <BarChart3 size={48} className="text-dark-600 mb-2" />
            <p className="text-dark-500 text-sm">Earnings data will appear here</p>
          </div>
        </div>
      </motion.div>
      
      {/* Error message */}
      {error && (
        <div className="p-4 bg-error-900/30 border border-error-800 rounded-md text-error-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ContributorDashboard; 