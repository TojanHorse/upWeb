import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Globe, Clock, Activity, CheckCircle, X, AlertTriangle, Server, Wallet, BarChart3 } from 'lucide-react';
import { monitorService } from '../../services/api';
import MonitorCard from '../../components/monitors/MonitorCard';
import MonitorHistoryChart from '../../components/monitors/MonitorHistoryChart';

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
  }
];

const mockHistoryData = {
  dates: ['May 1', 'May 2', 'May 3', 'May 4', 'May 5', 'May 6', 'May 7', 'May 8', 'May 9', 'May 10'],
  responseTimes: [210, 180, 190, 220, 195, 240, 500, 620, 310, 180],
  statuses: ['good', 'good', 'good', 'good', 'good', 'warning', 'warning', 'error', 'warning', 'good']
};

const UserDashboard: React.FC = () => {
  const [monitors, setMonitors] = useState(mockMonitors);
  const [loading, setLoading] = useState(false);
  const [checkingMonitor, setCheckingMonitor] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMonitors: mockMonitors.length,
    activeMonitors: mockMonitors.filter(m => m.status === 'good').length,
    warningMonitors: mockMonitors.filter(m => m.status === 'warning').length,
    downMonitors: mockMonitors.filter(m => m.status === 'error').length,
    walletBalance: 25.50,
    checksRemaining: 50,
    checksPerformed: 120,
  });
  
  useEffect(() => {
    // In a real app, fetch data from API
    const fetchData = async () => {
      try {
        setLoading(true);
        // Uncomment to use real API
        // const response = await monitorService.getAvailableMonitors();
        // setMonitors(response.data);
      } catch (error) {
        console.error('Error fetching monitors:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
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
      
      // Update stats
      setStats(prev => ({
        ...prev,
        checksRemaining: prev.checksRemaining - 1,
        checksPerformed: prev.checksPerformed + 1
      }));
    } catch (error) {
      console.error('Error checking monitor:', error);
    } finally {
      setCheckingMonitor(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/user/monitors" className="btn btn-primary text-sm py-1.5">
          <Server size={16} className="mr-1" />
          View All Monitors
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card bg-dark-800/40"
        >
          <div className="flex items-start">
            <div className="rounded-md bg-primary-900/30 p-2 mr-4">
              <Activity size={20} className="text-primary-500" />
            </div>
            <div>
              <div className="text-sm text-dark-400">Total Monitors</div>
              <div className="text-2xl font-bold mt-1">{stats.totalMonitors}</div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card bg-dark-800/40"
        >
          <div className="flex items-start">
            <div className="rounded-md bg-success-900/30 p-2 mr-4">
              <CheckCircle size={20} className="text-success-500" />
            </div>
            <div>
              <div className="text-sm text-dark-400">Active</div>
              <div className="text-2xl font-bold mt-1">{stats.activeMonitors}</div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="card bg-dark-800/40"
        >
          <div className="flex items-start">
            <div className="rounded-md bg-warning-900/30 p-2 mr-4">
              <AlertTriangle size={20} className="text-warning-500" />
            </div>
            <div>
              <div className="text-sm text-dark-400">Degraded</div>
              <div className="text-2xl font-bold mt-1">{stats.warningMonitors}</div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="card bg-dark-800/40"
        >
          <div className="flex items-start">
            <div className="rounded-md bg-error-900/30 p-2 mr-4">
              <X size={20} className="text-error-500" />
            </div>
            <div>
              <div className="text-sm text-dark-400">Down</div>
              <div className="text-2xl font-bold mt-1">{stats.downMonitors}</div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Quick Monitors */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Check</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monitors.map((monitor) => (
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
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Performance History</h2>
          <MonitorHistoryChart data={mockHistoryData} />
        </div>
        
        {/* Account Stats */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <div className="card bg-dark-800/40 h-full">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-dark-400">Wallet Balance</div>
                  <Link to="/user/wallet" className="text-xs text-primary-400 hover:text-primary-300">
                    Add Funds
                  </Link>
                </div>
                <div className="flex items-center">
                  <Wallet size={18} className="text-primary-500 mr-2" />
                  <span className="text-xl font-bold">${stats.walletBalance.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-dark-800">
                <div className="text-sm text-dark-400 mb-2">Checks Remaining</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{stats.checksRemaining}</span>
                  <div className="bg-dark-900 rounded-full h-1.5 w-2/3">
                    <div 
                      className="bg-primary-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, (stats.checksRemaining / 100) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-dark-800">
                <div className="text-sm text-dark-400 mb-2">Monitoring Stats</div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-dark-300">Total Checks</span>
                    <span>{stats.checksPerformed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Monitors</span>
                    <span>{stats.totalMonitors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Account Status</span>
                    <span className="text-success-500">Active</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-dark-800">
                <Link to="/user/history" className="btn btn-outline w-full py-1.5 flex items-center justify-center">
                  <BarChart3 size={16} className="mr-1.5" />
                  View Full History
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;