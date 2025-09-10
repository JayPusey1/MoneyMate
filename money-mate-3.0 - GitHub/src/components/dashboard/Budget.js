import React, { useState } from 'react';
import { 
  BarChart, PieChart, AreaChart, 
  Bar, Pie, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { Plus, BarChart as Trash2, ArrowUpDown, ArrowDown, ArrowUp, Edit, Check, X } from 'lucide-react';
import './css/Budget.css';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase'; 
import { useEffect } from 'react';

const Budget = ({ transactions }) => {
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [budgetsFromDB, setBudgetsFromDB] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [chartType, setChartType] = useState('bar'); 
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editSpent, setEditSpent] = useState('');
  const [pieChartData, setPieChartData] = useState([]);
  const [pieChartLoading, setPieChartLoading] = useState(true);

  // Sample data to fall back on if no budget data is available
  const EXAMPLE_DATA = [
    { name: 'Example', value: 1200 },
    { name: 'Example', value: 500 },
    { name: 'Example', value: 200 },
    { name: 'Example', value: 300 }
  ];

  useEffect(() => {
    // Set up an auth state change listener
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchBudgets();
      } else {
        setBudgetsFromDB({});
        setError("Please log in to view and manage your budgets");
      }
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);
  
  // Updated effect to transform budget data for pie chart
  useEffect(() => {
    if (Object.keys(budgetsFromDB).length > 0) {
      const chartData = Object.entries(budgetsFromDB)
        .map(([_, data]) => {
          const amount = parseFloat(data.amount);
          if (!isNaN(amount) && amount > 0) {
            return {
              name: data.category || data.name || 'Unnamed',
              value: amount
            };
          }
          return null;
        })
        .filter(Boolean); // Remove null entries
      
      if (chartData.length > 0) {
        setPieChartData(chartData);
      } else {
        setPieChartData(EXAMPLE_DATA);
      }
    } else {
      setPieChartData(EXAMPLE_DATA);
    }
    
    setPieChartLoading(false);
  }, [budgetsFromDB]);
  
  const fetchBudgets = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log("No user is signed in");
        setPieChartLoading(false);
        return;
      }
      
      const userId = currentUser.uid;
      console.log("Fetching budgets for user:", userId);
      
      const q = query(
        collection(db, 'budgets'),
        where('userId', '==', userId)
      );
      
      const budgetSnapshot = await getDocs(q);
      
      if (budgetSnapshot.empty) {
        console.log("No budget data found for this user");
      } else {
        console.log(`Found ${budgetSnapshot.size} budget documents for this user`);
      }
      
      const budgetData = {};
      budgetSnapshot.forEach(doc => {
        console.log(`Adding document ${doc.id}:`, doc.data());
        budgetData[doc.id] = { ...doc.data(), id: doc.id };
      });
      
      console.log("Setting budgetsFromDB with:", budgetData);
      setBudgetsFromDB(budgetData);
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load budgets. Please refresh the page.');
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    
    if (!newBudgetCategory || !newBudgetAmount) {
      setError('Please enter both category and amount');
      return;
    }
    
    const amount = parseFloat(newBudgetAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please log in to add budgets');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Instead of using the updateBudget prop, implement budget creation here
      // to ensure userId is added
      const budgetRef = collection(db, 'budgets');
      
      await addDoc(budgetRef, {
        category: newBudgetCategory,
        amount: amount,
        userId: currentUser.uid,
        createdAt: new Date()
      });
      
      setSuccess('Budget updated successfully!');
      setNewBudgetCategory('');
      setNewBudgetAmount('');
      
      // Refresh budgets
      fetchBudgets();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error adding budget:', err);
      setError('Failed to update budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!budgetId) return;
    
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please log in to delete budgets');
      return;
    }
    
    setDeletingId(budgetId);
    try {
      // Get the budget document first to verify it belongs to the current user
      const budgetDoc = budgetsFromDB[budgetId];
      
      if (budgetDoc && budgetDoc.userId === currentUser.uid) {
        await deleteDoc(doc(db, 'budgets', budgetId));
        setSuccess('Budget deleted successfully!');
        
        // Refresh budgets
        fetchBudgets();
      } else {
        setError("You don't have permission to delete this budget.");
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError('Failed to delete budget. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };
  
  // Function to start editing a budget item
  const handleEditBudget = (id, budget, spent) => {
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please log in to edit budgets');
      return;
    }
    
    // Verify the budget belongs to the current user
    const budgetDoc = budgetsFromDB[id];
    if (budgetDoc && budgetDoc.userId === currentUser.uid) {
      setEditingId(id);
      setEditAmount(budget.toString());
      setEditSpent(spent.toString());
    } else {
      setError("You don't have permission to edit this budget.");
    }
  };
  
  // Function to save edited budget
  const handleSaveEdit = async (id) => {
    const budgetAmount = parseFloat(editAmount);
    const spentAmount = parseFloat(editSpent);
    
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
      setError('Budget amount must be a positive number');
      return;
    }
    
    if (isNaN(spentAmount) || spentAmount < 0) {
      setError('Spent amount must be a valid positive number');
      return;
    }
    
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Please log in to update budgets');
      return;
    }
    
    try {
      // Verify the budget belongs to the current user
      const budgetDoc = budgetsFromDB[id];
      
      if (budgetDoc && budgetDoc.userId === currentUser.uid) {
        const budgetRef = doc(db, 'budgets', id);
        await updateDoc(budgetRef, {
          amount: budgetAmount,
          spent: spentAmount,
          updatedAt: new Date()
        });
        
        setSuccess('Budget updated successfully!');
        setEditingId(null);
        
        // Refresh budgets
        fetchBudgets();
      } else {
        setError("You don't have permission to update this budget.");
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating budget:', err);
      setError('Failed to update budget. Please try again.');
    }
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditSpent('');
  };

  // Filter transactions to only include those from the current user
  const getCurrentUserTransactions = () => {
    if (!auth.currentUser) return [];
    
    return Array.isArray(transactions) 
      ? transactions.filter(t => t.userId === auth.currentUser.uid)
      : [];
  };

  // Calculate actual spending for each budget category
  const categorySpending = getCurrentUserTransactions()
    .filter(t => t.type === 'expense')
    .reduce((acc, transaction) => {
      const category = transaction.category?.toLowerCase() || 'other';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += parseFloat(transaction.amount) || 0;
      return acc;
    }, {});

  // Prepare data for bar chart comparison
  const comparisonData = Object.entries(budgetsFromDB).map(([id, data]) => {
    // Use the same category field that we use for the pie chart
    const categoryName = data.category || data.name;
    const amount = parseFloat(data.amount);
    
    // Check if there's a manually entered spent amount
    let spent;
    if (data.spent !== undefined) {
      spent = parseFloat(data.spent);
    } else {
      // Fall back to calculated spending from transactions
      spent = categorySpending[categoryName?.toLowerCase()] || 0;
    }
    
    return {
      category: categoryName,
      budget: amount,
      actual: spent
    };
  }).filter(item => item.category && !isNaN(item.budget));
  
  // Function to handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    
    // If already sorting by this key, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };
  
  // Sort the budget data based on current sort configuration
  const getSortedBudgetData = () => {
    const budgetEntries = Object.entries(budgetsFromDB);
    
    if (!sortConfig.key) {
      return budgetEntries;
    }
    
    return [...budgetEntries].sort((a, b) => {
      const dataA = a[1];
      const dataB = b[1];
      
      // Determine values to compare based on sort key
      let valueA, valueB;
      
      if (sortConfig.key === 'category') {
        valueA = (dataA.category || dataA.name || '').toLowerCase();
        valueB = (dataB.category || dataB.name || '').toLowerCase();
      } else if (sortConfig.key === 'budget') {
        valueA = parseFloat(dataA.amount) || 0;
        valueB = parseFloat(dataB.amount) || 0;
      } else if (sortConfig.key === 'spent') {
        // Use manually entered spent amount if available
        if (dataA.spent !== undefined) {
          valueA = parseFloat(dataA.spent) || 0;
        } else {
          const categoryA = (dataA.category || dataA.name || '').toLowerCase();
          valueA = categorySpending[categoryA] || 0;
        }
        
        if (dataB.spent !== undefined) {
          valueB = parseFloat(dataB.spent) || 0;
        } else {
          const categoryB = (dataB.category || dataB.name || '').toLowerCase();
          valueB = categorySpending[categoryB] || 0;
        }
      } else if (sortConfig.key === 'percentage') {
        let spentA, spentB;
        
        if (dataA.spent !== undefined) {
          spentA = parseFloat(dataA.spent) || 0;
        } else {
          const categoryA = (dataA.category || dataA.name || '').toLowerCase();
          spentA = categorySpending[categoryA] || 0;
        }
        
        if (dataB.spent !== undefined) {
          spentB = parseFloat(dataB.spent) || 0;
        } else {
          const categoryB = (dataB.category || dataB.name || '').toLowerCase();
          spentB = categorySpending[categoryB] || 0;
        }
        
        const budgetA = parseFloat(dataA.amount) || 1; // Avoid division by zero
        const budgetB = parseFloat(dataB.amount) || 1;
        valueA = (spentA / budgetA) * 100;
        valueB = (spentB / budgetB) * 100;
      } else {
        return 0;
      }
      
      // Handle the direction
      if (sortConfig.direction === 'ascending') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });
  };
  
  // Get sorted data
  const sortedBudgetData = getSortedBudgetData();
  
  // Calculate totals for the footer row
  const budgetTotal = Object.values(budgetsFromDB).reduce((total, data) => {
    return total + (parseFloat(data.amount) || 0);
  }, 0);
  
  const spentTotal = Object.values(budgetsFromDB).reduce((total, data) => {
    if (data.spent !== undefined) {
      return total + (parseFloat(data.spent) || 0);
    } else {
      const categoryName = (data.category || data.name || '').toLowerCase();
      return total + (categorySpending[categoryName] || 0);
    }
  }, 0);
  
  const percentageTotal = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;

  // Extended color palette with 20 distinct colors for better variety
  const COLORS = [
    '#FF6347', '#4682B4', '#32CD32', '#FFD700', '#8A2BE2', '#FF4500', 
    '#1E90FF', '#FF1493', '#20B2AA', '#FFA500', '#9370DB', '#00CED1',
    '#FF69B4', '#00FA9A', '#BA55D3', '#F08080', '#4169E1', '#00FF7F',
    '#FF8C00', '#6A5ACD', '#2E8B57', '#9932CC', '#FF00FF', '#00BFFF',
    '#7B68EE', '#3CB371', '#FFC0CB', '#8FBC8F', '#483D8B', '#7FFF00'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* User authentication status */}
      {!auth.currentUser && (
        <div className="lg:col-span-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p>Please log in to view and manage your budgets.</p>
        </div>
      )}
      
      {/* Alert messages */}
      {error && (
        <div className="lg:col-span-2 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="lg:col-span-2 bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>{success}</p>
        </div>
      )}
      
      {/* Budget Allocation Pie Chart */}
      <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Set budgets to track your spending</h2>
        <p className="text-blue-700">
          This page allows you to take control of your finances by setting and managing monthly budgets across various categories. 
          By allocating budgets to different categories, you can monitor your spending habits and then make informed decisions to 
          stay financially on track. This feature is designed to promote mindful spending, reduce overspending, and support your long-term 
          financial goals through clear, structured budgeting.  
        </p>
      </div>

      {/* FIXED PIE CHART IMPLEMENTATION */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Budget Allocation</h2>
        <div className="border border-gray-200 rounded" style={{ height: "400px", width: "100%" }}>
          {!auth.currentUser ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Please log in to view your budget data</p>
            </div>
          ) : pieChartLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Loading budget data...</p>
            </div>
          ) : pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`£${value.toFixed(2)}`, 'Budget']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">No budget data available. Start by adding a budget category below.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Current Budget Table */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Budget</h2>
        {!auth.currentUser ? (
          <div className="text-center py-4 text-gray-500">
            Please log in to view your budgets.
          </div>
        ) : Object.keys(budgetsFromDB).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="py-2 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('category')}
                  >
                    <div className="flex items-center">
                      Category
                      {sortConfig.key === 'category' ? (
                        sortConfig.direction === 'ascending' ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-2 px-4 border-b text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('budget')}
                  >
                    <div className="flex items-center justify-end">
                      Budget (£)
                      {sortConfig.key === 'budget' ? (
                        sortConfig.direction === 'ascending' ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-2 px-4 border-b text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('spent')}
                  >
                    <div className="flex items-center justify-end">
                      Spent (£)
                      {sortConfig.key === 'spent' ? (
                        sortConfig.direction === 'ascending' ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-2 px-4 border-b text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('percentage')}
                  >
                    <div className="flex items-center justify-end">
                      Progress
                      {sortConfig.key === 'percentage' ? (
                        sortConfig.direction === 'ascending' ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        )
                      ) : (
                        <ArrowUpDown size={14} className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-2 px-4 border-b text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBudgetData.map(([id, data]) => {
                  const categoryName = data.category || data.name;
                  const budgetAmount = parseFloat(data.amount);
                  
                  // Determine spent amount (either from manual entry or calculated)
                  let spent;
                  if (data.spent !== undefined) {
                    spent = parseFloat(data.spent) || 0;
                  } else {
                    spent = categorySpending[categoryName?.toLowerCase()] || 0;
                  }
                  
                  const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
                  
                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{categoryName}</td>
                      
                      {/* Budget Amount Column */}
                      <td className="py-2 px-4 border-b text-right">
                        {editingId === id ? (
                          <input
                            type="number"
                            className="w-24 p-1 border rounded text-right"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            min="0"
                            step="10"
                          />
                        ) : (
                          budgetAmount.toFixed(2)
                        )}
                      </td>
                      
                      {/* Spent Amount Column */}
                      <td className="py-2 px-4 border-b text-right">
                        {editingId === id ? (
                          <input
                            type="number"
                            className="w-24 p-1 border rounded text-right"
                            value={editSpent}
                            onChange={(e) => setEditSpent(e.target.value)}
                            min="0"
                            step="10"
                          />
                        ) : (
                          spent.toFixed(2)
                        )}
                      </td>
                      
                      {/* Progress Bar Column */}
                      <td className="py-2 px-4 border-b">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className={`h-2.5 rounded-full ${percentage > 100 ? 'bg-red-600' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs whitespace-nowrap">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      
                      {/* Actions Column */}
                      <td className="py-2 px-4 border-b text-center">
                        <div className="flex justify-center space-x-2">
                          {editingId === id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(id)}
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                                title="Save changes"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditBudget(id, budgetAmount, spent)}
                                className="text-white hover:text-white transition-colors"
                                title="Edit budget"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteBudget(id)}
                                disabled={deletingId === id}
                                className="bg-red-600 text-white hover:bg-red-700 transition-colors"
                                title="Delete budget"
                              >
                                {deletingId === id ? (
                                  <span className="inline-block animate-pulse">...</span>
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Table Footer with Totals */}
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="py-2 px-4 border-t">TOTAL</td>
                  <td className="py-2 px-4 border-t text-right">{budgetTotal.toFixed(2)}</td>
                  <td className="py-2 px-4 border-t text-right">{spentTotal.toFixed(2)}</td>
                  <td className="py-2 px-4 border-t">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                        <div
                          className={`h-2.5 rounded-full ${percentageTotal > 100 ? 'bg-red-600' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(percentageTotal, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs whitespace-nowrap">
                        {percentageTotal.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 border-t"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No budget categories set up yet. Add your first budget category below.
          </div>
        )}
      </div>
      
      {/* Add Budget Form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add/Update Budget Category</h2>
        <form onSubmit={handleAddBudget}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={newBudgetCategory}
                onChange={(e) => setNewBudgetCategory(e.target.value)}
                placeholder="e.g., Rent, Saving for Holiday"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Amount £</label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border rounded"
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            disabled={loading}
          >
            <Plus className="mr-1" size={16} />
            {loading ? 'Saving...' : 'Save Budget'}
          </button>
        </form>
      </div>
      
      {/* Data Visualization Section */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Data Visualization</h2>
          
          {/* Chart Type Selection */}
          <div className="flex flex-wrap space-x-2">
            <button
              className={`px-3 py-1 rounded-md ${
                chartType === 'bar' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              onClick={() => setChartType('bar')}
            >
              Bar
            </button>
            <button
              className={`px-3 py-1 rounded-md ${
                chartType === 'area' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              onClick={() => setChartType('area')}
            >
              Area
            </button>
          </div>
        </div>
        
        <div className="chart-container">
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'bar' && (
                <BarChart
                  data={comparisonData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`£${value}`, '']} />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="#8884d8" />
                  <Bar dataKey="actual" name="Actual" fill="#82ca9d" />
                </BarChart>
              )}
              
              {chartType === 'area' && (
                <AreaChart
                  data={comparisonData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`£${value}`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="budget" name="Budget" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="actual" name="Actual" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              No budget data available for visualization. Add budget categories to see comparison.
            </div>
          )}
        </div>
        
        {/* Chart Description */}
        <div className="mt-4 text-sm text-gray-600">
          {chartType === 'bar' && (
            <p>The bar chart provides a direct comparison between your budget and actual spending for each category, making it easy to spot where you're over or under budget.</p>
          )}
          
          {chartType === 'area' && (
            <p>The area chart emphasizes the magnitude of your budget and spending across categories, highlighting the total financial volume and areas of significant difference.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Budget;