import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, MoreVertical, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface Monitor {
  id: string;
  name: string;
  url: string;
  type: string;
  status: string;
  responseTime: number;
  uptime: number;
  lastChecked: string;
  checkFrequency: number;
  website: {
    id: string;
    name: string;
  };
}

const MonitorStatusPage = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchMonitors();
  }, []);

  const fetchMonitors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/monitors');
      
      setMonitors(response.data.monitors || []);
    } catch (err: any) {
      console.error('Error fetching monitors:', err);
      setError(err.response?.data?.error || 'Failed to load monitor data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter monitors based on search term and status
  const filteredMonitors = monitors.filter((monitor) => {
    const matchesSearch = 
      monitor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      monitor.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || monitor.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return (
          <span className="badge badge-success flex items-center">
            <CheckCircle size={12} className="mr-1" /> Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="badge badge-warning flex items-center">
            <Clock size={12} className="mr-1" /> Degraded
          </span>
        );
      case 'down':
        return (
          <span className="badge badge-error flex items-center">
            <AlertTriangle size={12} className="mr-1" /> Down
          </span>
        );
      default:
        return (
          <span className="badge flex items-center">
            {status}
          </span>
        );
    }
  };

  const formatResponseTime = (time: number) => {
    if (time < 300) {
      return (
        <div className="flex items-center text-success-400">
          <ArrowDownRight size={14} className="mr-1" />
          <span>{time}ms</span>
        </div>
      );
    } else if (time < 800) {
      return (
        <div className="flex items-center text-dark-300">
          <span>{time}ms</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-error-400">
          <ArrowUpRight size={14} className="mr-1" />
          <span>{time}ms</span>
        </div>
      );
    }
  };

  const runCheck = async (id: string) => {
    try {
      setRunningCheck(id);
      await api.post(`/admin/monitors/${id}/check`);
      // After running check, refresh the monitor data
      await fetchMonitors();
    } catch (err: any) {
      console.error('Error running check:', err);
      setError(err.response?.data?.error || 'Failed to run check. Please try again.');
    } finally {
      setRunningCheck(null);
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
          <h1 className="text-2xl font-bold">Monitor Status</h1>
          <p className="text-dark-400">View and manage website monitoring status</p>
        </div>
      </motion.div>
      
      {/* Search and filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-dark-400" />
          </div>
          <input
            type="text"
            className="input pl-10"
            placeholder="Search monitors by name or URL"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="sm:w-48 flex">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter size={18} className="text-dark-400" />
            </div>
            <select
              className="select pl-10 appearance-none"
              value={statusFilter}
              onChange={handleStatusFilter}
            >
              <option value="all">All Status</option>
              <option value="operational">Operational</option>
              <option value="degraded">Degraded</option>
              <option value="down">Down</option>
            </select>
          </div>
        </div>
      </motion.div>
      
      {/* Status summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="card bg-dark-900/30 flex items-center justify-between">
          <div>
            <p className="text-dark-400 text-sm">Operational</p>
            <p className="text-2xl font-bold text-success-400">
              {loading ? '...' : monitors.filter((m) => m.status === 'operational').length}
            </p>
          </div>
          <div className="rounded-full p-3 bg-success-900/30">
            <CheckCircle className="h-6 w-6 text-success-400" />
          </div>
        </div>
        
        <div className="card bg-dark-900/30 flex items-center justify-between">
          <div>
            <p className="text-dark-400 text-sm">Degraded</p>
            <p className="text-2xl font-bold text-warning-400">
              {loading ? '...' : monitors.filter((m) => m.status === 'degraded').length}
            </p>
          </div>
          <div className="rounded-full p-3 bg-warning-900/30">
            <Clock className="h-6 w-6 text-warning-400" />
          </div>
        </div>
        
        <div className="card bg-dark-900/30 flex items-center justify-between">
          <div>
            <p className="text-dark-400 text-sm">Down</p>
            <p className="text-2xl font-bold text-error-400">
              {loading ? '...' : monitors.filter((m) => m.status === 'down').length}
            </p>
          </div>
          <div className="rounded-full p-3 bg-error-900/30">
            <AlertTriangle className="h-6 w-6 text-error-400" />
          </div>
        </div>
      </motion.div>
      
      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-error-900/30 border border-error-700 text-error-400 px-4 py-3 rounded-md flex items-start"
        >
          <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
      
      {/* Monitors table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-dark-900/30 p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800/50 text-left">
                <th className="px-6 py-3 text-xs font-medium">Monitor</th>
                <th className="px-6 py-3 text-xs font-medium">Status</th>
                <th className="px-6 py-3 text-xs font-medium">Response Time</th>
                <th className="px-6 py-3 text-xs font-medium">Uptime</th>
                <th className="px-6 py-3 text-xs font-medium">Last Checked</th>
                <th className="px-6 py-3 text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-dark-400">
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                      <span className="ml-2">Loading monitors...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-error-400">
                    {error}
                  </td>
                </tr>
              ) : filteredMonitors.length > 0 ? (
                filteredMonitors.map((monitor) => (
                  <tr key={monitor.id} className="hover:bg-dark-800/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{monitor.name}</p>
                        <a 
                          href={monitor.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-primary-400 hover:text-primary-300"
                        >
                          {monitor.url}
                        </a>
                        {monitor.website && (
                          <p className="text-xs text-dark-400 mt-1">
                            {monitor.website.name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(monitor.status)}
                    </td>
                    <td className="px-6 py-4">
                      {formatResponseTime(monitor.responseTime)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={monitor.uptime > 99.9 ? 'text-success-400' : monitor.uptime > 98 ? 'text-warning-400' : 'text-error-400'}>
                        {monitor.uptime.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-400">
                      {new Date(monitor.lastChecked).toLocaleString()}
                      <div className="text-xs">
                        Every {monitor.checkFrequency} min
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => runCheck(monitor.id)}
                          disabled={runningCheck === monitor.id}
                          className="flex items-center text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {runningCheck === monitor.id ? (
                            <>
                              <div className="animate-spin mr-1">
                                <RefreshCw size={14} />
                              </div>
                              <span>Running...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw size={14} className="mr-1" />
                              <span>Run Check</span>
                            </>
                          )}
                        </button>
                        <button className="text-dark-400 hover:text-white">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-dark-400">
                    No monitors found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default MonitorStatusPage; 