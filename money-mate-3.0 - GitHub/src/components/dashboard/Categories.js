import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase'; // Make sure auth is imported
import { BarChart as BarChartIcon, Filter, Calendar, ArrowUp, ArrowDown, PieChart as PieChartIcon, LayoutList } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './css/Categories.css';

const TransactionAnalysis = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [descriptionData, setDescriptionData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('all');
  const [sortBy, setSortBy] = useState('frequency'); // 'frequency', 'amount', 'alphabetical'
  const [sortDirection, setSortDirection] = useState('desc');
  const [limit, setLimit] = useState(10);
  const [filterType, setFilterType] = useState('all'); // 'all', 'expense', 'income'
  const [analysisView, setAnalysisView] = useState('description'); // 'description', 'category'
  
  // Color scheme for charts
  const COLORS = [
    '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#607D8B',
    '#E91E63', '#3F51B5', '#CDDC39', '#795548', '#00BCD4', '#FF9800'
  ];
  
  // Fetch transactions from Firebase for current user
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
      
      return transactionsData;
    } catch (err) {
      console.error("Error fetching transactions: ", err);
      setError("Could not fetch transactions data.");
      return [];
    }
  };

  // Initialize transactions
  useEffect(() => {
    // Set up an auth state change listener
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        loadTransactions();
      } else {
        setTransactions([]);
        setFilteredTransactions([]);
        setDescriptionData([]);
        setCategoryData([]);
        setError("Please log in to view your transaction analysis");
      }
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);
  
  const loadTransactions = async () => {
    setIsLoading(true);
    
    try {
      const data = await fetchTransactions();
      setTransactions(data);
      setFilteredTransactions(data);
      analyzeTransactions(data);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setError("An error occurred while loading transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters when parameters change
  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters();
    }
  }, [timeframe, filterType, transactions]);

  // Update frequency data when filtered transactions or sort options change
  useEffect(() => {
    analyzeTransactions(filteredTransactions);
  }, [filteredTransactions, sortBy, sortDirection, limit]);

  // Apply filters based on current settings
  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Filter by timeframe
    if (timeframe !== 'all') {
      const today = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case '7days':
          startDate.setDate(today.getDate() - 7);
          break;
        case '14days':
          startDate.setDate(today.getDate() - 14);
          break;
        case '30days':
          startDate.setDate(today.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(today.getDate() - 90);
          break;
        case 'year':
          startDate.setFullYear(today.getFullYear() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate;
      });
    }
    
    // Filter by transaction type
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }
    
    setFilteredTransactions(filtered);
  };

  // Analyze transaction frequency by description and category
  const analyzeTransactions = (data) => {
    if (!data || data.length === 0) {
      setDescriptionData([]);
      setCategoryData([]);
      return;
    }
    
    // --- DESCRIPTION ANALYSIS ---
    // Create a map to count occurrences and sum amounts by description
    const descriptionMap = {};
    
    data.forEach(transaction => {
      const description = transaction.description?.trim() || '';
      if (!description) return;
      
      if (!descriptionMap[description]) {
        descriptionMap[description] = {
          name: description,
          count: 0,
          totalAmount: 0,
          type: transaction.type,
          category: transaction.category || 'Uncategorized',
          transactions: []
        };
      }
      
      descriptionMap[description].count += 1;
      descriptionMap[description].totalAmount += parseFloat(transaction.amount) || 0;
      descriptionMap[description].transactions.push(transaction);
    });
    
    // Convert map to array and sort
    let descriptionArray = Object.values(descriptionMap);
    
    // --- CATEGORY ANALYSIS ---
    // Create a map to count occurrences and sum amounts by category
    const categoryMap = {};
    
    data.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      
      if (!categoryMap[category]) {
        categoryMap[category] = {
          name: category,
          count: 0,
          totalAmount: 0,
          type: transaction.type, // This might be inaccurate if mixed types in category
          transactions: [],
          descriptions: new Set()
        };
      }
      
      categoryMap[category].count += 1;
      categoryMap[category].totalAmount += parseFloat(transaction.amount) || 0;
      categoryMap[category].transactions.push(transaction);
      categoryMap[category].descriptions.add(transaction.description || '');
      
      // Update type if mixed
      if (categoryMap[category].type !== transaction.type) {
        categoryMap[category].type = 'mixed';
      }
    });
    
    // Convert map to array
    let categoryArray = Object.values(categoryMap).map(item => ({
      ...item,
      uniqueDescriptions: item.descriptions.size,
      descriptions: Array.from(item.descriptions)
    }));
    
    // Sort both arrays based on current sort settings
    const sortFunction = (a, b) => {
      switch (sortBy) {
        case 'frequency':
          return sortDirection === 'desc' ? b.count - a.count : a.count - b.count;
        case 'amount':
          return sortDirection === 'desc' ? b.totalAmount - a.totalAmount : a.totalAmount - b.totalAmount;
        case 'alphabetical':
          return sortDirection === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
        default:
          return 0;
      }
    };
    
    descriptionArray.sort(sortFunction);
    categoryArray.sort(sortFunction);
    
    // Limit the number of results
    descriptionArray = descriptionArray.slice(0, limit);
    categoryArray = categoryArray.slice(0, limit);
    
    // Calculate percentages for visualization
    const maxDescCount = Math.max(...descriptionArray.map(item => item.count), 1);
    const maxCatCount = Math.max(...categoryArray.map(item => item.count), 1);
    
    descriptionArray = descriptionArray.map(item => ({
      ...item,
      percentage: Math.round((item.count / maxDescCount) * 100)
    }));
    
    categoryArray = categoryArray.map(item => ({
      ...item,
      percentage: Math.round((item.count / maxCatCount) * 100)
    }));
    
    setDescriptionData(descriptionArray);
    setCategoryData(categoryArray);
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle direction if clicking the same sort field
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // Set new sort field and default to descending
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (amount) => {
    return `£${parseFloat(amount).toFixed(2)}`;
  };

  // Get chart data formatted for Recharts
  const getChartData = () => {
    const data = analysisView === 'description' ? descriptionData : categoryData;
    return data.slice().reverse(); // Reverse to display in ascending order from bottom
  };

  // Format data for pie chart
  const getPieData = () => {
    const data = analysisView === 'description' ? descriptionData : categoryData;
    return data.map(item => ({
      name: item.name,
      value: item.count
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction Analysis</h1>
      
      {/* User authentication status */}
      {!auth.currentUser && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>Please log in to view your transaction analysis.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Page Description */}
      <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Transaction Pattern Analysis</h2>
        <p className="text-blue-700">
        This page shows your transaction history to help you identify patterns in your spending and income.   
        You can view analysis by transaction description or by category to understand your financial habits 
        and identify areas for potential savings. 
        </p>
      </div>
      
      {/* View Toggle & Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between mb-4">
          <div className="flex items-center mb-4 md:mb-0">
            <Filter className="mr-2 text-blue-500 mb-3" />
            <h2 className="text-lg font-semibold">Analysis Options</h2>
          </div>
          
          {/* View Toggle Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setAnalysisView('description')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                analysisView === 'description' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={!auth.currentUser}
            >
              <LayoutList className="mr-2 h-5 w-5" />
              By Description
            </button>
            <button
              onClick={() => setAnalysisView('category')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                analysisView === 'category' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={!auth.currentUser}
            >
              <PieChartIcon className="mr-2 h-5 w-5" />
              By Category
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Timeframe Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
            <select 
              className="w-full p-2 border rounded"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              disabled={!auth.currentUser}
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="14days">Last 14 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          {/* Transaction Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select 
              className="w-full p-2 border rounded"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              disabled={!auth.currentUser}
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>
          
          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select 
              className="w-full p-2 border rounded"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setSortDirection('desc'); // Reset direction when changing sort field
              }}
              disabled={!auth.currentUser}
            >
              <option value="frequency">Frequency</option>
              <option value="amount">Total Amount</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
          
          {/* Number of Results */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Show Top</label>
            <select 
              className="w-full p-2 border rounded"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              disabled={!auth.currentUser}
            >
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center mb-4">
            <BarChartIcon className="mr-2 text-blue-500 mb-3" />
            <h2 className="text-lg font-semibold">
              {analysisView === 'description' ? 'Transaction' : 'Category'} Frequency Chart
            </h2>
          </div>
          
          {!auth.currentUser ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Please log in to view transaction analysis.
            </div>
          ) : (analysisView === 'description' ? descriptionData : categoryData).length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getChartData().map(item => ({
                    name: item.name,
                    count: item.count,
                    fill: COLORS[getChartData().indexOf(item) % COLORS.length]
                  }))}
                  layout="vertical"
                  margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'count' ? 'Frequency' : 'Transactions']}
                    labelFormatter={(label) => `${analysisView === 'description' ? 'Transaction' : 'Category'}: ${label}`}
                    itemStyle={{ color: '#333' }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Frequency" 
                    // Shape renderer to use the fill color from our data
                    shape={(props) => {
                      const { fill, x, y, width, height } = props;
                      return <rect x={x} y={y} width={width} height={height} fill={props.payload.fill} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              No transaction data available for analysis.
            </div>
          )}
        </div>
        
        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center mb-4">
            <PieChartIcon className="mr-2 text-blue-500 mb-3" />
            <h2 className="text-lg font-semibold">
              {analysisView === 'description' ? 'Transaction' : 'Category'} Distribution
            </h2>
          </div>
          
          {!auth.currentUser ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Please log in to view transaction analysis.
            </div>
          ) : (analysisView === 'description' ? descriptionData : categoryData).length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getPieData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {getPieData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              No transaction data available for analysis.
            </div>
          )}
        </div>
      </div>
      
      {/* Frequency Table */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calendar className="mr-2 text-blue-500 mb-3" />
            <h2 className="text-lg font-semibold">
              {analysisView === 'description' ? 'Transaction' : 'Category'} Frequency List
            </h2>
          </div>
          
          {auth.currentUser && (
            <div className="text-sm text-gray-500">
              Showing {Math.min((analysisView === 'description' ? descriptionData : categoryData).length, limit)} of {filteredTransactions.length} transactions
            </div>
          )}
        </div>
        
        {!auth.currentUser ? (
          <div className="text-center py-4 text-gray-500">
            Please log in to view your transaction analysis.
          </div>
        ) : (analysisView === 'description' ? descriptionData : categoryData).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('alphabetical')}
                  >
                    <div className="flex items-center">
                      {analysisView === 'description' ? 'Transaction Name' : 'Category'}
                      {sortBy === 'alphabetical' && (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  
                  {/* Column specific to description view */}
                  {analysisView === 'description' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  )}
                  
                  {/* Column specific to category view */}
                  {analysisView === 'category' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unique Descriptions
                    </th>
                  )}
                  
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('frequency')}
                  >
                    <div className="flex items-center">
                      Frequency
                      {sortBy === 'frequency' && (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('amount')}
                  >
                    <div className="flex items-center">
                      Total Amount
                      {sortBy === 'amount' && (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Amount
                  </th>
                  
                  {analysisView === 'description' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  )}
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency Bar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(analysisView === 'description' ? descriptionData : categoryData).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    
                    {/* Description-specific column */}
                    {analysisView === 'description' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category}
                      </td>
                    )}
                    
                    {/* Category-specific column */}
                    {analysisView === 'category' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.uniqueDescriptions}
                      </td>
                    )}
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.count} times
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(item.totalAmount / item.count)}
                    </td>
                    
                    {/* Description-specific type column */}
                    {analysisView === 'description' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-semibold 
                            ${item.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {item.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                    )}
                    
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            index === 0 ? 'bg-blue-600' : 
                            index === 1 ? 'bg-green-600' : 
                            index === 2 ? 'bg-purple-600' : 'bg-gray-600'
                          }`} 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            No transactions available for the selected filters.
          </div>
        )}
      </div>
      
      {/* Analysis Insights Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center mb-4">
          <Calendar className="mr-2 text-blue-500 mb-3" />
          <h2 className="text-lg font-semibold">Analysis Insights</h2>
        </div>
        
        {!auth.currentUser ? (
          <div className="text-center py-4 text-gray-500">
            Please log in to view transaction insights.
          </div>
        ) : (analysisView === 'description' ? descriptionData : categoryData).length > 0 ? (
          <div className="space-y-4">
            <p className="text-gray-700">
              Based on your transaction history, here are some insights:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {analysisView === 'description' && descriptionData.length > 0 && (
                <>
                  <li>
                    Your most frequent transaction is <strong>{descriptionData[0].name}</strong> with {descriptionData[0].count} occurrences, 
                    totaling {formatCurrency(descriptionData[0].totalAmount)}.
                  </li>
                  
                  {descriptionData.filter(item => item.type === 'expense').length > 0 && (
                    <li>
                      Your most common expense is <strong>
                        {descriptionData.filter(item => item.type === 'expense')[0]?.name}
                      </strong>, which appears {descriptionData.filter(item => item.type === 'expense')[0]?.count} times.
                    </li>
                  )}
                  
                  {descriptionData.filter(item => item.type === 'income').length > 0 && (
                    <li>
                      Your most frequent income source is <strong>
                        {descriptionData.filter(item => item.type === 'income')[0]?.name}
                      </strong>, appearing {descriptionData.filter(item => item.type === 'income')[0]?.count} times.
                    </li>
                  )}
                </>
              )}
              
              {analysisView === 'category' && categoryData.length > 0 && (
                <>
                  <li>
                    Your most frequent category is <strong>{categoryData[0].name}</strong> with {categoryData[0].count} transactions, 
                    totaling {formatCurrency(categoryData[0].totalAmount)}.
                  </li>
                  <li>
                    The category <strong>{categoryData[0].name}</strong> contains {categoryData[0].uniqueDescriptions} different transaction descriptions.
                  </li>
                  
                  {categoryData.length > 1 && (
                    <li>
                      Your second most frequent category is <strong>{categoryData[1].name}</strong> with {categoryData[1].count} transactions.
                    </li>
                  )}
                </>
              )}
              
              <li>
                You have {filteredTransactions.filter(t => t.type === 'expense').length} expense transactions and {' '}
                {filteredTransactions.filter(t => t.type === 'income').length} income transactions in the selected period.
              </li>
            </ul>
            
            <p className="text-gray-700">
              Understanding your recurring transactions can help you identify patterns and potential areas for saving.
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No data available to generate insights.
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionAnalysis;