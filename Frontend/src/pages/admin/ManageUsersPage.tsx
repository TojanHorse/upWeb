import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical, 
  CheckCircle, 
  AlertCircle, 
  User,
  Edit,
  Trash2,
  Shield,
  X,
  Lock,
  Mail,
  CheckSquare
} from 'lucide-react';
import { api } from '../../services/api';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  dateJoined: string;
  isEmailVerified: boolean;
}

const ManageUsersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    usersPerPage: 10
  });
  
  // Form state for adding a new user
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Fetch users data from API
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch users with pagination
      const userResponse = await api.get(`/admin/users?page=${page}&limit=${pagination.usersPerPage}`);
      const contributorResponse = await api.get(`/admin/contributors?page=${page}&limit=${pagination.usersPerPage}`);
      const adminResponse = await api.get(`/admin/admins?page=${page}&limit=${pagination.usersPerPage}`);
      
      // Combine and format user data
      const formattedUsers: UserData[] = [
        ...(userResponse.data.users || []).map((user: any) => ({
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: 'user',
          status: user.isEmailVerified ? 'active' : 'pending',
          dateJoined: user.createdAt,
          isEmailVerified: user.isEmailVerified
        })),
        ...(contributorResponse.data.contributors || []).map((contributor: any) => ({
          id: contributor._id || contributor.id,
          name: contributor.name,
          email: contributor.email,
          role: 'contributor',
          status: contributor.isEmailVerified ? 'active' : 'pending',
          dateJoined: contributor.createdAt,
          isEmailVerified: contributor.isEmailVerified
        })),
        ...(adminResponse.data.admins || []).map((admin: any) => ({
          id: admin._id || admin.id,
          name: admin.name,
          email: admin.email,
          role: 'admin',
          status: 'active', // Admins are always active
          dateJoined: admin.createdAt,
          isEmailVerified: true
        }))
      ];
      
      // Update pagination information
      setPagination({
        currentPage: page,
        totalPages: Math.ceil(userResponse.data.totalCount / pagination.usersPerPage),
        totalUsers: userResponse.data.totalCount + contributorResponse.data.totalCount + adminResponse.data.totalCount,
        usersPerPage: pagination.usersPerPage
      });
      
      setUsers(formattedUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const changePage = (page: number) => {
    if (page > 0 && page <= pagination.totalPages) {
      fetchUsers(page);
    }
  };
  
  useEffect(() => {
    fetchUsers();
    
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

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value);
  };

  const handleAddUser = () => {
    setShowAddModal(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newUser.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!newUser.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(newUser.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!newUser.password) {
      errors.password = 'Password is required';
    } else if (newUser.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (newUser.role === 'admin') {
        response = await api.post('/admin/create', newUser);
      } else if (newUser.role === 'contributor') {
        response = await api.post('/admin/create-contributor', newUser);
      } else {
        response = await api.post('/admin/create-user', newUser);
      }
      
      // Clear form and close modal
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setShowAddModal(false);
      
      // Show success message
      setSuccessMessage(`${newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)} created successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh user list
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.error || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUserAction = (userId: string, action: string) => {
    setShowActionMenu(null);
    setProcessingUser(userId);
    
    switch (action) {
      case 'edit':
        // Implement edit user functionality
        console.log('Edit user', userId);
        break;
      case 'delete':
        deleteUser(userId);
        break;
      case 'verify':
        verifyUser(userId);
        break;
      case 'promote':
        promoteUser(userId);
        break;
      default:
        break;
    }
  };
  
  const deleteUser = async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      
      // Remove user from state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      // Show success message
      setSuccessMessage('User deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.error || 'Failed to delete user. Please try again.');
    } finally {
      setProcessingUser(null);
    }
  };
  
  const verifyUser = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/verify`);
      
      // Update user in state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, isEmailVerified: true, status: 'active' } 
            : user
        )
      );
      
      // Show success message
      setSuccessMessage('User verified successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error verifying user:', err);
      setError(err.response?.data?.error || 'Failed to verify user. Please try again.');
    } finally {
      setProcessingUser(null);
    }
  };
  
  const promoteUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const newRole = user.role === 'user' ? 'contributor' : 'admin';
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      
      // Update user in state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role: newRole } 
            : user
        )
      );
      
      // Show success message
      setSuccessMessage(`User promoted to ${newRole} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error promoting user:', err);
      setError(err.response?.data?.error || 'Failed to promote user. Please try again.');
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold">Manage Users</h1>
            <p className="text-dark-400">View and manage user accounts</p>
          </div>
          
          <button 
            className="btn btn-primary mt-4 md:mt-0 flex items-center justify-center"
            onClick={handleAddUser}
          >
            <UserPlus size={16} className="mr-2" />
            Add User
          </button>
        </motion.div>
        
        {/* Success message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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
              placeholder="Search users by name or email"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className="sm:w-48">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Filter size={18} className="text-dark-400" />
              </div>
              <select
                className="select pl-10 appearance-none"
                value={selectedRole}
                onChange={handleRoleFilter}
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="contributor">Contributor</option>
                <option value="admin">Admin</option>
              </select>
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
            <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
        
        {/* Users table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-dark-900/30 p-0 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-dark-800/50 text-left">
                  <th className="px-6 py-3 text-xs font-medium">User</th>
                  <th className="px-6 py-3 text-xs font-medium">Role</th>
                  <th className="px-6 py-3 text-xs font-medium">Status</th>
                  <th className="px-6 py-3 text-xs font-medium">Date Joined</th>
                  <th className="px-6 py-3 text-xs font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-dark-400">
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                        <span className="ml-2">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-dark-800/30 border-t border-dark-800">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-primary-900/30 rounded-full flex items-center justify-center mr-3">
                            <User size={18} className="text-primary-400" />
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-dark-400 text-sm">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-error-900/30 text-error-400'
                            : user.role === 'contributor'
                              ? 'bg-secondary-900/30 text-secondary-400'
                              : 'bg-primary-900/30 text-primary-400'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {user.status === 'active' ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-success-500 mr-2"></div>
                              <span>Active</span>
                            </>
                          ) : user.status === 'pending' ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-warning-500 mr-2"></div>
                              <span>Pending</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-error-500 mr-2"></div>
                              <span>Inactive</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-dark-400">
                        {new Date(user.dateJoined).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        {processingUser === user.id ? (
                          <div className="animate-pulse text-dark-400">
                            Processing...
                          </div>
                        ) : (
                          <>
                            <button 
                              className="text-dark-400 hover:text-white"
                              onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                            >
                              <MoreVertical size={16} />
                            </button>
                            
                            {showActionMenu === user.id && (
                              <div 
                                ref={actionMenuRef}
                                className="absolute z-10 right-6 mt-2 w-48 rounded-md shadow-lg bg-dark-800 ring-1 ring-dark-700"
                              >
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                  <button
                                    onClick={() => handleUserAction(user.id, 'edit')}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-dark-700 flex items-center"
                                  >
                                    <Edit size={14} className="mr-2" />
                                    Edit User
                                  </button>
                                  
                                  {!user.isEmailVerified && (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'verify')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-dark-700 flex items-center"
                                    >
                                      <CheckSquare size={14} className="mr-2" />
                                      Verify Email
                                    </button>
                                  )}
                                  
                                  {user.role !== 'admin' && (
                                    <button
                                      onClick={() => handleUserAction(user.id, 'promote')}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-dark-700 flex items-center"
                                    >
                                      <Shield size={14} className="mr-2" />
                                      Promote to {user.role === 'user' ? 'Contributor' : 'Admin'}
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => handleUserAction(user.id, 'delete')}
                                    className="w-full text-left px-4 py-2 text-sm text-error-400 hover:bg-dark-700 flex items-center"
                                  >
                                    <Trash2 size={14} className="mr-2" />
                                    Delete User
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
                    <td colSpan={5} className="px-6 py-4 text-center text-dark-400">
                      No users found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 bg-dark-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-dark-400">
              Showing <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{pagination.totalUsers}</span> users
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
                
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => changePage(page)}
                    className={`px-3 py-1 rounded ${pagination.currentPage === page ? 'bg-primary-900/30 text-primary-400' : 'hover:bg-dark-800 text-dark-400'}`}
                  >
                    {page}
                  </button>
                ))}
                
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
      </div>
      
      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-900 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Add New User</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User size={16} className="text-dark-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={newUser.name}
                      onChange={handleInputChange}
                      className={`input pl-10 w-full ${formErrors.name ? 'border-error-500' : ''}`}
                      placeholder="Enter full name"
                    />
                  </div>
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-error-400">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail size={16} className="text-dark-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={newUser.email}
                      onChange={handleInputChange}
                      className={`input pl-10 w-full ${formErrors.email ? 'border-error-500' : ''}`}
                      placeholder="Enter email address"
                    />
                  </div>
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-error-400">{formErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock size={16} className="text-dark-400" />
                    </div>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={newUser.password}
                      onChange={handleInputChange}
                      className={`input pl-10 w-full ${formErrors.password ? 'border-error-500' : ''}`}
                      placeholder="Enter password"
                    />
                  </div>
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-error-400">{formErrors.password}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium mb-1">
                    User Role
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Shield size={16} className="text-dark-400" />
                    </div>
                    <select
                      id="role"
                      name="role"
                      value={newUser.role}
                      onChange={handleInputChange}
                      className="select pl-10 w-full appearance-none"
                    >
                      <option value="user">Regular User</option>
                      <option value="contributor">Contributor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default ManageUsersPage; 