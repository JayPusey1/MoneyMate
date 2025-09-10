import React, { useState, useEffect } from 'react';
import { PieChart, LineChart, Pie, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Trash2, Edit, ArrowUpDown, ArrowDown, ArrowUp, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

const Investments = () => {
  // Sample initial data
  const [investments, setInvestments] = useState([
    { id: '1', name: 'Stocks', value: 25000, type: 'Equity', returnRate: 7.2, startDate: '2023-01-15' },
    { id: '2', name: 'Bonds', value: 12000, type: 'Fixed Income', returnRate: 3.5, startDate: '2023-02-20' },
    { id: '3', name: 'Property', value: 50000, type: 'Property', returnRate: 4.8, startDate: '2022-10-05' },
    { id: '4', name: 'Crypto', value: 5000, type: 'Digital Asset', returnRate: 12.5, startDate: '2023-05-10' }
  ]);

  // Form state for adding new investments
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    value: '',
    type: '',
    returnRate: '',
    startDate: ''
  });

  // Performance data - in a real app this would come from an API or database
  const [performanceData, setPerformanceData] = useState([
    { month: 'Jan', stocks: 4800, bonds: 3100, realEstate: 9800, crypto: 1500 },
    { month: 'Feb', stocks: 4900, bonds: 3050, realEstate: 9900, crypto: 1800 },
    { month: 'Mar', stocks: 4850, bonds: 3000, realEstate: 9950, crypto: 1600 },
    { month: 'Apr', stocks: 5000, bonds: 3000, realEstate: 10000, crypto: 2000 },
    { month: 'May', stocks: 5200, bonds: 3100, realEstate: 10100, crypto: 1800 },
    { month: 'Jun', stocks: 5300, bonds: 3150, realEstate: 10200, crypto: 2200 }
  ]);

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [showTips, setShowTips] = useState(true);

  // Calculate total investments value
  const totalInvestmentsValue = investments.reduce((sum, inv) => sum + parseFloat(inv.value), 0);

  // Chart colors
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d',
    '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc658', '#ea5545', '#f46a9b'
  ];

  // Investment types for dropdown
  const investmentTypes = [
    'Stocks', 'Bonds', 'ETFs', 'Mutual Funds', 'Property', 
    'Crypto', 'Commodities', 'Cash', 'Fixed Income', 'Other'
  ];

  // Handle input change for new investment form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInvestment({
      ...newInvestment,
      [name]: value
    });
  };

  // Handle input change for edit form
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({
      ...editForm,
      [name]: value
    });
  };

  // Add new investment
  const handleAddInvestment = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!newInvestment.name || !newInvestment.value || !newInvestment.type) {
      setError('Please fill in all required fields');
      return;
    }
    
    const value = parseFloat(newInvestment.value);
    if (isNaN(value) || value <= 0) {
      setError('Investment value must be a positive number');
      return;
    }
    
    const returnRate = parseFloat(newInvestment.returnRate);
    if (newInvestment.returnRate && (isNaN(returnRate) || returnRate < 0)) {
      setError('Return rate must be a non-negative number');
      return;
    }
    
    // Add new investment with generated ID
    const newId = Date.now().toString();
    setInvestments([
      ...investments,
      {
        id: newId,
        name: newInvestment.name,
        value: parseFloat(newInvestment.value),
        type: newInvestment.type,
        returnRate: newInvestment.returnRate ? parseFloat(newInvestment.returnRate) : 0,
        startDate: newInvestment.startDate || new Date().toISOString().split('T')[0]
      }
    ]);
    
    // Reset form and show success message
    setNewInvestment({
      name: '',
      value: '',
      type: '',
      returnRate: '',
      startDate: ''
    });
    setShowAddForm(false);
    setSuccess('Investment added successfully!');
    setError('');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  // Delete investment
  const handleDeleteInvestment = (id) => {
    setDeletingId(id);
    
    // In a real app, you would call an API to delete from database
    setInvestments(investments.filter(inv => inv.id !== id));
    
    setSuccess('Investment deleted successfully!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
      setDeletingId(null);
    }, 3000);
  };

  // Start editing an investment
  const handleEditInvestment = (investment) => {
    setEditingId(investment.id);
    setEditForm({
      name: investment.name,
      value: investment.value,
      type: investment.type,
      returnRate: investment.returnRate,
      startDate: investment.startDate
    });
  };

  // Save edited investment
  const handleSaveEdit = (id) => {
    // Validate form
    if (!editForm.name || !editForm.value || !editForm.type) {
      setError('Please fill in all required fields');
      return;
    }
    
    const value = parseFloat(editForm.value);
    if (isNaN(value) || value <= 0) {
      setError('Investment value must be a positive number');
      return;
    }
    
    const returnRate = parseFloat(editForm.returnRate);
    if (editForm.returnRate && (isNaN(returnRate) || returnRate < 0)) {
      setError('Return rate must be a non-negative number');
      return;
    }
    
    // Update investment
    setInvestments(investments.map(inv => 
      inv.id === id ? {
        ...inv,
        name: editForm.name,
        value: parseFloat(editForm.value),
        type: editForm.type,
        returnRate: editForm.returnRate ? parseFloat(editForm.returnRate) : 0,
        startDate: editForm.startDate
      } : inv
    ));
    
    // Reset editing state and show success message
    setEditingId(null);
    setEditForm({});
    setSuccess('Investment updated successfully!');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setError('');
  };

  // Sort table data
  const requestSort = (key) => {
    let direction = 'ascending';
    
    // If already sorting by this key, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  // Get sorted investments
  const getSortedInvestments = () => {
    if (!sortConfig.key) {
      return investments;
    }
    
    return [...investments].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value?.toFixed(1)}%`;
  };

  // Format currency
  const formatCurrency = (value) => {
    return `£${value?.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  // Calculate years held
  const calculateYearsHeld = (startDate) => {
    if (!startDate) return 0;
    
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    return diffYears.toFixed(1);
  };

  // Calculate future value
  const calculateFutureValue = (investment, years = 5) => {
    const principal = parseFloat(investment.value);
    const rate = parseFloat(investment.returnRate) / 100;
    const currentYearsHeld = parseFloat(calculateYearsHeld(investment.startDate));
    
    // Compound interest formula: FV = P(1 + r)^t
    const futureValue = principal * Math.pow(1 + rate, years);
    
    return futureValue;
  };

  // Get sorted investments data
  const sortedInvestments = getSortedInvestments();

  return (
    <div className="container">
      {/* Alert messages */}
      {error && (
        <div className="full-width bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="full-width bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{success}</p>
        </div>
      )}
      
      {/* Investment Overview */}
      <div className="row">
        <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Track and Manage Your Investments</h2>
          <p className="text-blue-700">
            This dashboard allows you to monitor your investment portfolio, track performance, and analyse asset allocation.
            Add your investments using the form below and see how they compare across different metrics. Use this tool to
            make informed decisions about your financial future and optimize your investment strategy.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <h3 className="text-sm font-semibold text-green-800">Total Portfolio Value</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInvestmentsValue)}</p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800">Number of Investments</h3>
              <p className="text-2xl font-bold text-blue-600">{investments.length}</p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-800">Avg. Return Rate</h3>
              <p className="text-2xl font-bold text-purple-600">
                {formatPercentage(investments.reduce((sum, inv) => sum + (inv.returnRate || 0), 0) / (investments.length || 1))}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        {/* Investment Portfolio Chart */}
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Asset Allocation</h2>
          <div style={{ height: "300px", width: "100%" }}>
            {investments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={investments}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {investments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Value']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                No investment data available yet. Add your first investment below.
              </div>
            )}
          </div>
        </div>
        
        {/* Add Investment Form */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Add New Investment</h2>
            <button 
              className="text-white hover:text-blue-800"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {showAddForm && (
            <form onSubmit={handleAddInvestment}>
              <div className="mb-4 two-column-form">
                <div className="field field-large">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investment Name*</label>
                  <input
                    type="text"
                    name="name"
                    className="w-full p-2 border rounded"
                    value={newInvestment.name}
                    onChange={handleInputChange}
                    placeholder="e.g., S&P 500 Index Fund"
                    required
                  />
                </div>
                
                <div className="field field-small">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (£)*</label>
                  <input
                    type="number"
                    name="value"
                    min="0"
                    step="100"
                    className="w-full p-2 border rounded"
                    value={newInvestment.value}
                    onChange={handleInputChange}
                    placeholder="10000"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4 two-column-form">
                <div className="field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type*</label>
                  <select
                    name="type"
                    className="w-full p-2 border rounded"
                    value={newInvestment.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Type</option>
                    {investmentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div className="field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Return Rate (%)</label>
                  <input
                    type="number"
                    name="returnRate"
                    min="0"
                    step="0.1"
                    className="w-full p-2 border rounded"
                    value={newInvestment.returnRate}
                    onChange={handleInputChange}
                    placeholder="7.5"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  className="w-full p-2 border rounded"
                  value={newInvestment.startDate}
                  onChange={handleInputChange}
                />
              </div>
              
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              >
                <Plus className="mr-1" size={16} />
                Add Investment
              </button>
            </form>
          )}
          
          {!showAddForm && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="mr-1" size={16} />
              Add Investment
            </button>
          )}
        </div>
      </div>
      
      {/* Investment Table */}
      <div className="row">
        <div className="full-width bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Investment Portfolio</h2>
          {investments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="py-2 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center">
                        Investment
                        {sortConfig.key === 'name' ? (
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
                      className="py-2 px-4 border-b text-left cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('type')}
                    >
                      <div className="flex items-center">
                        Type
                        {sortConfig.key === 'type' ? (
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
                      onClick={() => requestSort('value')}
                    >
                      <div className="flex items-center justify-end">
                        Value
                        {sortConfig.key === 'value' ? (
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
                      onClick={() => requestSort('returnRate')}
                    >
                      <div className="flex items-center justify-end">
                        Return Rate
                        {sortConfig.key === 'returnRate' ? (
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
                    <th className="py-2 px-4 border-b text-right">Years Held</th>
                    <th className="py-2 px-4 border-b text-right">5-Year Projection</th>
                    <th className="py-2 px-4 border-b text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvestments.map((investment) => (
                    <tr key={investment.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">
                        {editingId === investment.id ? (
                          <input
                            type="text"
                            name="name"
                            className="w-full p-1 border rounded"
                            value={editForm.name}
                            onChange={handleEditChange}
                            required
                          />
                        ) : (
                          investment.name
                        )}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {editingId === investment.id ? (
                          <select
                            name="type"
                            className="w-full p-1 border rounded"
                            value={editForm.type}
                            onChange={handleEditChange}
                            required
                          >
                            {investmentTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        ) : (
                          investment.type
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {editingId === investment.id ? (
                          <input
                            type="number"
                            name="value"
                            min="0"
                            step="100"
                            className="w-full p-1 border rounded text-right"
                            value={editForm.value}
                            onChange={handleEditChange}
                            required
                          />
                        ) : (
                          formatCurrency(investment.value)
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {editingId === investment.id ? (
                          <input
                            type="number"
                            name="returnRate"
                            min="0"
                            step="0.1"
                            className="w-full p-1 border rounded text-right"
                            value={editForm.returnRate}
                            onChange={handleEditChange}
                          />
                        ) : (
                          formatPercentage(investment.returnRate)
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {editingId === investment.id ? (
                          <input
                            type="date"
                            name="startDate"
                            className="w-full p-1 border rounded"
                            value={editForm.startDate}
                            onChange={handleEditChange}
                          />
                        ) : (
                          calculateYearsHeld(investment.startDate)
                        )}
                      </td>
                      <td className="py-2 px-4 border-b text-right font-medium text-green-600">
                        {formatCurrency(calculateFutureValue(investment))}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <div className="flex justify-center space-x-2">
                          {editingId === investment.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(investment.id)}
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
                                onClick={() => handleEditInvestment(investment)}
                                className="text-white hover:text-white transition-colors"
                                title="Edit investment"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteInvestment(investment.id)}
                                disabled={deletingId === investment.id}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Delete investment"
                              >
                                {deletingId === investment.id ? (
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
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="py-2 px-4 border-t" colSpan="2">TOTAL</td>
                    <td className="py-2 px-4 border-t text-right">{formatCurrency(totalInvestmentsValue)}</td>
                    <td className="py-2 px-4 border-t text-right">
                      {formatPercentage(investments.reduce((sum, inv) => sum + (inv.returnRate || 0), 0) / investments.length)}
                    </td>
                    <td className="py-2 px-4 border-t"></td>
                    <td className="py-2 px-4 border-t text-right font-medium text-green-600">
                      {formatCurrency(investments.reduce((sum, inv) => sum + calculateFutureValue(inv), 0))}
                    </td>
                    <td className="py-2 px-4 border-t"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No investments added yet. Use the form above to add your first investment.
            </div>
          )}
        </div>
      </div>
      
      {/* Performance Chart */}
      <div className="row">
        <div className="full-width bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Investment Performance Over Time</h2>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={performanceData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                <Legend />
                <Line type="monotone" dataKey="stocks" name="Stocks" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="bonds" name="Bonds" stroke="#82ca9d" />
                <Line type="monotone" dataKey="realEstate" name="Property" stroke="#FFBB28" />
                <Line type="monotone" dataKey="crypto" name="Crypto" stroke="#FF8042" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Investment Tips */}
      <div className="row">
        <div className="full-width bg-white p-4 rounded shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Investment Tips</h2>
            <button 
              className="text-white hover:text-gray"
              onClick={() => setShowTips(!showTips)}
            >
              {showTips ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {showTips && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Asset Allocation</h3>
                <p className="text-sm">
                  For long-term growth, consider a diversified portfolio across stocks, bonds, and other asset classes. 
                  A common rule of thumb is to have (100 - your age) as the percentage of stocks in your portfolio.
                </p>
              </div>
              
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">Drip-Feeding</h3>
                <p className="text-sm">
                  Invest a fixed amount regularly regardless of market conditions. This strategy helps reduce the impact of volatility and eliminates the need to time the market.
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-2">Tax-Advantaged Accounts</h3>
                <p className="text-sm">
                  Maximize contributions to retirement accounts like ISAs and pensions before investing in taxable accounts to take advantage of tax benefits.
                </p>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">Rebalancing</h3>
                <p className="text-sm">
                  Periodically adjust your portfolio to maintain your target asset allocation. 
                  Annual rebalancing helps manage risk and can potentially enhance returns.
                </p>
              </div>
              
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">Risk Management</h3>
                <p className="text-sm">
                  Don't put all your eggs in one basket. Diversification across different asset classes, sectors, and geographies can help reduce risk in your portfolio.
                </p>
              </div>
              
              <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
                <h3 className="font-semibold text-indigo-800 mb-2">Long-Term Perspective</h3>
                <p className="text-sm">
                  Focus on long-term goals rather than short-term market fluctuations. Historically, markets have trended upward over long periods despite short-term volatility.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Investment Goals */}
      <div className="row">
        <div className="full-width bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Future Value Calculator</h2>
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-700 mb-3">
              See how your investment portfolio could grow over time based on your current holdings and return rates.
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Time Horizon</th>
                    <th className="py-2 px-4 border-b text-right">Projected Value</th>
                    <th className="py-2 px-4 border-b text-right">Potential Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 3, 5, 10, 20].map(years => {
                    const futureValue = investments.reduce((sum, inv) => sum + calculateFutureValue(inv, years), 0);
                    const growth = futureValue - totalInvestmentsValue;
                    const growthPercentage = (growth / totalInvestmentsValue) * 100;
                    
                    return (
                      <tr key={years} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border-b">{years} {years === 1 ? 'Year' : 'Years'}</td>
                        <td className="py-2 px-4 border-b text-right font-medium">{formatCurrency(futureValue)}</td>
                        <td className="py-2 px-4 border-b text-right">
                          <span className="font-medium text-green-600">
                            +{formatCurrency(growth)} ({growthPercentage.toFixed(1)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Note: These projections are based on your current investment return rates and assume consistent annual compounding. 
              Actual results may vary based on market conditions and investment performance.
            </p>
          </div>
        </div>
      </div>
      
      
    </div>
  );
};

export default Investments;