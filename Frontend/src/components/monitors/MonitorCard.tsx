import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowUpCircle, ArrowDownCircle, Loader2, Settings, MoreVertical, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MonitorCardProps {
  monitor: {
    id: string;
    name: string;
    url: string;
    type: string;
    status: 'up' | 'down' | 'pending' | 'paused';
    uptime: number;
    lastChecked: string;
    responseTime: number;
    active: boolean;
  };
  onDelete: (id: string) => void;
}

const MonitorCard = ({ monitor, onDelete }: MonitorCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${monitor.name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(monitor.id);
      } catch (error) {
        console.error('Error deleting monitor:', error);
        setIsDeleting(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'pending':
        return 'text-orange-500';
      case 'paused':
        return 'text-neutral-500';
      default:
        return 'text-neutral-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
      case 'down':
        return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />;
      case 'paused':
        return <Settings className="h-5 w-5 text-neutral-500" />;
      default:
        return <Loader2 className="h-5 w-5 text-neutral-500" />;
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm overflow-hidden ${!monitor.active && 'opacity-70'}`}>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(monitor.status)}
            <h3 className="text-lg font-medium text-neutral-900 truncate">
              <Link to={`/monitors/${monitor.id}`} className="hover:underline">
                {monitor.name}
              </Link>
            </h3>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {menuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu">
                  <Link
                    to={`/monitors/${monitor.id}`}
                    className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    View Details
                  </Link>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-100"
                    role="menuitem"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Monitor'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-sm text-neutral-500 truncate">
          <span className="font-medium text-neutral-700">{monitor.type.toUpperCase()}</span>
          {' '}&middot;{' '}
          <a 
            href={monitor.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline truncate"
          >
            {monitor.url}
          </a>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(monitor.status)} bg-opacity-10`}>
              {monitor.status.toUpperCase()}
            </span>
            <span className="ml-2 text-neutral-700">
              Uptime: <span className="font-medium text-neutral-900">{formatUptime(monitor.uptime)}</span>
            </span>
          </div>
          <div className="flex items-center text-sm text-neutral-500">
            <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-neutral-400" />
            <span>
              {monitor.lastChecked 
                ? `Checked ${formatDistanceToNow(new Date(monitor.lastChecked), { addSuffix: true })}` 
                : 'Not checked yet'}
            </span>
          </div>
        </div>
        
        {monitor.status !== 'down' && monitor.status !== 'paused' && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span>Response Time</span>
              <span className="font-medium">{monitor.responseTime} ms</span>
            </div>
            <div className="mt-1 w-full bg-neutral-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${
                  monitor.responseTime < 300 ? 'bg-green-500' : 
                  monitor.responseTime < 800 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (monitor.responseTime / 2000) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorCard; 