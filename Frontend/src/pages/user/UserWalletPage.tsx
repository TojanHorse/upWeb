import React from 'react';

const UserWalletPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Wallet</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid gap-6">
          {/* Balance Section */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Current Balance</h2>
            <div className="text-3xl font-bold text-blue-600">$0.00</div>
          </div>

          {/* Transaction History */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
            <div className="space-y-4">
              <div className="text-gray-500 text-center py-8">
                No transactions yet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserWalletPage;