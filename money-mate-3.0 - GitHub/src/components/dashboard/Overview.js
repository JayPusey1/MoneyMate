import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, PieChart, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { BarChart as CreditCard, PieChart as PieChartIcon, PoundSterling, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase'; // Make sure auth is imported
import './css/Overview.css';

const Overview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [categoryView, setCategoryView] = useState('expense'); 
  const [chartView, setChartView] = useState('pie'); 
  const [financialMetrics, setFinancialMetrics] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    totalInvestments: 0,
    netWorth: 0
  });
  const [error, setError] = useState(null);
  const [budgetsData, setBudgetsData] = useState({});
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  
  // Date filter state
  const [dateRange, setDateRange] = useState('30days');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Generate mock data for the current user
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
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(currentDate.getDate() - 90);
    
    for (let i = 0; i < 100; i++) {
      // Randomly decide if this is income or expense
      const type = Math.random() > 0.5 ? 'expense' : 'income';
      
      // Choose appropriate category based on type
      const category = type === 'income' 
        ? incomeCategories[Math.floor(Math.random() * incomeCategories.length)]
        : expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      
      // Generate random date between now and 90 days ago
      const randomDate = new Date(
        ninetyDaysAgo.getTime() + Math.random() * (currentDate.getTime() - ninetyDaysAgo.getTime())
      );
      const formattedDate = randomDate.toISOString().split('T')[0];
      
      // Generate random amount between 10 and 1000
      const amount = (Math.random() * 990 + 10).toFixed(2);
      
      mockData.push({
        id: `mock-${i}`,
        description: `Mock ${type === 'income' ? 'Income' : 'Expense'} ${i + 1}`,
        amount: amount,
        type,
        category,
        date: formattedDate,
        userId: userId, // Add the userId to each transaction
      });
    }
    
    // Sort by date descending (newest first)
    return mockData.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

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
      
      // Sort by date descending (newest first)
      return transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
      console.error("Error fetching transactions: ", err);
      setError("Could not fetch transactions. Using mock data instead.");
      return [];
    }
  };

  // Fetch budgets from Firebase for the current user
  const fetchBudgets = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log("No user is signed in");
        setBudgetsLoading(false);
        return;
      }
      
      const userId = currentUser.uid;
      const q = query(
        collection(db, 'budgets'),
        where('userId', '==', userId)
      );
      
      const budgetSnapshot = await getDocs(q);
      const budgetData = {};
      
      budgetSnapshot.forEach(doc => {
        budgetData[doc.id] = { ...doc.data(), id: doc.id };
      });
      
      setBudgetsData(budgetData);
      setBudgetsLoading(false);
    } catch (err) {
      console.error('Error fetching budgets for overview:', err);
      setBudgetsLoading(false);
    }
  };

  // Add mock data to local state (not to Firebase)
  const addMockDataToState = () => {
    const mockData = generateMockData();
    return mockData;
  };

  const getCategoryData = () => {
    if (categoryView === 'expense') {
      return categoryData;
    } else {
      // Filter and process income categories
      const incomeCategories = {};
      
      filteredTransactions
        .filter(t => t.type === 'income')
        .forEach(transaction => {
          const category = transaction.category || 'Other';
          if (!incomeCategories[category]) {
            incomeCategories[category] = { name: category, value: 0, type: 'income' };
          }
          incomeCategories[category].value += parseFloat(transaction.amount) || 0;
        });
      
      return Object.values(incomeCategories).sort((a, b) => b.value - a.value);
    }
  };
  
  const getTotalForView = () => {
    return getCategoryData().reduce((total, item) => total + item.value, 0);
  };

  // Initialize transactions and budgets
  useEffect(() => {
    const loadData = async () => {
  setIsLoading(true);
  
  // Check if a user is logged in
  if (!auth.currentUser) {
    setError("Please log in to view your financial overview");
    setIsLoading(false);
    return;
  }
  
  try {
    // Fetch transactions
    let data = await fetchTransactions();
    
    // Don't use mock data, just use empty array if no transactions
    if (!data || data.length === 0) {
      console.log("No transactions found.");
      data = [];
    }
    
    setTransactions(data);
    
    // Apply initial date filter (30 days)
    applyDateFilter(data, dateRange);
    
    // Fetch budgets
    fetchBudgets();
    
  } catch (err) {
    console.error("Error loading data:", err);
    setError("An error occurred while loading data.");
    
    // Use empty array instead of mock data
    setTransactions([]);
    applyDateFilter([], dateRange);
  } finally {
    setIsLoading(false);
  }
};
    
    // Set up an auth state change listener
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        loadData();
      } else {
        setTransactions([]);
        setFilteredTransactions([]);
        setMonthlyData([]);
        setCategoryData([]);
        setFinancialMetrics({
          totalIncome: 0,
          totalExpenses: 0,
          totalSavings: 0,
          totalInvestments: 0,
          netWorth: 0
        });
        setError("Please log in to view your financial overview");
      }
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);

  // Apply date filter when it changes
  useEffect(() => {
    if (transactions.length > 0) {
      applyDateFilter(transactions, dateRange);
    }
  }, [dateRange, customDateRange, transactions]);

  // Apply date filter to transactions
  const applyDateFilter = (allTransactions, filter) => {
    const today = new Date();
    let startDate = new Date();
    const endDate = new Date();
    
    switch (filter) {
      case '7days':
        startDate.setDate(today.getDate() - 7);
        break;
      case '14days':
        startDate.setDate(today.getDate() - 14);
        break;
      case '30days':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'alltime':
        startDate = new Date(0); // Beginning of time
        break;
      case 'custom':
        startDate = new Date(customDateRange.startDate);
        endDate.setTime(new Date(customDateRange.endDate).getTime());
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }
    
    // Reset time to beginning/end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Filter transactions
    const filtered = allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    setFilteredTransactions(filtered);
    processTransactionData(filtered);
  };

  // Process transaction data for charts and calculations
  const processTransactionData = (transactionsData) => {
    if (!transactionsData || transactionsData.length === 0) {
      setMonthlyData([]);
      setCategoryData([]);
      setFinancialMetrics({
        totalIncome: 0,
        totalExpenses: 0,
        totalSavings: 0,
        totalInvestments: 0,
        netWorth: 0
      });
      return;
    }
    
    try {
      // Calculate financial metrics
      let totalIncome = 0;
      let totalExpenses = 0;
      
      // Process monthly data for the chart
      const monthlyMap = {};
      
      // Process categories for pie chart
      const categoryMap = {};
      
      transactionsData.forEach(transaction => {
        // Ensure amount is a number
        const amount = typeof transaction.amount === 'number' 
          ? transaction.amount 
          : parseFloat(transaction.amount) || 0;
          
        // Update financial metrics
        if (transaction.type === 'income') {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
        }
        
        // Process for monthly chart
        const month = transaction.date.substring(0, 7); // YYYY-MM format
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, income: 0, expenses: 0 };
        }
        
        if (transaction.type === 'income') {
          monthlyMap[month].income += amount;
        } else {
          monthlyMap[month].expenses += amount;
        }
        
        // Process for category pie chart
        if (transaction.type === 'expense') {
          const category = transaction.category || 'Other';
          if (!categoryMap[category]) {
            categoryMap[category] = { name: category, value: 0 };
          }
          categoryMap[category].value += amount;
        }
      });
      
      // Update financial metrics
      const netWorth = totalIncome - totalExpenses;
      const totalSavings = 0;
      const totalInvestments = 0;
      
      setFinancialMetrics({
        totalIncome,
        totalExpenses,
        totalSavings,
        totalInvestments,
        netWorth
      });
      
      // Update chart data
      const monthlyChartData = Object.values(monthlyMap)
        .sort((a, b) => a.month.localeCompare(b.month));
      
      const categoryChartData = Object.values(categoryMap)
        .sort((a, b) => b.value - a.value);
      
      setMonthlyData(monthlyChartData);
      setCategoryData(categoryChartData);
      
    } catch (error) {
      console.error("Error processing transaction data:", error);
      setError("Error processing data. Some charts may not display correctly.");
    }
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range !== 'custom') {
      setShowCustomDatePicker(false);
    } else {
      setShowCustomDatePicker(true);
    }
  };

  // Handle custom date change
  const handleCustomDateChange = (e) => {
    setCustomDateRange({
      ...customDateRange,
      [e.target.name]: e.target.value
    });
  };

  const COLORS = [
    '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#607D8B',
    '#E91E63', '#3F51B5', '#CDDC39', '#795548', '#00BCD4', '#FF9800'
  ];

  // Format amount with pound sign
  const formatCurrency = (amount) => {
    return `£${parseFloat(amount).toFixed(2)}`;
  };

  // Get date range label for display
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7days':
        return 'Last 7 Days';
      case '14days':
        return 'Last 14 Days';
      case '30days':
        return 'Last 30 Days';
      case 'alltime':
        return 'All Time';
      case 'custom':
        return `${customDateRange.startDate} to ${customDateRange.endDate}`;
      default:
        return 'Last 30 Days';
    }
  };

  // Calculate month-over-month changes
  const calculateMonthlyChanges = () => {
    if (monthlyData.length < 2) return { income: 0, expenses: 0 };
    
    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    
    const incomeChange = previousMonth.income !== 0 
      ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 
      : 0;
    
    const expenseChange = previousMonth.expenses !== 0 
      ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100 
      : 0;
    
    return {
      income: Math.round(incomeChange),
      expenses: Math.round(expenseChange)
    };
  };

  // Calculate category spending for budget overview
  const calculateCategorySpending = () => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        const category = transaction.category.toLowerCase();
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += parseFloat(transaction.amount) || 0;
        return acc;
      }, {});
  };

  // Get top budget items for display
  const getTopBudgetItems = () => {
    const categorySpending = calculateCategorySpending();
    
    return Object.entries(budgetsData)
      .map(([id, data]) => {
        const categoryName = data.category || data.name || '';
        const budgetAmount = parseFloat(data.amount) || 0;
        
        // Determine spent amount (either from manual entry or calculated)
        let spent;
        if (data.spent !== undefined) {
          spent = parseFloat(data.spent) || 0;
        } else {
          spent = categorySpending[categoryName.toLowerCase()] || 0;
        }
        
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        
        return {
          id,
          category: categoryName,
          budget: budgetAmount,
          spent,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage) // Sort by highest percentage first
      .slice(0, 3); // Take top 3
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Calculate monthly changes for display
  const monthlyChanges = calculateMonthlyChanges();
  
  // Get top budget items
  const topBudgetItems = getTopBudgetItems();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Financial Overview</h1>
      
      {/* User authentication status */}
      {!auth.currentUser && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>Please log in to view your financial overview.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Overview of your finances</h2>
        <p className="text-blue-700">
          This page provides a view of some key information from your financial activity. 
          Track your income versus expenses in any chosen time frame and visualize spending 
          patterns across different categories. The interactive charts help you identify trends 
          over time, while the customizable date filters allow you to analyse your finances for specific periods. 
        </p>
      </div>
      
      {/* Quick Actions Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 spacing">
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4" style={{ minHeight: "150px" }}>
          <Link 
            to="/dashboard/transactions" 
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex flex-col items-center justify-center text-center h-full w-full p-6"
          >
            <CreditCard className="h-10 w-10 icon-gap" />
            <span className="text-base font-medium">Add Transaction</span>
          </Link>
          <Link 
            to="/dashboard/budget" 
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg flex flex-col items-center justify-center text-center h-full w-full p-6"
          >
            <PoundSterling className="h-10 w-10 icon-gap" />
            <span className="text-base font-medium">Manage Budgets</span>
          </Link>
        </div>
      </div>
      
      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 spacing">
        {/* Header */}
        <div className="flex items-center mb-4">
          <Calendar className="mr-2 mb-4 text-blue-500" />
          <h2 className="text-lg font-semibold">Date Range</h2>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => handleDateRangeChange('7days')}
            className={`px-3 py-1 text-sm rounded ${dateRange === '7days' 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-700'}`}
          >
            7 Days
          </button>
          <button 
            onClick={() => handleDateRangeChange('14days')}
            className={`px-3 py-1 text-sm rounded ${dateRange === '14days' 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-700'}`}
          >
            14 Days
          </button>
          <button 
            onClick={() => handleDateRangeChange('30days')}
            className={`px-3 py-1 text-sm rounded ${dateRange === '30days' 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-700'}`}
          >
            30 Days
          </button>
          <button 
            onClick={() => handleDateRangeChange('alltime')}
            className={`px-3 py-1 text-sm rounded ${dateRange === 'alltime' 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-700'}`}
          >
            All Time
          </button>
          <button 
            onClick={() => handleDateRangeChange('custom')}
            className={`px-3 py-1 text-sm rounded ${dateRange === 'custom' 
              ? 'bg-green-500 text-white' 
              : 'bg-blue-500 text-white hover:bg-blue-700'}`}
          >
            Custom
          </button>
        </div>
        
        {/* Custom Date Range Picker */}
        {showCustomDatePicker && (
          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                name="startDate"
                value={customDateRange.startDate}
                onChange={handleCustomDateChange}
                className="px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                name="endDate"
                value={customDateRange.endDate}
                onChange={handleCustomDateChange}
                className="px-2 py-1 border rounded"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Financial Summary Box */}
      <div className="bg-white rounded-lg shadow mb-6">
        {/* Box Header */}
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">Financial Summary <span className="text-sm font-normal text-gray-500">({getDateRangeLabel()})</span></h3>
        </div>
        
        {/* Box Content - Three sections side by side */}
        <div className="grid grid-cols-3 divide-x">
          {/* Income Section */}
          <div className="p-5 text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-green-100 rounded-full p-2">
                <ArrowUp className="text-green-500 w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(financialMetrics.totalIncome)}
            </p>
          </div>
          
          {/* Expenses Section */}
          <div className="p-5 text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-red-100 rounded-full p-2">
                <ArrowDown className="text-red-500 w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(financialMetrics.totalExpenses)}
            </p>
          </div>
          
          {/* Net Balance Section */}
          <div className="p-5 text-center">
            <div className="flex justify-center mb-2">
              <div className={`${financialMetrics.netWorth >= 0 ? 'bg-blue-100' : 'bg-orange-100'} rounded-full p-2`}>
                <PoundSterling className={`${financialMetrics.netWorth >= 0 ? 'text-blue-500' : 'text-orange-500'} w-5 h-5`} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Net Balance</p>
            <p className={`text-2xl font-bold ${financialMetrics.netWorth >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(financialMetrics.netWorth)}
            </p>
            <p className={`text-sm mt-2 ${financialMetrics.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {financialMetrics.netWorth >= 0 
                ? "Your income exceeds your expenses" 
                : "Your expenses exceed your income"}
            </p>
          </div>
        </div>
      </div>
      
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 spacing">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Budget Overview</h3>
            <Link to="/dashboard/budget" className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">View All</Link>
          </div>
             
          {budgetsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : topBudgetItems.length > 0 ? (
            <div className="space-y-3">
              {topBudgetItems.map(item => (
                <div key={item.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-20">
                    <div 
                      className={`h-2 rounded-full ${
                        item.percentage > 90 ? 'bg-red-500' : 
                        item.percentage > 75 ? 'bg-orange-500' : 'bg-blue-500'
                      }`} 
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              {Object.keys(budgetsData).length === 0 ? (
                <>No budget categories found. <Link to="/dashboard/budget" className="text-blue-500 hover:underline">Add some budgets</Link> to track your spending.</>
              ) : (
                <>No budget data available for the selected period.</>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Category Analysis with Toggles */}
      <div className="bg-white rounded-lg shadow p-4 lg:col-span-3 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <PieChartIcon className="mr-2 mb-4 text-blue-500" />
            <h2 className="text-lg font-semibold">Category Analysis</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Category Type Toggle */}
            <div className="flex items-center bg-gray-200 rounded-lg p-1 mr-2">
              <button
                className={`px-3 py-10 mr-1 rounded-md text-sm font-medium transition-colors ${
                  categoryView === 'expense' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 hover:bg-gray-200'
                }`}
                onClick={() => setCategoryView('expense')}
              >
                Expenses
              </button>
              <button
                className={`px-3 py-10 rounded-md text-sm font-medium transition-colors ${
                  categoryView === 'income' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 hover:bg-gray-200'
                }`}
                onClick={() => setCategoryView('income')}
              >
                Income
              </button>
            </div>
            
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-gray-200 rounded-lg p-1 mr-2">
              <button
                className={`px-3 py-1 mr-1 rounded-md text-sm font-medium transition-colors ${
                  chartView === 'pie' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 hover:bg-gray-200'
                }`}
                onClick={() => setChartView('pie')}
              >
                Pie Chart
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  chartView === 'bar' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 hover:bg-gray-200'
                }`}
                onClick={() => setChartView('bar')}
              >
                Bar Chart
              </button>
            </div>
            
            <Link 
              to="/dashboard/categories"
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              View All
            </Link>
          </div>
        </div>
        
        {/* Chart Display - Shows either pie or bar chart based on chartView state */}
        <div className="h-80">
          {getCategoryData().length > 0 ? (
            <>
              {/* Pie Chart View */}
              {chartView === 'pie' && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCategoryData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getCategoryData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`£${parseFloat(value).toFixed(2)}`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
              
              {/* Bar Chart View */}
              {chartView === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...getCategoryData()].slice(0, 8)} // Show top 8 categories
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `£${value}`} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={110}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`£${parseFloat(value).toFixed(2)}`, categoryView === 'expense' ? 'Spending' : 'Income']}
                    />
                    <Bar dataKey="value" name={categoryView === 'expense' ? 'Spending' : 'Income'}>
                      {getCategoryData().slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              No {categoryView} data available for the selected period.
            </div>
          )}
        </div>
        
        {/* Category Summary */}
        {getCategoryData().length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
            <p className="text-sm text-gray-600">
              Your top {categoryView} category is <span className="font-medium">{getCategoryData()[0]?.name}</span> 
              ({formatCurrency(getCategoryData()[0]?.value)}), representing 
              {' '}{Math.round((getCategoryData()[0]?.value / getTotalForView()) * 100)}% of your total {categoryView}s.
            </p>
          </div>
        )}
      </div>
      
      {/* Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 spacing">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CreditCard className="mr-2 mb-3 text-blue-500" />
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
            </div>
            <Link to="/dashboard/transactions" className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">View All</Link>
          </div>
          
          {filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.slice(0, 5).map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.category || 'Other'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        £{parseFloat(transaction.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              No transactions for the selected period.
            </div>
          )}
        </div>
      </div>
    </div> 
  );
};

export default Overview;