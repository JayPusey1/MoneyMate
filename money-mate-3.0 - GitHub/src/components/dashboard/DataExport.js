import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Download, FileText, Table, BarChart, Calendar, AlertCircle, Check, Settings, FileSpreadsheet } from 'lucide-react';
import './css/DataExport.css';

const DataExport = () => {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Default date range (last 3 months)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Selected preset option
  const [selectedPreset, setSelectedPreset] = useState('3months');
  
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportOptions, setExportOptions] = useState({
    transactions: true,
    budgets: true,
    reminders: true,
    categories: true
  });
  
  // Date range presets
  const datePresets = [
    { id: '1month', label: 'Last Month', 
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(end.getMonth() - 1);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      }
    },
    { id: '3months', label: '3 Months', 
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(end.getMonth() - 3);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      }
    },
    { id: '6months', label: '6 Months', 
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(end.getMonth() - 6);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      }
    },
    { id: '1year', label: 'Last Year', 
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setFullYear(end.getFullYear() - 1);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      }
    },
    { id: 'alltime', label: 'All Time', 
      getRange: () => {
        const end = new Date();
        const start = new Date(2000, 0, 1); // Far back enough for "all time"
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      }
    },
    { id: 'custom', label: 'Custom Range', 
      getRange: () => dateRange // Return current custom range
    }
  ];

  // Use Firebase auth state change to trigger data fetch
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchUserData(user.uid);
      } else {
        // User is not logged in
        setLoading(false);
        setError("Please log in to export your data");
      }
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);
  
  // Update date range when preset changes
  useEffect(() => {
    const preset = datePresets.find(p => p.id === selectedPreset);
    if (preset && preset.id !== 'custom') {
      setDateRange(preset.getRange());
    }
  }, [selectedPreset]);

  // Fetch all user data
  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsList = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsList);
      
      // Fetch budgets
      const budgetsQuery = query(
        collection(db, 'budgets'),
        where('userId', '==', userId)
      );
      const budgetsSnapshot = await getDocs(budgetsQuery);
      const budgetsList = budgetsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBudgets(budgetsList);
      
      // Fetch reminders
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('userId', '==', userId)
      );
      const remindersSnapshot = await getDocs(remindersQuery);
      const remindersList = remindersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReminders(remindersList);
      
      // Fetch categories
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('userId', '==', userId)
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesList = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesList);
      
    } catch (err) {
      console.error("Error fetching user data for export:", err);
      setError("Failed to fetch your financial data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter data by date range
  const getFilteredData = () => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999); // Set to end of day
    
    // Filter transactions by date
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    // Filter reminders by due date
    const filteredReminders = reminders.filter(reminder => {
      let reminderDate;
      
      if (reminder.dueDate instanceof Date) {
        reminderDate = reminder.dueDate;
      } else if (reminder.dueDate && typeof reminder.dueDate.toDate === 'function') {
        reminderDate = reminder.dueDate.toDate();
      } else {
        try {
          reminderDate = new Date(reminder.dueDate);
        } catch (e) {
          return false; // Skip invalid dates
        }
      }
      
      return reminderDate >= startDate && reminderDate <= endDate;
    });
    
    // For other data types, we don't filter by date
    return {
      transactions: filteredTransactions,
      budgets,
      reminders: filteredReminders,
      categories
    };
  };

  // Convert data to JSON
  const prepareJsonData = (data) => {
    const result = {};
    
    // Process each selected data type
    if (exportOptions.transactions && data.transactions.length > 0) {
      result.transactions = data.transactions.map(transaction => {
        // Convert dates and clean up data
        const cleanTransaction = { ...transaction };
        delete cleanTransaction.userId;
        return cleanTransaction;
      });
    }
    
    if (exportOptions.budgets && data.budgets.length > 0) {
      result.budgets = data.budgets.map(budget => {
        const cleanBudget = { ...budget };
        delete cleanBudget.userId;
        return cleanBudget;
      });
    }
    
    if (exportOptions.reminders && data.reminders.length > 0) {
      result.reminders = data.reminders.map(reminder => {
        const cleanReminder = { ...reminder };
        delete cleanReminder.userId;
        // Handle Firestore Timestamp objects
        if (cleanReminder.dueDate && typeof cleanReminder.dueDate.toDate === 'function') {
          cleanReminder.dueDate = cleanReminder.dueDate.toDate().toISOString();
        }
        return cleanReminder;
      });
    }
    
    if (exportOptions.categories && data.categories.length > 0) {
      result.categories = data.categories.map(category => {
        const cleanCategory = { ...category };
        delete cleanCategory.userId;
        return cleanCategory;
      });
    }
    
    return result;
  };

  // Convert data to CSV format
  const prepareCsvData = (data) => {
    let csv = '';
    
    // Process transactions
    if (exportOptions.transactions && data.transactions.length > 0) {
      csv += 'TRANSACTIONS\n';
      
      // Headers
      const transactionHeaders = ['Date', 'Description', 'Category', 'Type', 'Amount'];
      csv += transactionHeaders.join(',') + '\n';
      
      // Data rows
      data.transactions.forEach(transaction => {
        const row = [
          transaction.date,
          `"${(transaction.description || '').replace(/"/g, '""')}"`,
          transaction.category || '',
          transaction.type || '',
          transaction.amount || 0
        ];
        csv += row.join(',') + '\n';
      });
      
      csv += '\n'; // Add blank line between sections
    }
    
    // Process budgets
    if (exportOptions.budgets && data.budgets.length > 0) {
      csv += 'BUDGETS\n';
      
      // Headers
      const budgetHeaders = ['Category', 'Amount'];
      csv += budgetHeaders.join(',') + '\n';
      
      // Data rows
      data.budgets.forEach(budget => {
        const row = [
          `"${(budget.category || '').replace(/"/g, '""')}"`,
          budget.amount || 0
        ];
        csv += row.join(',') + '\n';
      });
      
      csv += '\n'; // Add blank line between sections
    }
    
    // Process reminders
    if (exportOptions.reminders && data.reminders.length > 0) {
      csv += 'PAYMENT REMINDERS\n';
      
      // Headers
      const reminderHeaders = ['Title', 'Category', 'Amount', 'Due Date', 'Status', 'Recurring', 'Frequency', 'Notes'];
      csv += reminderHeaders.join(',') + '\n';
      
      // Data rows
      data.reminders.forEach(reminder => {
        let dueDate = reminder.dueDate;
        
        if (dueDate && typeof dueDate.toDate === 'function') {
          dueDate = dueDate.toDate().toISOString().split('T')[0];
        } else if (dueDate instanceof Date) {
          dueDate = dueDate.toISOString().split('T')[0];
        } else if (typeof dueDate === 'string') {
          // Try to parse string date
          try {
            dueDate = new Date(dueDate).toISOString().split('T')[0];
          } catch (e) {
            dueDate = dueDate;
          }
        }
        
        const row = [
          `"${(reminder.title || '').replace(/"/g, '""')}"`,
          reminder.category || '',
          reminder.amount || 0,
          dueDate || '',
          reminder.status || 'pending',
          reminder.isRecurring ? 'Yes' : 'No',
          reminder.isRecurring ? reminder.frequency || '' : '',
          `"${(reminder.notes || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
      });
      
      csv += '\n'; // Add blank line between sections
    }
    
    // Process categories
    if (exportOptions.categories && data.categories.length > 0) {
      csv += 'CATEGORIES\n';
      
      // Headers
      const categoryHeaders = ['Name', 'Type', 'Color'];
      csv += categoryHeaders.join(',') + '\n';
      
      // Data rows
      data.categories.forEach(category => {
        const row = [
          `"${(category.name || '').replace(/"/g, '""')}"`,
          category.type || '',
          category.color || ''
        ];
        csv += row.join(',') + '\n';
      });
    }
    
    return csv;
  };

  // Handle data export - actually download the file
  const handleExport = () => {
    try {
      setExporting(true);
      setError('');
      
      const filteredData = getFilteredData();
      let exportData;
      let fileName;
      let fileType;
      
      // Create export date string for filename
      const today = new Date().toISOString().split('T')[0];
      
      if (exportFormat === 'json') {
        exportData = prepareJsonData(filteredData);
        fileName = `moneymate_export_${today}.json`;
        fileType = 'application/json';
        exportData = JSON.stringify(exportData, null, 2);
      } else { // CSV
        exportData = prepareCsvData(filteredData);
        fileName = `moneymate_export_${today}.csv`;
        fileType = 'text/csv';
      }
      
      // Create download link
      const blob = new Blob([exportData], { type: fileType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      setSuccess(`Data exported successfully to ${fileName}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error("Error exporting data:", err);
      setError("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Check if at least one export option is selected
  const canExport = Object.values(exportOptions).some(val => val) && 
                    dateRange.startDate && 
                    dateRange.endDate &&
                    new Date(dateRange.startDate) <= new Date(dateRange.endDate) &&
                    auth.currentUser; // Only allow export if user is logged in

  // Calculate total items to be exported
  const getTotalExportCount = () => {
    const data = getFilteredData();
    let count = 0;
    
    if (exportOptions.transactions) count += data.transactions.length;
    if (exportOptions.budgets) count += data.budgets.length;
    if (exportOptions.reminders) count += data.reminders.length;
    if (exportOptions.categories) count += data.categories.length;
    
    return count;
  };

  // Handle preset change
  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
  };

  return (
    <div className="data-export-container">
      {/* User authentication check */}
      {!auth.currentUser && (
        <div className="alert alert-warning">
          <AlertCircle className="alert-icon" size={18} />
          <span>Please log in to access your data for export.</span>
        </div>
      )}
      
      {/* Alert messages */}
      {error && (
        <div className="alert alert-danger">
          <AlertCircle className="alert-icon" size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <Check className="alert-icon" size={18} />
          <span>{success}</span>
        </div>
      )}

    <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Export your data</h2>
            <p className="text-blue-700">
            This page provides a secure way to download your complete financial records. 
            Select from various time periods and choose which financial data to include. 
            Your exported data can be downloaded as a CSV spreadsheet for use in Excel or 
            as JSON for data analysis tools. Having backups of your financial information 
            helps to protect your records and make it easy to track your long-term financial 
            progress outside of the app. 
            </p>
          </div>
      
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">
            <Download size={20} className="mr-2" />
            Export Your Financial Data
          </h2>
        </div>
        
        <div className="card-body">
          <p className="text-secondary mb-4">
            Download your financial data in CSV or JSON format for backup or analysis in other applications.
          </p>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner"></div>
              <p className="mt-2">Loading your financial data...</p>
            </div>
          ) : (
            <>
              {/* Export Options */}
              <div className="export-settings">
                <div className="section">
                  <h3 className="section-title">
                    <Calendar size={18} className="mr-2" />
                    Date Range
                  </h3>
                  <div className="date-preset-selector">
                    {datePresets.map(preset => (
                      <button
                        key={preset.id}
                        className={`preset-button ${selectedPreset === preset.id ? 'active' : ''}`}
                        onClick={() => handlePresetChange(preset.id)}
                        disabled={!auth.currentUser}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  
                  {selectedPreset === 'custom' && (
                    <div className="date-range-selector mt-3">
                      <div className="form-group">
                        <label htmlFor="start-date" className="form-label">Start Date</label>
                        <input
                          type="date"
                          id="start-date"
                          className="form-control"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                          disabled={!auth.currentUser}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="end-date" className="form-label">End Date</label>
                        <input
                          type="date"
                          id="end-date"
                          className="form-control"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                          disabled={!auth.currentUser}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="date-range-display mt-2">
                    <p className="text-sm">
                      From: <span className="font-semibold">{dateRange.startDate}</span><br />
                      To: <span className="font-semibold">{dateRange.endDate}</span>
                    </p>
                  </div>
                </div>
                
                <div className="section">
                  <h3 className="section-title">
                    <FileText size={18} className="mr-2" />
                    Export Format
                  </h3>
                  <div className="format-selector">
                    <div className="form-check">
                      <input
                        type="radio"
                        id="format-csv"
                        className="form-check-input"
                        checked={exportFormat === 'csv'}
                        onChange={() => setExportFormat('csv')}
                        disabled={!auth.currentUser}
                      />
                      <label htmlFor="format-csv" className="form-check-label">
                        <Table size={16} className="mr-1" />
                        CSV (Spreadsheet)
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        type="radio"
                        id="format-json"
                        className="form-check-input"
                        checked={exportFormat === 'json'}
                        onChange={() => setExportFormat('json')}
                        disabled={!auth.currentUser}
                      />
                      <label htmlFor="format-json" className="form-check-label">
                        <FileText size={16} className="mr-1" />
                        JSON (Data)
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="section">
                  <h3 className="section-title">
                    <Settings size={18} className="mr-2" />
                    Data to Include
                  </h3>
                  <div className="data-selector">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="include-transactions"
                        className="form-check-input"
                        checked={exportOptions.transactions}
                        onChange={() => setExportOptions({...exportOptions, transactions: !exportOptions.transactions})}
                        disabled={!auth.currentUser}
                      />
                      <label htmlFor="include-transactions" className="form-check-label">
                        Transactions ({auth.currentUser ? getFilteredData().transactions.length : 0})
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="include-budgets"
                        className="form-check-input"
                        checked={exportOptions.budgets}
                        onChange={() => setExportOptions({...exportOptions, budgets: !exportOptions.budgets})}
                        disabled={!auth.currentUser}
                      />
                      <label htmlFor="include-budgets" className="form-check-label">
                        Budgets ({auth.currentUser ? budgets.length : 0})
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="include-reminders"
                        className="form-check-input"
                        checked={exportOptions.reminders}
                        onChange={() => setExportOptions({...exportOptions, reminders: !exportOptions.reminders})}
                        disabled={!auth.currentUser}
                      />
                      <label htmlFor="include-reminders" className="form-check-label">
                        Payment Reminders ({auth.currentUser ? getFilteredData().reminders.length : 0})
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="include-categories"
                        className="form-check-input"
                        checked={exportOptions.categories}
                        onChange={() => setExportOptions({...exportOptions, categories: !exportOptions.categories})}
                        disabled={!auth.currentUser}
                      />
                      <label htmlFor="include-categories" className="form-check-label">
                        Categories ({auth.currentUser ? categories.length : 0})
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="export-summary">
                <div className="summary-text">
                  <BarChart size={18} className="mr-1" />
                  {auth.currentUser ? (
                    `${getTotalExportCount()} items will be exported from ${dateRange.startDate} to ${dateRange.endDate}`
                  ) : (
                    'Log in to export your data'
                  )}
                </div>
                
                <button
                  className="btn btn-primary"
                  onClick={handleExport}
                  disabled={exporting || !canExport}
                >
                  {exporting ? (
                    <>
                      <div className="spinner-sm mr-1"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={18} className="mr-1" />
                      Export {exportFormat.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="card mt-4">
        <div className="card-header">
          <h2 className="card-title">
            <FileSpreadsheet size={20} className="mr-2" />
            Data Privacy & Backup
          </h2>
        </div>
        
        <div className="card-body">
          <div className="privacy-info">
            <h3>About Your Data</h3>
            <p>
              MoneyMate is committed to protecting your financial data. The data you export:
            </p>
            <ul>
              <li>Contains no personally identifiable information beyond what you've entered</li>
              <li>Is sent directly to you</li>
              <li>Can be used to restore your data if needed</li>
            </ul>
            
            <h3 className="mt-4">Backup Recommendations</h3>
            <p>
              We recommend exporting your data regularly to ensure you have a backup:
            </p>
            <ul>
              <li>Export at least once per month</li>
              <li>Store backups in a secure location</li>
            </ul>
            
            <h3 className="mt-4">How to Use Exported Data</h3>
            <p>
              Your exported data can be:
            </p>
            <ul>
              <li>Opened in spreadsheet applications (CSV format)</li>
              <li>Processed by external data analysis tools (JSON format)</li>
              <li>Imported back into MoneyMate if needed (feature coming soon)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;