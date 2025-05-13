import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Clock, Server, MapPin, Loader2, ExternalLink } from 'lucide-react';

type MonitorStatus = 'good' | 'warning' | 'error' | 'checking';

interface MonitorCardProps {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  responseTime?: number;
  lastChecked?: string;
  location?: string;
  uptime?: number;
  onCheck?: (id: string) => void;
  isChecking?: boolean;
}

const MonitorCard: React.FC<MonitorCardProps> = ({
  id,
  name,
  url,
  status,
  responseTime,
  lastChecked,
  location,
  uptime,
  onCheck,
  isChecking = false
}) => {
  const statusText = {
    good: 'Online',
    warning: 'Degraded',
    error: 'Offline',
    checking: 'Checking...'
  };
  
  const getStatusIndicator = () => {
    if (status === 'checking') {
      return (
        <div className="flex items-center">
          <Loader2 size={14} className="text-primary-500 animate-spin mr-1.5" />
          <span>Checking...</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center">
        <span className={`status-indicator status-${status} mr-1.5`}></span>
        {statusText[status]}
      </div>
    );
  };
  
  const handleClick = () => {
    if (onCheck && !isChecking) {
      onCheck(id);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`card-gradient cursor-pointer hover:shadow-lg transition-all duration-300 ${isChecking ? 'opacity-80' : ''}`}
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-white truncate pr-4">{name}</h3>
          <div className={`badge ${
            status === 'good' 
              ? 'badge-success' 
              : status === 'warning' 
                ? 'badge-warning' 
                : status === 'checking'
                  ? 'badge-primary'
                  : 'badge-error'
          }`}>
            {getStatusIndicator()}
          </div>
        </div>
        
        <div className="flex items-center text-dark-400 text-sm mb-4">
          <Globe size={14} className="mr-1.5 flex-shrink-0" />
          <span className="truncate">{url}</span>
          <a 
            href={url.startsWith('http') ? url : `https://${url}`} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-1.5 text-primary-400 hover:text-primary-300"
          >
            <ExternalLink size={12} />
          </a>
        </div>
        
        <div className="flex-grow">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {responseTime !== undefined && (
              <div className="bg-dark-800/50 rounded-md p-2">
                <div className="text-xs text-dark-400 mb-1">Response Time</div>
                <div className="font-medium">{responseTime} ms</div>
              </div>
            )}
            
            {uptime !== undefined && (
              <div className="bg-dark-800/50 rounded-md p-2">
                <div className="text-xs text-dark-400 mb-1">Uptime</div>
                <div className="font-medium">{uptime}%</div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 text-sm">
            {location && (
              <div className="flex items-center text-dark-300">
                <MapPin size={14} className="mr-1.5 flex-shrink-0 text-dark-400" />
                {location}
              </div>
            )}
            
            {lastChecked && (
              <div className="flex items-center text-dark-300">
                <Clock size={14} className="mr-1.5 flex-shrink-0 text-dark-400" />
                Last checked: {lastChecked}
              </div>
            )}
          </div>
        </div>
        
        {onCheck && (
          <button
            onClick={handleClick}
            disabled={isChecking}
            className="mt-4 w-full btn btn-outline py-1.5 flex items-center justify-center"
          >
            {isChecking ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" />
                Checking...
              </>
            ) : (
              <>
                <Server size={14} className="mr-1.5" />
                Check Now
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default MonitorCard;