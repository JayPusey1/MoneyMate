import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import './css/Transactions.css';
import { db, auth } from '../../firebase'; // Make sure your db and auth are correctly initialized
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

// Fetch transactions from Firebase for the current user
const fetchTransactions = async () => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log("No user is signed in");
      return [];
    }
    
    const userId = currentUser.uid;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const transactionsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(transactionsData); // Log to check the data
    return transactionsData;
  } catch (err) {
    console.error("Error fetching transactions: ", err);
    return [];
  }
};

// Generate mock data with random dates from the last 30 days
const generateMockData = () => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.log("No user is signed in");
    return [];
  }
  
  const userId = currentUser.uid;
  const expenseCategories = [
    'Food', 'Housing', 'Utilities', 'Transport', 'Entertainment', 
    'Shopping', 'Healthcare', 'Subscriptions', 'Other'
  ];
  const incomeCategories = ['Salary', 'Investments', 'Gift'];
  const mockData = [];
  
  // Get current date and date 90 days ago
  const currentDate = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(currentDate.getDate() - 90);
  
  for (let i = 0; i < 150; i++) {
    // Randomly decide if this is income or expense
    const type = Math.random() > 0.5 ? 'expense' : 'income';
    
    // Choose appropriate category based on type
    const category = type === 'income' 
      ? incomeCategories[Math.floor(Math.random() * incomeCategories.length)]
      : expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    
    // Generate random date between now and 30 days ago
    const randomDate = new Date(
      thirtyDaysAgo.getTime() + Math.random() * (currentDate.getTime() - thirtyDaysAgo.getTime())
    );
    const formattedDate = randomDate.toISOString().split('T')[0];
    
    mockData.push({
      description: `Mock ${type === 'income' ? 'Income' : 'Expense'} ${i + 1}`,
      amount: (Math.random() * 500).toFixed(2), // Random amount up to 500
      type,
      category,
      date: formattedDate,
      userId: userId, // Add the userId to each transaction
    });
  }
  
  return mockData;
};

// Add mock data to the database
const addMockDataToFirebase = async () => {
  const mockData = generateMockData();
  
  try {
    for (const data of mockData) {
      await addDoc(collection(db, 'transactions'), data);
    }
    console.log("Mock data added successfully!");
    // Return the added data so we can update the UI
    return mockData;
  } catch (err) {
    console.error("Error adding mock data: ", err);
    return [];
  }
};

// Delete a transaction from Firebase
const deleteTransactionFromFirebase = async (id) => {
  try {
    await deleteDoc(doc(db, 'transactions', id));
    return { success: true };
  } catch (err) {
    console.error("Error deleting transaction: ", err);
    return { success: false, error: err.message };
  }
};

// Delete all transactions from Firebase for the current user
const deleteAllTransactionsFromFirebase = async () => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return { success: false, error: "No user is signed in" };
    }
    
    const userId = currentUser.uid;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Create an array of promises for each deletion operation
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    return { success: true };
  } catch (err) {
    console.error("Error deleting all transactions: ", err);
    return { success: false, error: err.message };
  }
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Calculate total balance
  const calculateTotal = () => {
    return transactions.reduce((total, transaction) => {
      const amount = parseFloat(transaction.amount) || 0;
      return total + (transaction.type === 'income' ? amount : -amount);
    }, 0);
  };

  // Fetch transactions on component mount and whenever the auth state changes
  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      
      // Check if a user is logged in
      if (!auth.currentUser) {
        setError("Please log in to view your transactions");
        setLoading(false);
        return;
      }
      
      const data = await fetchTransactions();
      setTransactions(data);
      setLoading(false);
    };
    
    // Set up an auth state change listener
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        loadTransactions();
      } else {
        setTransactions([]);
        setError("Please log in to view your transactions");
      }
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);

  // Sort transactions based on current sort field and direction
  const getSortedTransactions = () => {
    return [...transactions].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle numeric values like amount
      if (sortField === 'amount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      // Handle date sorting
      if (sortField === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // For strings (like description, category, type), convert to lowercase for case-insensitive sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };
  
  // Get current transactions for pagination
  const indexOfLastTransaction = currentPage * itemsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - itemsPerPage;
  const currentTransactions = getSortedTransactions().slice(indexOfFirstTransaction, indexOfLastTransaction);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Toggle sort direction
  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If sorting by a new field, set it and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If changing type, update category to match the type
    if (name === 'type') {
      const defaultCategory = value === 'income' ? 'Salary' : 'Food';
      setNewTransaction({
        ...newTransaction,
        type: value,
        category: defaultCategory,
      });
    } else {
      setNewTransaction({
        ...newTransaction,
        [name]: value,
      });
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();

    if (!newTransaction.description || !newTransaction.amount || !newTransaction.date) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please log in to add transactions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        description: newTransaction.description,
        amount,
        type: newTransaction.type,
        category: newTransaction.category,
        date: newTransaction.date,
        userId: currentUser.uid, 
      });

      setSuccess('Transaction added successfully!');

      // Add the new transaction to the state to update the UI
      setTransactions((prevTransactions) => [
        {
          id: docRef.id,
          ...newTransaction,
          amount,
          userId: currentUser.uid,
        },
        ...prevTransactions, 
      ]);

      // Clear form fields
      setNewTransaction({
        description: '',
        amount: '',
        type: 'expense',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    setShowDeleteConfirm(id); // Show delete confirmation
  };

  const onConfirmDelete = async (id) => {
    setLoading(true);
    setShowDeleteConfirm(null); // Hide confirmation after clicking 'Yes, Delete'

    try {
      const result = await deleteTransactionFromFirebase(id);

      if (result.success) {
        setSuccess('Transaction deleted successfully!');

        // Remove the deleted transaction from the state
        setTransactions((prevTransactions) =>
          prevTransactions.filter((transaction) => transaction.id !== id)
        );

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError('Failed to delete transaction. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteAllTransactions = () => {
    setShowDeleteAllConfirm(true);
  };
  
  const onConfirmDeleteAll = async () => {
    setLoading(true);
    setShowDeleteAllConfirm(false);
    
    try {
      const result = await deleteAllTransactionsFromFirebase();
      
      if (result.success) {
        setSuccess('All transactions deleted successfully!');
        
        // Clear the transactions state
        setTransactions([]);
        
        // Reset pagination to first page
        setCurrentPage(1);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError('Failed to delete all transactions. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const onCancelDeleteAll = () => {
    setShowDeleteAllConfirm(false);
  };

  const onCancelDelete = () => {
    setShowDeleteConfirm(null); // Hide confirmation if canceled
  };
  
  const handleAddMockData = async () => {
    setLoading(true);
    try {
      const mockData = await addMockDataToFirebase();
      if (mockData.length > 0) {
        // Get fresh data from the database to ensure consistency
        const updatedData = await fetchTransactions();
        setTransactions(updatedData);
        setSuccess('Mock data added successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError('Failed to add mock data.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Total number of pages for pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  return (
    <div className="space-y-4">
      {/* User authentication status */}
      {!auth.currentUser && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p>Please log in to view and manage your transactions.</p>
        </div>
      )}
      
      {/* Alert messages */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>{success}</p>
        </div>
      )}
      <h1>Transactions</h1>
      
      {/* Page Description */}
      <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Track Your Financial Activity</h2>
        <p className="text-blue-700">
          This page allows you to manage your income and expenses. Add new transactions, view your previous transactions, 
          and track your overall financial balance. You can sort by different categories, filter your transactions, 
          and get a quick overview of your financial health at a glance.
        </p>
      </div>

      {/* Bank Connect Button - Not yet implemented */}
      
      {/* Add New Transaction Form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Transaction</h2>
        <form onSubmit={handleAddTransaction}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                name="date"
                className="w-full p-2 border rounded"
                value={newTransaction.date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                name="description"
                className="w-full p-2 border rounded"
                value={newTransaction.description}
                onChange={handleInputChange}
                placeholder="e.g., Food Shopping"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                className="w-full p-2 border rounded"
                value={newTransaction.amount}
                onChange={handleInputChange}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <button
                type="button"
                onClick={() =>
                  setNewTransaction((prev) => ({
                    ...prev,
                    type: prev.type === 'income' ? 'expense' : 'income',
                    category: prev.type === 'income' ? 'Food' : 'Salary', // Set default category based on new type
                  }))
                }
                className={`w-full p-2 border rounded ${newTransaction.type === 'expense' ? 'bg-red-100 text-red-800 ' : 'bg-green-100 text-green-800'}`}
              >
                {newTransaction.type === 'income' ? 'Income' : 'Expense'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                className="w-full p-2 border rounded"
                value={newTransaction.category}
                onChange={handleInputChange}
              >
                {newTransaction.type === 'expense' ? (
                  <>
                    <option value="Food">Food</option>
                    <option value="Housing">Housing</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Transport">Transport</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Salary">Salary</option>
                    <option value="Investments">Investments</option>
                    <option value="Gift">Gift</option>
                  </>
                )}
              </select>
              {newTransaction.category === 'Other' && (
                <input
                  type="text"
                  name="customCategory"
                  value={newTransaction.customCategory}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded mt-2"
                  placeholder="Enter custom category"
                />
              )}
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            disabled={loading || !auth.currentUser}
          >
            <Plus className="mr-1" size={16} />
            {loading ? 'Adding...' : 'Add Transaction'}
          </button>
        </form>
      </div>

      {/* Transaction History */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
        
        {/* Pagination and display options */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show</span>
            <select 
              className="border rounded px-2 py-1 text-sm"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // Reset to first page when changing items per page
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">entries</span>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`flex items-center px-3 py-1 border rounded ${
                currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </button>
            <button 
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`flex items-center px-3 py-1 border rounded ${
                currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-500 hover:bg-blue-50'
              }`}
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Date
                        {sortField === 'date' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center">
                        Description
                        {sortField === 'description' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center">
                        Category
                        {sortField === 'category' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center">
                        Type
                        {sortField === 'type' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center">
                        Amount
                        {sortField === 'amount' && (
                          sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{transaction.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{transaction.category}</td>
                      <td className="px-6 py-4 text-sm">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-semibold 
                            ${transaction.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {transaction.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        £{parseFloat(transaction.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        {/* Delete confirmation popup */}
                        {showDeleteConfirm === transaction.id && (
                          <div className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded p-4 mt-2 right-20">
                            <p className="text-sm text-gray-600 mb-2">Are you sure you want to delete this transaction?</p>
                            <div className="flex justify-end space-x-2">
                              <button 
                                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                onClick={onCancelDelete}
                              >
                                Cancel
                              </button>
                              <button 
                                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                onClick={() => onConfirmDelete(transaction.id)}
                              >
                                Yes, Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Total balance */}
              <div className="mt-4 p-4 border-t-2 flex justify-end">
                <div className="text-lg font-bold">
                  <span>Total Balance: </span>
                  <span className={calculateTotal() >= 0 ? 'text-green-600' : 'text-red-600'}>
                    £{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Pagination info */}
              <div className="mt-4 text-sm text-gray-600">
                Showing {indexOfFirstTransaction + 1} to {Math.min(indexOfLastTransaction, transactions.length)} of {transactions.length} entries
              </div>
            </>
          ) : (
            <p>{auth.currentUser ? "No transactions available." : "Please log in to view your transactions."}</p>
          )}
        </div>
      </div>

      {/* Mock data and Delete All buttons */}
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handleAddMockData}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={loading || !auth.currentUser}
        >
          {loading ? 'Processing...' : 'Add Mock Data to Your Account'}
        </button>
        
        <button
          onClick={handleDeleteAllTransactions}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={loading || transactions.length === 0 || !auth.currentUser}
        >
          Delete All Transactions
        </button>

        {/* Delete All confirmation popup */}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
              <h3 className="text-lg font-bold mb-4">Confirm Delete All</h3>
              <p className="mb-6">Are you sure you want to delete all transactions? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  onClick={onCancelDeleteAll}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={onConfirmDeleteAll}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;