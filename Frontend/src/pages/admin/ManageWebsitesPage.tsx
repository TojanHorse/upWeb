import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MoreVertical,
  Eye,
  Check,
  X,
  Edit,
  Trash2,
  Globe,
  Server
} from 'lucide-react';
import { api } from '../../services/api';

interface Website {
  id: string;
  name: string;
  url: string;
  status: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  contributor?: {
    id: string;
    name: string;
    email: string;
  };
  healthStatus?: string;
  lastCheckTimestamp?: string;
  monitorCount?: number;
}

const ManageWebsitesPage = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingWebsite, setUpdatingWebsite] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalWebsites: 0,
    websitesPerPage: 10
  });
  
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchWebsites();
    
    // Add event listener to close action menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchWebsites = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/admin/websites?page=${page}&limit=${pagination.websitesPerPage}`);
      
      if (response.data.websites) {
        // Format the data for our state
        const formattedWebsites: Website[] = response.data.websites.map((website: any) => ({
          id: website._id || website.id,
          name: website.name || 'Unnamed Website',
          url: website.url,
          status: website.status || 'pending',
          description: website.description || '',
          category: website.category || 'Other',
          createdAt: website.createdAt,
          updatedAt: website.updatedAt,
          contributor: website.owner ? {
            id: website.owner._id || website.owner.id,
            name: website.owner.name,
            email: website.owner.email
          } : undefined,
          healthStatus: website.healthStatus || website.status === 'active' ? 'up' : 'unknown',
          lastCheckTimestamp: website.lastCheckTimestamp,
          monitorCount: website.monitorCount || 0
        }));
        
        setWebsites(formattedWebsites);
        
        // Update pagination
        setPagination({
          currentPage: page,
          totalPages: Math.ceil(response.data.totalCount / pagination.websitesPerPage),
          totalWebsites: response.data.totalCount,
          websitesPerPage: pagination.websitesPerPage
        });
      } else {
        setWebsites([]);
      }
    } catch (err: any) {
      console.error('Error fetching websites:', err);
      setError(err.response?.data?.error || 'Failed to load websites. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const changePage = (page: number) => {
    if (page > 0 && page <= pagination.totalPages) {
      fetchWebsites(page);
    }
  };

  // Filter websites based on search term and status
  const filteredWebsites = websites.filter((website) => {
    const matchesSearch = 
      website.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      website.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || website.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const getStatusBadge = (status: string, healthStatus?: string) => {
    if (status === 'pending') {
      return (
        <span className="badge badge-warning flex items-center">
          <Clock size={12} className="mr-1" /> Pending
        </span>
      );
    } else if (status === 'rejected') {
      return (
        <span className="badge badge-error flex items-center">
          <AlertTriangle size={12} className="mr-1" /> Rejected
        </span>
      );
    } else if (healthStatus === 'down') {
      return (
        <span className="badge badge-error flex items-center">
          <AlertTriangle size={12} className="mr-1" /> Down
        </span>
      );
    } else {
      return (
        <span className="badge badge-success flex items-center">
          <CheckCircle size={12} className="mr-1" /> Active
        </span>
      );
    }
  };

  const updateWebsiteStatus = async (websiteId: string, newStatus: string) => {
    try {
      setUpdatingWebsite(websiteId);
      setError(null);
      
      await api.put(`/admin/websites/${websiteId}/status`, { status: newStatus });
      
      // Update the website in our state
      setWebsites(prevWebsites => 
        prevWebsites.map(website => 
          website.id === websiteId ? { ...website, status: newStatus } : website
        )
      );
      
      // Show success message
      setSuccessMessage(`Website ${newStatus === 'active' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Close details modal if open
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }
      
    } catch (err: any) {
      console.error('Error updating website status:', err);
      setError(err.response?.data?.error || `Failed to update website status to ${newStatus}. Please try again.`);
    } finally {
      setUpdatingWebsite(null);
    }
  };
  
  const handleWebsiteAction = (website: Website, action: string) => {
    setShowActionMenu(null);
    
    switch(action) {
      case 'view':
        setSelectedWebsite(website);
        setShowDetailsModal(true);
        break;
      case 'approve':
        updateWebsiteStatus(website.id, 'active');
        break;
      case 'reject':
        updateWebsiteStatus(website.id, 'rejected');
        break;
      case 'delete':
        deleteWebsite(website.id);
        break;
      case 'check':
        triggerManualCheck(website.id);
        break;
      default:
        break;
    }
  };
  
  const deleteWebsite = async (websiteId: string) => {
    try {
      setUpdatingWebsite(websiteId);
      await api.delete(`/admin/websites/${websiteId}`);
      
      // Remove from state
      setWebsites(prevWebsites => prevWebsites.filter(website => website.id !== websiteId));
      
      // Show success message
      setSuccessMessage("Website deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err: any) {
      console.error('Error deleting website:', err);
      setError(err.response?.data?.error || 'Failed to delete website. Please try again.');
    } finally {
      setUpdatingWebsite(null);
    }
  };
  
  const triggerManualCheck = async (websiteId: string) => {
    try {
      setUpdatingWebsite(websiteId);
      await api.post(`/admin/websites/${websiteId}/check`);
      
      // Refresh website data
      fetchWebsites(pagination.currentPage);
      
      // Show success message
      setSuccessMessage("Manual check triggered successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err: any) {
      console.error('Error triggering check:', err);
      setError(err.response?.data?.error || 'Failed to trigger check. Please try again.');
    } finally {
      setUpdatingWebsite(null);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
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
          <h1 className="text-2xl font-bold">Manage Websites</h1>
          <p className="text-dark-400">Review and approve websites for monitoring</p>
        </div>
      </motion.div>
      
      {/* Success message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-success-900/30 border border-success-700 text-success-400 px-4 py-3 rounded-md flex items-start"
        >
          <CheckCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}
      
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
            placeholder="Search websites by name or URL"
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
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </motion.div>
      
      {/* Status summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="card bg-dark-900/30 flex items-center justify-between">
          <div>
            <p className="text-dark-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-success-400">
              {loading ? '...' : websites.filter(w => w.status === 'active').length}
            </p>
          </div>
          <div className="rounded-full p-3 bg-success-900/30">
            <CheckCircle className="h-6 w-6 text-success-400" />
          </div>
        </div>
        
        <div className="card bg-dark-900/30 flex items-center justify-between">
          <div>
            <p className="text-dark-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-warning-400">
              {loading ? '...' : websites.filter(w => w.status === 'pending').length}
            </p>
          </div>
          <div className="rounded-full p-3 bg-warning-900/30">
            <Clock className="h-6 w-6 text-warning-400" />
          </div>
        </div>
        
        <div className="card bg-dark-900/30 flex items-center justify-between">
          <div>
            <p className="text-dark-400 text-sm">Rejected</p>
            <p className="text-2xl font-bold text-error-400">
              {loading ? '...' : websites.filter(w => w.status === 'rejected').length}
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
      
      {/* Websites table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card bg-dark-900/30 p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800/50 text-left">
                <th className="px-6 py-3 text-xs font-medium">Website</th>
                <th className="px-6 py-3 text-xs font-medium">URL</th>
                <th className="px-6 py-3 text-xs font-medium">Status</th>
                <th className="px-6 py-3 text-xs font-medium">Contributor</th>
                <th className="px-6 py-3 text-xs font-medium">Added Date</th>
                <th className="px-6 py-3 text-xs font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && websites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-dark-400">
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                      <span className="ml-2">Loading websites...</span>
                    </div>
                  </td>
                </tr>
              ) : error && websites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-error-400">
                    {error}
                  </td>
                </tr>
              ) : filteredWebsites.length > 0 ? (
                filteredWebsites.map(website => (
                  <tr key={website.id} className="hover:bg-dark-800/30 border-t border-dark-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded bg-primary-900/30 flex items-center justify-center mr-3">
                          <span className="text-xs text-primary-400">{website.name?.charAt(0) || 'W'}</span>
                        </div>
                        <span className="font-medium">{website.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={website.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-primary-400 hover:text-primary-300"
                      >
                        {website.url}
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(website.status, website.healthStatus)}
                    </td>
                    <td className="px-6 py-4">
                      {website.contributor ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-secondary-900/30 flex items-center justify-center mr-2">
                            <span className="text-xs text-secondary-400">
                              {website.contributor.name?.charAt(0) || 'C'}
                            </span>
                          </div>
                          <span>{website.contributor.name}</span>
                        </div>
                      ) : (
                        <span className="text-dark-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-dark-400">
                      {new Date(website.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      {updatingWebsite === website.id ? (
                        <div className="animate-pulse text-dark-400">
                          Processing...
                        </div>
                      ) : (
                        <>
                          <button 
                            className="text-dark-400 hover:text-white"
                            onClick={() => setShowActionMenu(showActionMenu === website.id ? null : website.id)}
                          >
                            <MoreVertical size={16} />
                          </button>
                        
                          {showActionMenu === website.id && (
                            <div 
                              ref={actionMenuRef}
                              className="absolute z-10 right-6 mt-2 w-48 rounded-md shadow-lg bg-dark-800 ring-1 ring-dark-700"
                            >
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                <button
                                  onClick={() => handleWebsiteAction(website, 'view')}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-dark-700 flex items-center"
                                >
                                  <Eye size={14} className="mr-2" />
                                  View Details
                                </button>
                                
                                {website.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleWebsiteAction(website, 'approve')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-dark-700 flex items-center text-success-400"
                                    >
                                      <Check size={14} className="mr-2" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleWebsiteAction(website, 'reject')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-dark-700 flex items-center text-error-400"
                                    >
                                      <X size={14} className="mr-2" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                
                                {website.status === 'active' && (
                                  <button
                                    onClick={() => handleWebsiteAction(website, 'check')}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-dark-700 flex items-center"
                                  >
                                    <Server size={14} className="mr-2" />
                                    Trigger Check
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handleWebsiteAction(website, 'delete')}
                                  className="w-full text-left px-4 py-2 text-sm text-error-400 hover:bg-dark-700 flex items-center"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-dark-400">
                    No websites found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-dark-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-dark-400">
            Showing <span className="font-medium">{filteredWebsites.length}</span> of <span className="font-medium">{pagination.totalWebsites}</span> websites
          </div>
          
          {pagination.totalPages > 1 && (
            <div className="flex items-center space-x-1 mt-4 sm:mt-0">
              <button 
                className={`p-1 rounded hover:bg-dark-800 ${pagination.currentPage === 1 ? 'text-dark-500 cursor-not-allowed' : 'text-dark-400'}`}
                onClick={() => changePage(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                // Show pages around current page
                let page;
                if (pagination.totalPages <= 5) {
                  page = i + 1;
                } else if (pagination.currentPage <= 3) {
                  page = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  page = pagination.totalPages - 4 + i;
                } else {
                  page = pagination.currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => changePage(page)}
                    className={`px-3 py-1 rounded ${pagination.currentPage === page ? 'bg-primary-900/30 text-primary-400' : 'hover:bg-dark-800 text-dark-400'}`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button 
                className={`p-1 rounded hover:bg-dark-800 ${pagination.currentPage === pagination.totalPages ? 'text-dark-500 cursor-not-allowed' : 'text-dark-400'}`}
                onClick={() => changePage(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Website Details Modal */}
      {showDetailsModal && selectedWebsite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-900 rounded-lg shadow-xl max-w-2xl w-full overflow-hidden"
          >
            <div className="p-6 flex justify-between items-center border-b border-dark-800">
              <h3 className="text-lg font-medium">Website Details</h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{selectedWebsite.name}</h2>
                  <a 
                    href={selectedWebsite.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-400 flex items-center mt-1 hover:text-primary-300"
                  >
                    {selectedWebsite.url}
                    <ExternalLink size={14} className="ml-1" />
                  </a>
                </div>
                <div>
                  {getStatusBadge(selectedWebsite.status, selectedWebsite.healthStatus)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-1">Description</h4>
                  <p className="border border-dark-800 rounded-md p-3 bg-dark-800/30">
                    {selectedWebsite.description || 'No description provided'}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-1">Category</h4>
                  <p className="border border-dark-800 rounded-md p-3 bg-dark-800/30">
                    {selectedWebsite.category}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-1">Contributor</h4>
                  <div className="border border-dark-800 rounded-md p-3 bg-dark-800/30">
                    {selectedWebsite.contributor ? (
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-secondary-900/30 flex items-center justify-center mr-2">
                          <span className="text-xs text-secondary-400">
                            {selectedWebsite.contributor.name?.charAt(0) || 'C'}
                          </span>
                        </div>
                        <div>
                          <p>{selectedWebsite.contributor.name}</p>
                          <p className="text-xs text-dark-400">{selectedWebsite.contributor.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-dark-400">Unknown</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-1">Monitoring</h4>
                  <div className="border border-dark-800 rounded-md p-3 bg-dark-800/30">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Monitors:</span>
                      <span>{selectedWebsite.monitorCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Check:</span>
                      <span>{formatTimeAgo(selectedWebsite.lastCheckTimestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-1">Created</h4>
                  <p className="border border-dark-800 rounded-md p-3 bg-dark-800/30">
                    {formatDate(selectedWebsite.createdAt)}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-1">Last Updated</h4>
                  <p className="border border-dark-800 rounded-md p-3 bg-dark-800/30">
                    {formatDate(selectedWebsite.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-dark-800 flex justify-end gap-3">
              {selectedWebsite.status === 'pending' && (
                <>
                  <button 
                    onClick={() => updateWebsiteStatus(selectedWebsite.id, 'rejected')}
                    className="btn btn-outline-error"
                    disabled={updatingWebsite === selectedWebsite.id}
                  >
                    <X size={16} className="mr-2" />
                    Reject
                  </button>
                  <button 
                    onClick={() => updateWebsiteStatus(selectedWebsite.id, 'active')}
                    className="btn btn-success"
                    disabled={updatingWebsite === selectedWebsite.id}
                  >
                    <Check size={16} className="mr-2" />
                    Approve
                  </button>
                </>
              )}
              
              {selectedWebsite.status === 'active' && (
                <button 
                  onClick={() => triggerManualCheck(selectedWebsite.id)}
                  className="btn btn-primary"
                  disabled={updatingWebsite === selectedWebsite.id}
                >
                  <Server size={16} className="mr-2" />
                  Trigger Check
                </button>
              )}
              
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageWebsitesPage; 