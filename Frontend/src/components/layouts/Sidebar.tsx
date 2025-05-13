import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ActivitySquare, 
  LayoutDashboard, 
  Globe, 
  History, 
  Wallet, 
  User,
  Users,
  BarChart3,
  Server,
  PlusCircle,
  CheckCircle,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  userType: 'user' | 'contributor' | 'admin';
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
}

const Sidebar = ({ userType, isOpen, setIsOpen, isMobile }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Close sidebar on navigation in mobile view
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile, setIsOpen]);

  const sidebarVariants = {
    open: { 
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    closed: { 
      x: "-100%", 
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  // Navigation items based on user type
  const getNavItems = () => {
    switch (userType) {
      case 'user':
        return [
          { path: '/user', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
          { path: '/user/monitors', icon: <Globe size={20} />, label: 'Monitors' },
          { path: '/user/history', icon: <History size={20} />, label: 'Check History' },
          { path: '/user/wallet', icon: <Wallet size={20} />, label: 'Wallet' },
          { path: '/user/profile', icon: <User size={20} />, label: 'Profile' },
        ];
      case 'contributor':
        return [
          { path: '/contributor', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
          { path: '/contributor/websites', icon: <Globe size={20} />, label: 'My Websites' },
          { path: '/contributor/create-monitor', icon: <PlusCircle size={20} />, label: 'Create Monitor' },
          { path: '/contributor/wallet', icon: <Wallet size={20} />, label: 'Earnings' },
          { path: '/contributor/profile', icon: <User size={20} />, label: 'Profile' },
        ];
      case 'admin':
        return [
          { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
          { path: '/admin/users', icon: <Users size={20} />, label: 'Manage Users' },
          { path: '/admin/websites', icon: <Globe size={20} />, label: 'Websites' },
          { path: '/admin/monitors', icon: <Server size={20} />, label: 'Monitor Status' },
          { path: '/admin/profile', icon: <User size={20} />, label: 'Profile' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const renderNavigation = () => (
    <nav className="mt-6 flex flex-col flex-1">
      <div className="space-y-1 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${
              isActive(item.path)
                ? 'bg-primary-900/30 text-primary-400'
                : 'text-dark-300 hover:bg-dark-800/30 hover:text-white'
            }`}
          >
            <div className={`mr-3 ${
              isActive(item.path)
                ? 'text-primary-400'
                : 'text-dark-400 group-hover:text-white'
            }`}>
              {item.icon}
            </div>
            {item.label}
            {isActive(item.path) && (
              <motion.div
                layoutId="active-indicator"
                className="absolute right-0 w-1 h-8 bg-primary-500 rounded-l-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-dark-950/80 z-20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <AnimatePresence>
        <motion.aside
          id="sidebar"
          variants={sidebarVariants}
          initial={isMobile ? "closed" : "open"}
          animate={isOpen || !isMobile ? "open" : "closed"}
          className={`${isMobile ? 'fixed z-30' : 'relative'} w-64 h-full flex flex-col glassmorphism overflow-y-auto`}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-dark-800">
            <Link to="/" className="flex items-center gap-2 transition hover:opacity-80">
              <div className="flex-shrink-0 rounded-md bg-primary-900/30 p-1.5">
                <ActivitySquare size={24} className="text-primary-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-wide text-white">upWeb</span>
                <span className="text-xs text-dark-400">
                  {userType === 'admin' ? 'Admin Panel' : userType === 'contributor' ? 'Contributor' : 'Dashboard'}
                </span>
              </div>
            </Link>
            
            {isMobile && (
              <button 
                className="rounded-md p-1.5 text-dark-400 hover:bg-dark-800 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* User info card */}
          <div className="px-4 py-3 flex flex-col border-b border-dark-800">
            {user && (
              <div className="flex items-center">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary-900 border border-primary-700 flex items-center justify-center mr-3">
                  {user.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-primary-400" />
                  )}
                  
                  {user.isVerified && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success-500 border border-dark-900"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <div className="flex items-center text-xs text-dark-400">
                    {userType === 'admin' ? (
                      <span className="flex items-center">
                        <Shield size={12} className="mr-1 text-error-500" /> Admin
                      </span>
                    ) : userType === 'contributor' ? (
                      <span className="flex items-center">
                        <Server size={12} className="mr-1 text-secondary-500" /> Contributor
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CheckCircle size={12} className="mr-1 text-primary-500" /> User
                      </span>
                    )}
                    
                    {!user.isVerified && (
                      <span className="ml-2 text-warning-500 text-xs">Not verified</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Wallet balance if available */}
            {user?.walletBalance !== undefined && (
              <div className="flex justify-between mt-3 p-2 rounded-md bg-dark-800/50">
                <span className="text-xs text-dark-400">Wallet Balance</span>
                <span className="text-xs font-medium">${user.walletBalance.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          {/* Navigation links */}
          {renderNavigation()}
          
          {/* Sidebar footer */}
          <div className="mt-auto border-t border-dark-800 px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-400">Version</span>
                <span className="text-xs">1.0.0</span>
              </div>
              
              {user?.isVerified === false && (
                <button
                  onClick={() => navigate('/verify-email')}
                  className="w-full flex items-center justify-center px-3 py-1.5 mt-1 text-xs font-medium rounded-md bg-warning-900/30 text-warning-400 hover:bg-warning-900/50"
                >
                  <CheckCircle size={12} className="mr-1.5" />
                  Verify Email
                </button>
              )}
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>
    </>
  );
};

export default Sidebar;