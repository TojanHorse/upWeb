import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Menu, Search, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  user: any;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Navbar = ({ user, sidebarOpen, setSidebarOpen }: NavbarProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Monitor Status Change',
      message: 'example.com is now back online',
      time: '5 min ago',
      read: false
    },
    {
      id: 2,
      title: 'Payment Received',
      message: 'You received 5 credits to your wallet',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      title: 'New Feature',
      message: 'Check out our new monitoring tools',
      time: '1 day ago',
      read: true
    }
  ]);
  
  const { logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="bg-dark-900/90 border-b border-dark-800 backdrop-blur-md sticky top-0 z-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              id="navbar-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-dark-400 hover:text-white hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              <Menu size={24} />
            </button>
            
            {/* Search */}
            <div className="hidden md:block ml-4">
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={18} className="text-dark-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="input py-1 pl-10 pr-4 w-64 text-sm bg-dark-800/50 border-dark-700/50"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-2 text-dark-300 hover:text-white hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification dropdown */}
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 origin-top-right rounded-md shadow-lg"
                >
                  <div className="glassmorphism rounded-md py-2 max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-dark-800">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Notifications</h3>
                        <button className="text-xs text-primary-400 hover:text-primary-300">
                          Mark all as read
                        </button>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-dark-800">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`px-4 py-3 hover:bg-dark-800/50 cursor-pointer ${!notification.read ? 'bg-dark-800/30' : ''}`}
                          >
                            <div className="flex justify-between">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <span className="text-xs text-dark-400">{notification.time}</span>
                            </div>
                            <p className="text-xs text-dark-300 mt-1">{notification.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-dark-400 text-sm">
                          No notifications
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t border-dark-800 px-4 py-2">
                      <Link 
                        to="#" 
                        className="block text-center text-xs text-primary-400 hover:text-primary-300"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-primary-900 border border-primary-700 flex items-center justify-center">
                    {user?.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt={user?.name || 'User'} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={16} className="text-primary-400" />
                    )}
                    
                    {user?.isVerified && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success-500 border border-dark-900"></div>
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-medium">
                    {user?.name || 'User'}
                  </span>
                </div>
              </button>
              
              {/* User menu dropdown */}
              {showUserMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg"
                >
                  <div className="glassmorphism rounded-md py-1">
                    <div className="px-4 py-2 border-b border-dark-800">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-dark-400 truncate">{user?.email}</p>
                    </div>
                    
                    <Link 
                      to={`/${user?.role}/profile`} 
                      className="flex items-center px-4 py-2 text-sm hover:bg-dark-800/50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User size={16} className="mr-2" />
                      Profile
                    </Link>
                    
                    <Link 
                      to={`/${user?.role}/settings`} 
                      className="flex items-center px-4 py-2 text-sm hover:bg-dark-800/50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings size={16} className="mr-2" />
                      Settings
                    </Link>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-error-400 hover:bg-dark-800/50"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;