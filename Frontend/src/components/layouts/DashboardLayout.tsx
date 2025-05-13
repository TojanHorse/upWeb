import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  userType: 'user' | 'contributor' | 'admin';
}

const DashboardLayout = ({ userType }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Update isMobile state based on window size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Clean up
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && isMobile) {
        const sidebar = document.getElementById('sidebar');
        const navbarMenu = document.getElementById('navbar-menu');
        
        if (sidebar && 
            !sidebar.contains(event.target as Node) && 
            navbarMenu && 
            !navbarMenu.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen, isMobile]);

  return (
    <div className="flex h-screen bg-dark-950 text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        userType={userType} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen}
        isMobile={isMobile}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar 
          user={user} 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        {/* Main Content Area */}
        <motion.main 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

export default DashboardLayout;