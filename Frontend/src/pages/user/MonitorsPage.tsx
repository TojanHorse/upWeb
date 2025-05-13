import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Globe, Search, Filter, Plus, CheckCircle, AlertTriangle, X, Download } from 'lucide-react';
import { monitorService } from '../../services/api';
import MonitorCard from '../../components/monitors/MonitorCard';

// Mock data for demonstration purposes
const mockMonitors = [
  {
    id: '1',
    name: 'Personal Blog',
    url: 'myblog.com',
    status: 'good',
    responseTime: 187,
    lastChecked: '2 min ago',
    location: 'US East',
    uptime: 99.98,
  },
  {
    id: '2',
    name: 'E-commerce Store',
    url: 'myshop.store',
    status: 'warning',
    responseTime: 456,
    lastChecked: '5 min ago',
    location: 'EU West',
    uptime: 97.5,
  },
  {
    id: '3',
    name: 'Company API',
    url: 'api.mycompany.io',
    status: 'error',
    responseTime: 0,
    lastChecked: '1 min ago',
    location: 'US West',
    uptime: 94.2,
  },
  {
    id: '4',
    name: 'Marketing Website',
    url: 'marketing.example.com',
    status: 'good',
    responseTime: 210,
    lastChecked: '3 min ago',
    location: 'Asia Pacific',
    uptime: 99.7,
  },
  {
    id: '5',
    name: 'Documentation Portal',
    url: 'docs.example.io',
    status: 'good',
    responseTime: 305,
    lastChecked: '7 min ago',
    location: 'EU Central',
    uptime: 98.9,
  },
  {
    id: '6',
    name: 'Customer Dashboard',
    url: 'dashboard.example.com',
    status: 'warning',
    responseTime: 520,
    lastChecked: '4 min ago',
    location: 'US East',
    uptime: 96.3,
  }
];

const MonitorsPage: React.FC = () => {
  const [monitors, setMonitors] = useState(mockMonitors);
  const [filteredMonitors, setFilteredMonitors] = useState(mockMonitors);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [checkingMonitor, setCheckingMonitor] = useState<string | null>(null);
  
  useEffect(() => {
    // In a real app, fetch data from API
    const fetchData = async () => {
      try {
        setLoading(true);
        // Uncomment to use real API
        // const response = await monitorService.getAvailableMonitors();
        // setMonitors(response.data);
        // setFilteredMonitors(response.data);
      } catch (error) {
        console.error('Error fetching monitors:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  useEffect(() => {
    let results = monitors;
    
    // Apply search filter
    if (searchTerm) {
      results = results.filter(
        monitor => 
          monitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          monitor.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      results = results.filter(monitor => monitor.status === statusFilter);
    }
    
    setFilteredMonitors(results);
  }, [monitors, searchTerm, statusFilter]);
  
  const handleCheckMonitor = async (id: string) => {
    try {
      setCheckingMonitor(id);
      
      // Simulate API call
      // In a real app, use the actual API
      // await monitorService.checkMonitor(id);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update monitors with new status
      setMonitors(prevMonitors => 
        prevMonitors.map(monitor => 
          monitor.id === id 
            ? { 
                ...monitor, 
                status: Math.random() > 0.2 ? 'good' : 'warning',
                lastChecked: 'Just now', 
                responseTime: Math.floor(Math.random() * 300) + 100 
              } 
            : monitor
        )
      );
    } catch (error) {
      console.error('Error checking monitor:', error);
    } finally {
      setCheckingMonitor(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">All Monitors</h1>
        
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button className="btn btn-outline py-1.5 px-3 text-sm">
            <Download size={16} className="mr-1.5" />
            Export
          </button>
          <Link to="/user/add-monitor" className="btn btn-primary py-1.5 px-3 text-sm">
            <Plus size={16} className="mr-1.5" />
            Add Monitor
          </Link>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="card bg-dark-800/40 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-dark-500" />
            </div>
            <input
              type="text"
              placeholder="Search monitors..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Status Filter */}
          <div className="w-full md:w-64">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Filter size={18} className="text-dark-500" />
              </div>
              <select
                className="select pl-10"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="good">Online</option>
                <option value="warning">Degraded</option>
                <option value="error">Offline</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Status counts */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              statusFilter === 'all'
                ? 'bg-dark-700 text-white'
                : 'bg-dark-800 text-dark-400 hover:bg-dark-700 hover:text-white'
            }`}
          >
            <Globe size={12} className="mr-1" />
            All ({monitors.length})
          </button>
          
          <button 
            onClick={() => setStatusFilter('good')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              statusFilter === 'good'
                ? 'bg-success-900/60 text-success-400'
                : 'bg-success-900/20 text-success-500/70 hover:bg-success-900/40 hover:text-success-400'
            }`}
          >
            <CheckCircle size={12} className="mr-1" />
            Online ({monitors.filter(m => m.status === 'good').length})
          </button>
          
          <button 
            onClick={() => setStatusFilter('warning')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              statusFilter === 'warning'
                ? 'bg-warning-900/60 text-warning-400'
                : 'bg-warning-900/20 text-warning-500/70 hover:bg-warning-900/40 hover:text-warning-400'
            }`}
          >
            <AlertTriangle size={12} className="mr-1" />
            Degraded ({monitors.filter(m => m.status === 'warning').length})
          </button>
          
          <button 
            onClick={() => setStatusFilter('error')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              statusFilter === 'error'
                ? 'bg-error-900/60 text-error-400'
                : 'bg-error-900/20 text-error-500/70 hover:bg-error-900/40 hover:text-error-400'
            }`}
          >
            <X size={12} className="mr-1" />
            Offline ({monitors.filter(m => m.status === 'error').length})
          </button>
        </div>
      </div>
      
      {/* Monitors Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredMonitors.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredMonitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              id={monitor.id}
              name={monitor.name}
              url={monitor.url}
              status={monitor.status as any}
              responseTime={monitor.responseTime}
              lastChecked={monitor.lastChecked}
              location={monitor.location}
              uptime={monitor.uptime}
              onCheck={handleCheckMonitor}
              isChecking={checkingMonitor === monitor.id}
            />
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 card-gradient">
          <Globe size={48} className="text-dark-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">No monitors found</h3>
          <p className="text-dark-400 text-center mb-6 max-w-md">
            {searchTerm || statusFilter !== 'all'
              ? "No monitors match your current filters. Try adjusting your search or filter criteria."
              : "You don't have any monitors set up yet. Add your first monitor to start tracking."}
          </p>
          <Link to="/user/add-monitor" className="btn btn-primary">
            <Plus size={18} className="mr-1.5" />
            Add Your First Monitor
          </Link>
        </div>
      )}
    </div>
  );
};

export default MonitorsPage;