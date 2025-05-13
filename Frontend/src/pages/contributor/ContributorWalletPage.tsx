import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, BarChart4, Clock, ChevronDown, ArrowDown, ArrowUp } from 'lucide-react';
import { walletService } from '../../services/api';

const ContributorWalletPage = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await walletService.getContributorWallet();
        
        if (response.data) {
          setWallet(response.data.wallet);
          setTransactions(response.data.transactions || []);
        }
      } catch (err) {
        console.error('Error fetching wallet data:', err);
        setError('Failed to load wallet data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Contributor Earnings</h1>
          <p className="text-dark-400">Track your earnings from website monitoring</p>
        </div>
      </motion.div>
      
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 card bg-dark-900/30"
        >
          <div className="flex items-center mb-4">
            <div className="rounded-full p-3 bg-primary-900/30 mr-3">
              <Wallet className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Current Balance</h3>
              <p className="text-dark-400 text-sm">Available for withdrawal</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-dark-800">
            <div>
              <span className="text-4xl font-bold">
                {loading ? '...' : `$${wallet?.balance.toFixed(2) || '0.00'}`}
              </span>
              {wallet?.pendingAmount > 0 && (
                <div className="mt-2 text-sm text-dark-400 flex items-center">
                  <Clock size={14} className="mr-1.5" />
                  <span>${wallet?.pendingAmount.toFixed(2)} pending</span>
                </div>
              )}
            </div>
            
            <button className="btn btn-primary mt-4 md:mt-0">
              Withdraw Earnings
            </button>
          </div>
          
          <div className="mt-4 text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-dark-400">Last Withdrawal</span>
              <span>{wallet?.lastWithdrawal ? new Date(wallet.lastWithdrawal).toLocaleDateString() : 'No withdrawals yet'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-dark-400">Payment Method</span>
              <span>{wallet?.paymentMethod || 'Not set'}</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-dark-900/30"
        >
          <div className="flex items-center mb-4">
            <div className="rounded-full p-3 bg-secondary-900/30 mr-3">
              <BarChart4 className="h-6 w-6 text-secondary-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Earnings Stats</h3>
              <p className="text-dark-400 text-sm">Current period</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-dark-800/50">
              <div className="flex justify-between mb-1">
                <span className="text-dark-400 text-sm">This Month</span>
                <span className="text-sm font-medium">${loading ? '...' : wallet?.currentMonthEarnings.toFixed(2) || '0.00'}</span>
              </div>
              <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                  style={{ width: `${Math.min(wallet?.currentMonthProgress || 0, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-between p-3 rounded-md bg-dark-800/50">
              <span className="text-dark-400 text-sm">Last Month</span>
              <span className="text-sm font-medium">${loading ? '...' : wallet?.lastMonthEarnings.toFixed(2) || '0.00'}</span>
            </div>
            
            <div className="flex justify-between p-3 rounded-md bg-dark-800/50">
              <span className="text-dark-400 text-sm">Total Earnings</span>
              <span className="text-sm font-medium">${loading ? '...' : wallet?.totalEarnings.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-dark-900/30"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Transaction History</h2>
          <button className="btn btn-outline py-1 px-3 flex items-center text-sm">
            Filter <ChevronDown size={16} className="ml-1" />
          </button>
        </div>
        
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center p-3 rounded-md bg-dark-800/30">
                <div className="w-10 h-10 rounded-full bg-dark-800 mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-dark-800 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-dark-800 rounded w-1/3"></div>
                </div>
                <div className="h-4 bg-dark-800 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction: any) => (
              <div key={transaction.id} className="flex items-center p-3 rounded-md hover:bg-dark-800/30">
                <div className={`w-10 h-10 rounded-full ${
                  transaction.type === 'earning' ? 'bg-success-900/30' : 'bg-primary-900/30'
                } flex items-center justify-center mr-3`}>
                  {transaction.type === 'earning' ? (
                    <ArrowDown size={18} className="text-success-400" />
                  ) : (
                    <ArrowUp size={18} className="text-primary-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium">
                    {transaction.type === 'earning' ? 'Monitoring Earnings' : 'Withdrawal'}
                  </p>
                  <p className="text-dark-400 text-sm">
                    {new Date(transaction.date).toLocaleString()}
                  </p>
                </div>
                
                <div className={`font-medium ${
                  transaction.type === 'earning' ? 'text-success-400' : 'text-primary-400'
                }`}>
                  {transaction.type === 'earning' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-dark-400">No transactions found</p>
          </div>
        )}
      </motion.div>
      
      {/* Error message */}
      {error && (
        <div className="p-4 bg-error-900/30 border border-error-800 rounded-md text-error-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ContributorWalletPage; 