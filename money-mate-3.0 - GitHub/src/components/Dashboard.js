import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, doc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { 
  BarChart as BarChartIcon, 
  TrendingUp,  
  CreditCard, 
  PieChart as PieChartIcon, 
  Bell,
  Download,
  Tag,
  ChevronDown,
  Home,
  PoundSterling,
  Calculator,
  Wallet,
  Briefcase,
  Menu, 
  X    
} from 'lucide-react';

// Components
import Header from './Header';
import Overview from './dashboard/Overview';
import Transactions from './dashboard/Transactions';
import Budget from './dashboard/Budget';
import Investments from './dashboard/Investments';
import Insights from './dashboard/Insights';
import Profile from './dashboard/Profile';
import Categories from './dashboard/Categories';
import Reminders from './dashboard/Reminders';
import DataExport from './dashboard/DataExport';

const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [openSection, setOpenSection] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [savings, setSavings] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle
  
  const navigate = useNavigate();

  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when changing routes on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Toggle section open/close
  const toggleSection = (section) => {
    if (openSection === section) {
      setOpenSection(null);
    } else {
      setOpenSection(section);
    }
  };

  // Check if a tab is in the given section
  const isTabInSection = (tab, section) => {
    if (section === 'dashboard') {
      return tab === 'overview' || tab === 'insights';
    } else if (section === 'transactions') {
      return tab === 'transactions' || tab === 'export';
    } else if (section === 'budgeting') {
      return tab === 'budget' || tab === 'reminders';
    } else if (section === 'planning') {
      return tab === 'savings' || tab === 'categories' || tab === 'investments';
    } else if (section === 'profile') {
      return tab === 'profile';
    }
    return false;
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

 /* useEffect(() => {
    fetch('http://localhost:5000/api/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data));
  }, []); */
  
  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch transactions
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
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
          where('userId', '==', user.uid)
        );
        const budgetsSnapshot = await getDocs(budgetsQuery);
        const budgetData = {};
        budgetsSnapshot.docs.forEach(doc => {
          const budget = doc.data();
          budgetData[budget.category] = {
            id: doc.id,
            amount: budget.amount
          };
        });
        setBudgets(budgetData);

        /* Fetch savings
        const savingsQuery = query(
          collection(db, 'savings'),
          where('userId', '==', user.uid),
          orderBy('date', 'asc')
        );
        const savingsSnapshot = await getDocs(savingsQuery);
        const savingsList = savingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSavings(savingsList); */

        // Fetch investments
        const investmentsQuery = query(
          collection(db, 'investments'),
          where('userId', '==', user.uid)
        );
        const investmentsSnapshot = await getDocs(investmentsQuery);
        const investmentsList = investmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInvestments(investmentsList);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Add a new transaction
  const addTransaction = async (transaction) => {
    try {
      const transactionData = {
        ...transaction,
        userId: user.uid,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      
      setTransactions([
        {
          id: docRef.id,
          ...transactionData
        },
        ...transactions
      ]);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return { success: false, error };
    }
  };

  // Delete a transaction
  const deleteTransaction = async (id) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setTransactions(transactions.filter(t => t.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, error };
    }
  };

  // Update budget
  const updateBudget = async (category, amount) => {
    try {
      if (budgets[category]) {
        // Update existing budget
        const budgetRef = doc(db, 'budgets', budgets[category].id);
        await updateDoc(budgetRef, { amount });
        
        setBudgets({
          ...budgets,
          [category]: {
            ...budgets[category],
            amount
          }
        });
      } else {
        // Create new budget
        const budgetData = {
          userId: user.uid,
          category,
          amount,
          createdAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'budgets'), budgetData);
        
        setBudgets({
          ...budgets,
          [category]: {
            id: docRef.id,
            amount
          }
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating budget:', error);
      return { success: false, error };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  // Calculate derived data
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);
  const totalInvestments = investments.reduce((sum, i) => sum + i.value, 0);
  
  const netWorth = totalIncome - totalExpenses + totalSavings + totalInvestments;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <Header user={user} onSignOut={handleSignOut} />
      <div className="mobile-toggle  items-center">
        <button 
          onClick={toggleSidebar} 
          className="toggle-button flex items-center justify-center p-1 mt-3"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>


      
      {/* Main Content with Sidebar */}
      <div className="dashboard-layout">
        {/* Sidebar Navigation */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-container">
            {/* Close button for mobile view */}
            <div className="mobile-close">
              <button onClick={toggleSidebar} className="close-button">
                <X size={20} />
              </button>
            </div>
            
            {/* Profile Link */}
            <div className="profile-link">
              <Link 
                to="/dashboard/profile"
                className={`${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('profile');
                  if (window.innerWidth <= 768) setSidebarOpen(false);
                }}
              >
                <div className="user-avatar">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.displayName || 'User'}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </Link>
            </div>

            {/* 1. Dashboard Section */}
            <div className="nav-section">
              <div 
                className={`section-header ${openSection === 'dashboard' ? 'active' : ''}`} 
                onClick={() => toggleSection('dashboard')}
              >
                <Home size={18} className="section-icon" />
                <span>Dashboard</span>
                <ChevronDown 
                  size={16} 
                  className={`section-arrow ${openSection === 'dashboard' ? 'rotated' : ''}`} 
                />
              </div>
              
              {(openSection === 'dashboard' || isTabInSection(activeTab, 'dashboard')) && (
                <div className="section-items">
                  <Link 
                    to="/dashboard"
                    className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('overview');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <BarChartIcon className="nav-icon" size={16} />
                    <span>Overview</span>
                  </Link>
                  <Link 
                    to="/dashboard/insights"
                    className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('insights');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <Calculator className="nav-icon" size={16} />
                    <span>ML Insights</span>
                  </Link>
                </div>
              )}
            </div>
            
            {/* 2. Transactions Section */}
            <div className="nav-section">
              <div 
                className={`section-header ${openSection === 'transactions' ? 'active' : ''}`} 
                onClick={() => toggleSection('transactions')}
              >
                <Wallet size={18} className="section-icon" />
                <span>Transactions</span>
                <ChevronDown 
                  size={16} 
                  className={`section-arrow ${openSection === 'transactions' ? 'rotated' : ''}`} 
                />
              </div>
              
              {(openSection === 'transactions' || isTabInSection(activeTab, 'transactions')) && (
                <div className="section-items">
                  <Link 
                    to="/dashboard/transactions"
                    className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('transactions');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <CreditCard className="nav-icon" size={16} />
                    <span>Transactions</span>
                  </Link>
                  <Link 
                    to="/dashboard/export"
                    className={`nav-item ${activeTab === 'export' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('export');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <Download className="nav-icon" size={16} />
                    <span>Export Data</span>
                  </Link>
                </div>
              )}
            </div>
            
            {/* 3. Budgeting Section */}
            <div className="nav-section">
              <div 
                className={`section-header ${openSection === 'budgeting' ? 'active' : ''}`} 
                onClick={() => toggleSection('budgeting')}
              >
                <PoundSterling size={18} className="section-icon" />
                <span>Budgeting</span>
                <ChevronDown 
                  size={16} 
                  className={`section-arrow ${openSection === 'budgeting' ? 'rotated' : ''}`} 
                />
              </div>
              
              {(openSection === 'budgeting' || isTabInSection(activeTab, 'budgeting')) && (
                <div className="section-items">
                  <Link 
                    to="/dashboard/budget"
                    className={`nav-item ${activeTab === 'budget' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('budget');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <PieChartIcon className="nav-icon" size={16} />
                    <span>Budget</span>
                  </Link>
                  <Link 
                    to="/dashboard/reminders"
                    className={`nav-item ${activeTab === 'reminders' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('reminders');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <Bell className="nav-icon" size={16} />
                    <span>Reminders</span>
                  </Link>
                </div>
              )}
            </div>
            
            {/* 4. Financial Planning Section */}
            <div className="nav-section">
              <div 
                className={`section-header ${openSection === 'planning' ? 'active' : ''}`} 
                onClick={() => toggleSection('planning')}
              >
                <Briefcase size={18} className="section-icon" />
                <span>Financial Planning</span>
                <ChevronDown 
                  size={16} 
                  className={`section-arrow ${openSection === 'planning' ? 'rotated' : ''}`} 
                />
              </div>
              
              {(openSection === 'planning' || isTabInSection(activeTab, 'planning')) && (
                <div className="section-items">
                  <Link 
                    to="/dashboard/categories"
                    className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('categories');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <Tag className="nav-icon" size={16} />
                    <span>Categories</span>
                  </Link>
                  <Link 
                    to="/dashboard/investments"
                    className={`nav-item ${activeTab === 'investments' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('investments');
                      if (window.innerWidth <= 768) setSidebarOpen(false);
                    }}
                  >
                    <TrendingUp className="nav-icon" size={16} />
                    <span>Investments</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="dashboard-main">
          <div className="main-container">
            <Routes>
              <Route path="/" element={
                <Overview 
                  transactions={transactions} 
                  budgets={budgets}
                  totalIncome={totalIncome}
                  totalExpenses={totalExpenses}
                  totalSavings={totalSavings}
                  totalInvestments={totalInvestments}
                  netWorth={netWorth}
                  currencySymbol="£"
                />
              } />
              <Route path="/transactions" element={
                <Transactions 
                  transactions={transactions}
                  addTransaction={addTransaction}
                  deleteTransaction={deleteTransaction}
                  currencySymbol="£"
                />
              } />
              <Route path="/budget" element={
                <Budget 
                  transactions={transactions}
                  budgets={budgets}
                  updateBudget={updateBudget}
                  currencySymbol="£"
                />
              } />
              <Route path="/categories" element={
                <Categories 
                  user={user}
                  currencySymbol="£"
                />
              } />
              <Route path="/investments" element={
                <Investments 
                  investments={investments}
                  currencySymbol="£"
                />
              } />
              <Route path="/reminders" element={
                <Reminders 
                  user={user}
                  currencySymbol="£"
                />
              } />
              <Route path="/insights" element={
                <Insights 
                  transactions={transactions}
                  budgets={budgets}
                  savings={savings}
                  totalIncome={totalIncome}
                  totalExpenses={totalExpenses}
                  currencySymbol="£"
                />
              } />
              <Route path="/export" element={
                <DataExport 
                  user={user}
                  currencySymbol="£"
                />
              } />
              <Route path="/profile" element={
              <Profile 
                  user={user}
                  currencySymbol="£"
                  onSignOut={handleSignOut}
                />
              } />
            </Routes>
          </div>
        </main>
      </div>
      
      {/* Backdrop for mobile */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}
      
      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-container">
          <p>MoneyMate © 2025 | Your Financial Friend</p>
        </div>
      </footer>
      
      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: var(--color-background);
          position: relative;
        }
        
        .dashboard-layout {
          display: flex;
          flex: 1;
        }
        
        /* Mobile toggle button */
        .mobile-toggle {
          display: none;
          position: fixed;
          top: 15px;
          left: 15px;
          z-index: 1000;
          background-color: var(--color-primary);
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .toggle-button {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: white;
          cursor: pointer;
        }
        
        /* Mobile close button inside sidebar */
        .mobile-close {
          display: none;
          text-align: right;
          padding: 10px;
        }
        
        .close-button {
          background: transparent;
          border: none;
          color: var(--color-text);
          cursor: pointer;
        }
        
        /* Backdrop for mobile */
        .sidebar-backdrop {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 100;
        }
        
        .dashboard-sidebar {
          width: 280px;
          background-color: white;
          border-right: 1px solid #e5e7eb;
          overflow-y: auto;
          flex-shrink: 0;
          height: calc(100vh - 64px - 56px); /* Adjust for header and footer */
          position: sticky;
          top: 64px; /* Height of header */
          z-index: 200;
          transition: transform 0.3s ease, width 0.3s ease;
        }
        
        .sidebar-container {
          padding: 1.5rem 0;
        }
        
        .profile-link {
          padding: 0 1rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }
        
        .profile-link a {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: var(--color-text);
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: background-color 0.2s;
        }
        
        .profile-link a:hover {
          background-color: #f3f4f6;
        }
        
        .profile-link a.active {
          background-color: #f3f4f6;
        }
        
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .user-name {
          font-weight: 500;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .user-email {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .nav-section {
          margin-bottom: 0.5rem;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          color: var(--color-text);
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .section-header:hover {
          background-color: #f9fafb;
        }
        
        .section-header.active {
          background-color: #f3f4f6;
        }
        
        .section-icon {
          margin-right: 0.75rem;
          flex-shrink: 0;
        }
        
        .section-arrow {
          margin-left: auto;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        
        .section-arrow.rotated {
          transform: rotate(180deg);
        }
        
        .section-items {
          padding: 0.5rem 0;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.625rem 1.5rem 0.625rem 3rem;
          color: var(--color-text);
          text-decoration: none;
          font-size: 0.875rem;
          transition: background-color 0.2s;
        }
        
        .nav-item:hover {
          background-color: #f9fafb;
        }
        
        .nav-item.active {
          background-color: var(--color-primary-light);
          color: white;
          font-weight: 500;
        }
        
        .nav-icon {
          margin-right: 0.5rem;
          flex-shrink: 0;
        }
        
        .dashboard-main {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }
        
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-footer {
          background-color: var(--color-text);
          color: white;
          padding: 1rem;
          text-align: center;
        }
        
        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 3px solid var(--color-primary);
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .mobile-toggle {
            display: flex;
          }
          
          .mobile-close {
            display: block;
          }
          
          .sidebar-backdrop {
            display: block;
          }
          
          .dashboard-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            height: 100vh;
            transform: translateX(-100%);
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          }
          
          .dashboard-sidebar.open {
            transform: translateX(0);
          }
          
          .dashboard-sidebar.closed {
            width: 0;
            padding: 0;
            border: none;
          }
          
          .dashboard-main {
            padding: 1.5rem 1rem;
            margin-top: 40px; /* Space for the toggle button */
          }
        }
        
        @media (max-width: 480px) {
          .dashboard-sidebar {
            width: 85%;
          }
          
          .dashboard-main {
            padding: 1rem;
          }
          
          .user-email {
            max-width: 180px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;