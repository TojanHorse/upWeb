import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Globe, 
  Server, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Activity,
  ShieldAlert,
  TrendingUp,
  Clock,
  LineChart,
  BadgeAlert
} from 'lucide-react';
import { api } from '../../services/api';

interface DashboardStats {
  users: number;
  contributors: number;
  admins: number;
  websites: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
  };
  monitors: {
    total: number;
    active: number;
    paused: number;
    failing: number;
  };
  checks: {
    total: number;
    success: number;
    failed: number;
    last24Hours: number;
  };
  performance: {
    averageResponseTime: number;
    uptime: number;
    availability: number;
  };
  system: {
    status: 'operational' | 'degraded' | 'maintenance' | 'outage';
    lastRestart: string;
    activeJobs: number;
  };
  trends: {
    userGrowth: number;
    websiteGrowth: number;
    checkVolume: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'website_added' | 'website_status_change' | 'monitor_alert' | 'user_joined' | 'system_event';
  title: string;
  websiteName?: string;
  websiteUrl?: string;
  status?: string;
  userName?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 1 minute refresh
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/stats');
      
      if (response.data) {
        setStats(response.data.stats);
        setRecentActivity(response.data.recentActivity || []);
        setLastRefreshed(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Set up auto-refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  const handleManualRefresh = () => {
    fetchDashboardData();
  };
  
  const getStatusIndicatorClass = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-success-500';
      case 'degraded': return 'bg-warning-500';
      case 'maintenance': return 'bg-primary-500';
      case 'outage': return 'bg-error-500';
      default: return 'bg-dark-500';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'success':
      case 'operational':
        return <CheckCircle size={16} className="text-success-400" />;
      case 'pending':
      case 'maintenance':
        return <Clock size={16} className="text-warning-400" />;
      case 'failed':
      case 'degraded':
        return <AlertTriangle size={16} className="text-warning-400" />;
      case 'paused':
        return <Clock size={16} className="text-primary-400" />;
      case 'failing':
      case 'outage':
        return <AlertTriangle size={16} className="text-error-400" />;
      default:
        return <BadgeAlert size={16} className="text-dark-400" />;
    }
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'website_added': return <Globe size={16} className="text-secondary-400" />;
      case 'website_status_change': return <Activity size={16} className="text-warning-400" />;
      case 'monitor_alert': return <AlertTriangle size={16} className="text-error-400" />;
      case 'user_joined': return <Users size={16} className="text-primary-400" />;
      case 'system_event': return <Server size={16} className="text-dark-400" />;
      default: return <BadgeAlert size={16} className="text-dark-400" />;
    }
  };
  
  const formatDateRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-dark-400">Platform overview and monitoring statistics</p>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0">
          <span className="text-sm text-dark-400 mr-3">
            Last updated: {formatDateRelative(lastRefreshed.toISOString())}
          </span>
          <button 
            onClick={handleManualRefresh}
            disabled={loading}
            className="btn btn-sm btn-primary"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </motion.div>
      
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
      
      {/* System Status Banner */}
      {stats?.system && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-md p-4 ${
            stats.system.status === 'operational' ? 'bg-success-900/30 border border-success-700' :
            stats.system.status === 'degraded' ? 'bg-warning-900/30 border border-warning-700' :
            stats.system.status === 'maintenance' ? 'bg-primary-900/30 border border-primary-700' :
            'bg-error-900/30 border border-error-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${getStatusIndicatorClass(stats.system.status)} mr-2`}></div>
              <span className="font-medium">
                System Status: {stats.system.status.charAt(0).toUpperCase() + stats.system.status.slice(1)}
              </span>
            </div>
            <div className="text-sm">
              {stats.system.activeJobs > 0 && (
                <span className="mr-4">{stats.system.activeJobs} active background jobs</span>
              )}
              <span>Last restart: {formatDateRelative(stats.system.lastRestart)}</span>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Users</h3>
            <div className="rounded-full p-2 bg-primary-900/30">
              <Users className="h-5 w-5 text-primary-400" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-dark-400 text-sm">Total Users</span>
                <span className="text-lg font-bold">{loading ? '...' : stats?.users || 0}</span>
              </div>
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: loading ? '0%' : `${Math.min((stats?.users || 0) / ((stats?.users || 0) + (stats?.contributors || 0) + (stats?.admins || 0)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-dark-400 text-sm">Contributors</span>
                <span className="text-lg font-bold">{loading ? '...' : stats?.contributors || 0}</span>
              </div>
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary-500 rounded-full"
                  style={{ width: loading ? '0%' : `${Math.min((stats?.contributors || 0) / ((stats?.users || 0) + (stats?.contributors || 0) + (stats?.admins || 0)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-dark-400 text-sm">Admins</span>
                <span className="text-lg font-bold">{loading ? '...' : stats?.admins || 0}</span>
              </div>
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-error-500 rounded-full"
                  style={{ width: loading ? '0%' : `${Math.min((stats?.admins || 0) / ((stats?.users || 0) + (stats?.contributors || 0) + (stats?.admins || 0)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {stats?.trends?.userGrowth !== undefined && (
              <div className="flex items-center justify-end text-sm">
                <TrendingUp size={14} className={stats.trends.userGrowth >= 0 ? 'text-success-400 mr-1' : 'text-error-400 mr-1'} />
                <span className={stats.trends.userGrowth >= 0 ? 'text-success-400' : 'text-error-400'}>
                  {stats.trends.userGrowth}% growth this month
                </span>
              </div>
            )}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Websites</h3>
            <div className="rounded-full p-2 bg-secondary-900/30">
              <Globe className="h-5 w-5 text-secondary-400" />
            </div>
          </div>
          
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-dark-400 text-sm">Total Websites</p>
              <h3 className="text-3xl font-bold">{loading ? '...' : stats?.websites?.total || 0}</h3>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="flex items-center text-success-400 text-sm">
                <CheckCircle size={14} className="mr-1" />
                <span>Active</span>
                <span className="ml-2 font-medium">{loading ? '...' : stats?.websites?.active || 0}</span>
              </div>
              
              <div className="flex items-center text-warning-400 text-sm mt-1">
                <Clock size={14} className="mr-1" />
                <span>Pending</span>
                <span className="ml-2 font-medium">{loading ? '...' : stats?.websites?.pending || 0}</span>
              </div>
              
              <div className="flex items-center text-error-400 text-sm mt-1">
                <AlertTriangle size={14} className="mr-1" />
                <span>Rejected</span>
                <span className="ml-2 font-medium">{loading ? '...' : stats?.websites?.rejected || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary-500 rounded-full"
                style={{ width: loading ? '0%' : `${Math.min((stats?.websites?.active || 0) / (stats?.websites?.total || 1) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-dark-400 text-xs mt-1">
              <span>
                {loading ? 'Calculating...' : `${Math.round((stats?.websites?.active || 0) / (stats?.websites?.total || 1) * 100)}% of websites actively monitored`}
              </span>
              
              {stats?.trends?.websiteGrowth !== undefined && (
                <span className={stats.trends.websiteGrowth >= 0 ? 'text-success-400' : 'text-error-400'}>
                  <TrendingUp size={12} className="inline mr-1" />
                  {stats.trends.websiteGrowth}% growth
                </span>
              )}
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Monitoring</h3>
            <div className="rounded-full p-2 bg-accent-900/30">
              <Server className="h-5 w-5 text-accent-400" />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Monitors</span>
              <div className="flex items-center">
                <span className="font-medium">{loading ? '...' : stats?.monitors?.active || 0}</span>
                <span className="text-dark-400 text-xs ml-1">/ {stats?.monitors?.total || 0}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Checks (24h)</span>
              <span className="font-medium">{loading ? '...' : stats?.checks?.last24Hours || 0}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Success Rate</span>
              <span className="font-medium">
                {loading ? '...' : stats?.checks?.total 
                  ? `${Math.round((stats.checks.success / stats.checks.total) * 100)}%` 
                  : 'N/A'
                }
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Avg. Response Time</span>
              <span className="font-medium">{loading ? '...' : `${stats?.performance?.averageResponseTime || 0}ms`}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Uptime</span>
              <span className="font-medium text-success-400">{loading ? '...' : `${stats?.performance?.uptime || 0}%`}</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card bg-dark-900/30 p-0 overflow-hidden"
      >
        <div className="p-6 border-b border-dark-800 flex justify-between items-center">
          <h3 className="text-lg font-medium">Recent Activity</h3>
          <span className="text-sm text-dark-400">Showing last {recentActivity.length} events</span>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            <span className="ml-2">Loading activity data...</span>
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-800/50 text-left">
                  <th className="px-6 py-3 text-xs font-medium">Activity</th>
                  <th className="px-6 py-3 text-xs font-medium">Website</th>
                  <th className="px-6 py-3 text-xs font-medium">Status</th>
                  <th className="px-6 py-3 text-xs font-medium">User</th>
                  <th className="px-6 py-3 text-xs font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity) => (
                  <tr key={activity.id} className="border-t border-dark-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="rounded-full p-1 bg-dark-800/80 mr-3">
                          {getActivityIcon(activity.type)}
                        </div>
                        <span>{activity.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activity.websiteName && (
                        <a 
                          href={activity.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:text-primary-400"
                        >
                          {activity.websiteName}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {activity.status && (
                        <div className="flex items-center">
                          {getStatusIcon(activity.status)}
                          <span className="ml-1 capitalize">{activity.status}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{activity.userName || '-'}</td>
                    <td className="px-6 py-4 text-dark-400">
                      {formatDateRelative(activity.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-dark-400">
            <p>No recent activity found.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard; 