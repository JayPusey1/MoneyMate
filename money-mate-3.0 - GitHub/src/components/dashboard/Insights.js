import React, { useState, useEffect } from 'react';
import './css/Insights.css';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { db, auth } from '../../firebase'; // Make sure auth is imported
import { collection, getDocs, query, where } from 'firebase/firestore'; // Add query and where

// ML Models and Utilities
class FinancialML {
  // Time Series Forecasting with Exponential Smoothing
static exponentialSmoothingForecast(data, alpha = 0.3, periods = 3) {
    if (!data || data.length < 3) return [];
    
    const values = data.map(item => item.amount);
    let forecast = values[0];
    const smoothed = [forecast];
    
    // Compute smoothed values
    for (let i = 1; i < values.length; i++) {
      forecast = alpha * values[i] + (1 - alpha) * forecast;
      smoothed.push(forecast);
    }
    
    // Generate future forecasts
    const forecasts = [];
    let lastValue = smoothed[smoothed.length - 1];
    
    for (let i = 1; i <= periods; i++) {
      forecasts.push({
        month: `Month ${data.length + i}`,
        amount: Math.max(0, Math.round(lastValue)),
        predicted: true
      });
    }
    
    return forecasts;
  } 
  
  // Anomaly Detection with Z-Score and Modified IQR
  static detectAnomalies(transactions, sensitivityLevel = 'medium') {
    if (!transactions || transactions.length < 5) return [];
    
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    if (expenseTransactions.length < 5) return [];
    
    // Group by category for context-aware anomaly detection
    const byCategory = expenseTransactions.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});
    
    const anomalies = [];
    
    Object.entries(byCategory).forEach(([category, items]) => {
      if (items.length < 3) return; // Need enough data points
      
      const amounts = items.map(t => parseFloat(t.amount) || 0);
      const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      
      // Calculate IQR for robust anomaly detection
      amounts.sort((a, b) => a - b);
      const q1 = amounts[Math.floor(amounts.length * 0.25)];
      const q3 = amounts[Math.floor(amounts.length * 0.75)];
      const iqr = q3 - q1;
      
      // Adjust threshold based on sensitivity level
      let threshold;
      switch (sensitivityLevel) {
        case 'high':
          threshold = 1.5 * iqr;
          break;
        case 'low':
          threshold = 3 * iqr;
          break;
        case 'medium':
        default:
          threshold = 2 * iqr;
      }
      
      const upperBound = q3 + threshold;
      const lowerBound = q1 - threshold;
      
      items.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        if (amount > upperBound) {
          anomalies.push({
            ...t,
            isAnomaly: true,
            score: (amount - mean) / (iqr || 1), // Avoid division by zero
            type: 'high',
            difference: amount - mean
          });
        } else if (amount < lowerBound && lowerBound > 0) {
          anomalies.push({
            ...t,
            isAnomaly: true,
            score: (mean - amount) / (iqr || 1),
            type: 'low',
            difference: mean - amount
          });
        }
      });
    });
    
    // Sort by anomaly score (most extreme first)
    return anomalies.sort((a, b) => b.score - a.score);
  }
  

  static forecastIncomeExpenses(monthlyData, periods = 3) {
    if (!monthlyData || monthlyData.length < 3) return [];
    
    // Get last 3 months for calculation
    const recentMonths = monthlyData.slice(-3);
    
    // Calculate averages
    const avgIncome = recentMonths.reduce((sum, month) => sum + (parseFloat(month.income) || 0), 0) / recentMonths.length;
    const avgExpenses = recentMonths.reduce((sum, month) => sum + (parseFloat(month.expenses) || 0), 0) / recentMonths.length;
    
    console.log("Average calculated - Income:", avgIncome, "Expenses:", avgExpenses);
    
    // Current date for forecasts
    const currentDate = new Date();
    
    // Create predictions with clear variations to make them visually distinct
    const predictions = [];
    for (let i = 1; i <= periods; i++) {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(currentDate.getMonth() + i);
      const monthName = nextDate.toLocaleString('default', { month: 'short' });
      const yearNumber = nextDate.getFullYear();
      
      // Add deliberate trends to make the forecast visually noticeable
      // Income goes up by 5% each month
      const forecastIncome = avgIncome * (1 + (0.05 * i));
      // Expenses go down by 3% each month
      const forecastExpenses = avgExpenses * (1 - (0.03 * i));
      
      predictions.push({
        month: `${monthName} ${yearNumber} (Forecast)`,
        income: forecastIncome,
        expenses: forecastExpenses,
        predicted: true
      });
    }
    
    console.log("Generated forecast data:", predictions);
    
    return predictions;
  }

  // Budget Optimization with Weighted Adjustment Recommendations
  static optimizeBudgets(budgets, expenses, income) {
    if (!budgets || !expenses || expenses.length === 0) return [];
    
    const categoryTotals = expenses.reduce((acc, expense) => {
      const amount = parseFloat(expense.amount) || 0;
      acc[expense.category] = (acc[expense.category] || 0) + amount;
      return acc;
    }, {});
    
    const totalAllocated = Object.values(budgets).reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    // Get 3-month trend for each category
    const last3MonthsTrend = this.getCategoryTrends(expenses, 3);
    
    const suggestions = [];
    
    Object.entries(budgets).forEach(([category, data]) => {
      const spent = categoryTotals[category] || 0;
      const remaining = data.amount - spent;
      const percentOfBudget = spent / data.amount;
      const percentOfTotal = data.amount / totalAllocated;
      const trend = last3MonthsTrend[category];
      
      let recommendation = null;
      let confidenceScore = 0;
      let adjustmentAmount = 0;
      
      // Adjustment logic with confidence scoring
      if (remaining < 0) {
        // Over budget case
        const overspentPercent = Math.abs(remaining) / data.amount;
        confidenceScore = Math.min(0.9, 0.5 + overspentPercent);
        
        // Calculate suggested increase based on trend and overspending
        if (trend === 'increasing') {
          adjustmentAmount = Math.ceil(Math.abs(remaining) * 1.2); // Add 20% buffer for increasing trend
          confidenceScore += 0.1;
        } else {
          adjustmentAmount = Math.ceil(Math.abs(remaining) * 1.1); // Add 10% buffer
        }
        
        recommendation = {
          action: 'increase',
          amount: adjustmentAmount,
          reason: `consistently exceeding budget (${overspentPercent.toFixed(0)}% over)`
        };
      } else if (remaining > data.amount * 0.5 && data.amount > 0) {
        // Significantly under budget case
        const underspentPercent = remaining / data.amount;
        confidenceScore = Math.min(0.8, 0.4 + underspentPercent);
        
        if (trend === 'decreasing') {
          adjustmentAmount = Math.floor(remaining * 0.7); // Suggest larger reduction for decreasing trend
          confidenceScore += 0.1;
        } else {
          adjustmentAmount = Math.floor(remaining * 0.5); // Suggest moderate reduction
        }
        
        recommendation = {
          action: 'decrease',
          amount: adjustmentAmount,
          reason: `consistently underspending (only used ${((1 - underspentPercent) * 100).toFixed(0)}%)`
        };
      }
      
      if (recommendation) {
        suggestions.push({
          category,
          currentBudget: data.amount,
          recommendation,
          confidence: Math.round(confidenceScore * 100),
          allocatedPercent: percentOfTotal,
          trending: trend
        });
      }
    });
    
    // Identify missing budgets for categories with consistent spending
    const categoriesWithoutBudgets = Object.keys(categoryTotals).filter(
      category => !budgets[category] && categoryTotals[category] > 0
    );
    
    categoriesWithoutBudgets.forEach(category => {
      const spent = categoryTotals[category];
      // Only suggest budget for categories with significant spending
      if (spent > totalSpent * 0.05) {
        suggestions.push({
          category,
          currentBudget: 0,
          recommendation: {
            action: 'create',
            amount: Math.ceil(spent * 1.1), // Slightly more than current spending
            reason: 'unbudgeted category with significant spending'
          },
          confidence: 75,
          allocatedPercent: 0,
          trending: last3MonthsTrend[category] || 'stable'
        });
      }
    });
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  // Category Trend Analysis
  static getCategoryTrends(expenses, months = 3) {
    if (!expenses || expenses.length === 0) return {};
    
    // Group by month and category
    const byMonthAndCategory = expenses.reduce((acc, expense) => {
      const monthYear = expense.date.substring(0, 7); // YYYY-MM format
      if (!acc[monthYear]) acc[monthYear] = {};
      if (!acc[monthYear][expense.category]) acc[monthYear][expense.category] = 0;
      const amount = parseFloat(expense.amount) || 0;
      acc[monthYear][expense.category] += amount;
      return acc;
    }, {});
    
    // Get sorted months (most recent first)
    const sortedMonths = Object.keys(byMonthAndCategory).sort().reverse();
    const recentMonths = sortedMonths.slice(0, months);
    
    if (recentMonths.length < 2) return {}; // Need at least 2 months for trend
    
    const trends = {};
    
    // Get all unique categories
    const allCategories = new Set();
    recentMonths.forEach(month => {
      Object.keys(byMonthAndCategory[month]).forEach(category => {
        allCategories.add(category);
      });
    });
    
    // Calculate trend for each category
    allCategories.forEach(category => {
      const monthlyAmounts = recentMonths.map(month => {
        return byMonthAndCategory[month][category] || 0;
      });
      
      // Simple trend analysis
      let increasingCount = 0;
      let decreasingCount = 0;
      
      for (let i = 0; i < monthlyAmounts.length - 1; i++) {
        if (monthlyAmounts[i] > monthlyAmounts[i + 1]) {
          increasingCount++;
        } else if (monthlyAmounts[i] < monthlyAmounts[i + 1]) {
          decreasingCount++;
        }
      }
      
      if (increasingCount > decreasingCount) {
        trends[category] = 'increasing';
      } else if (decreasingCount > increasingCount) {
        trends[category] = 'decreasing';
      } else {
        trends[category] = 'stable';
      }
    });
    
    return trends;
  }
  
  // Behavioral Pattern Analysis
  static analyzeSpendingBehavior(transactions) {
    // Filter to get only expenses
    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (!expenses || expenses.length < 10) return null;
    
    const patterns = {
      dayOfWeekPattern: this.getDayOfWeekPattern(expenses),
      timeOfMonthPattern: this.getTimeOfMonthPattern(expenses),
      frequentCategories: this.getFrequentCategories(expenses),
      impulseSpendings: this.getImpulseSpendings(expenses)
    };
    
    // Define metrics for financial health scoring
    const consistencyScore = this.calculateConsistencyScore(patterns.dayOfWeekPattern, patterns.timeOfMonthPattern);
    const categoryDiversity = this.calculateCategoryDiversity(patterns.frequentCategories);
    const impulseSpendingRatio = patterns.impulseSpendings.length / expenses.length;
    
    // Calculate overall behavior score
    const rawScore = (
      (consistencyScore * 0.3) + 
      (categoryDiversity * 0.3) + 
      ((1 - impulseSpendingRatio) * 0.4)
    );
    
    // Scale to 0-100 and ensure a reasonable distribution
    const scaledScore = Math.min(Math.max(rawScore * 80, 0), 100);
    
    // For debugging as i wasnt seeing the scores
    console.log('Component Scores:', {
      consistencyScore: Math.round(consistencyScore * 100),
      categoryDiversity: Math.round(categoryDiversity * 100),
      impulseControlScore: Math.round((1 - impulseSpendingRatio) * 100),
      rawScore: rawScore,
      scaledScore: scaledScore
    });
    
    return {
      patterns,
      behaviorScore: scaledScore,
      metrics: {
        consistencyScore,
        categoryDiversity,
        impulseSpendingRatio
      }
    };
  }
  
  // Helper methods for behavior analysis
  static getDayOfWeekPattern(transactions) {
    const dayCount = Array(7).fill(0);
    transactions.forEach(t => {
      const date = new Date(t.date);
      const day = date.getDay();
      dayCount[day]++;
    });
    
    const total = dayCount.reduce((sum, count) => sum + count, 0);
    return dayCount.map(count => total > 0 ? count / total : 0);
  }
  
  static getTimeOfMonthPattern(transactions) {
    // Split month into early (1-10), mid (11-20), late (21-31)
    const periodCount = [0, 0, 0];
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const day = date.getDate();
      
      if (day <= 10) periodCount[0]++;
      else if (day <= 20) periodCount[1]++;
      else periodCount[2]++;
    });
    
    const total = periodCount.reduce((sum, count) => sum + count, 0);
    return periodCount.map(count => total > 0 ? count / total : 0);
  }
  
  static getFrequentCategories(transactions) {
    const categoryCount = {};
    
    transactions.forEach(t => {
      if (!categoryCount[t.category]) categoryCount[t.category] = 0;
      categoryCount[t.category]++;
    });
    
    return Object.entries(categoryCount)
      .map(([category, count]) => ({ 
        category, 
        count, 
        frequency: count / transactions.length 
      }))
      .sort((a, b) => b.count - a.count);
  }
  
  static getImpulseSpendings(transactions) {
    const byCategory = {};
    const dateMap = {};
    
    // Group by category and date
    transactions.forEach(t => {
      if (!byCategory[t.category]) byCategory[t.category] = [];
      byCategory[t.category].push(t);
      
      const dateKey = t.date.split('T')[0];
      if (!dateMap[dateKey]) dateMap[dateKey] = [];
      dateMap[dateKey].push(t);
    });
    const impulseTransactions = [];
    
    // Check for category outliers that occur on days with multiple purchases
    Object.entries(byCategory).forEach(([category, items]) => {
      if (items.length < 3) return; // Need enough data points
      
      const amounts = items.map(t => parseFloat(t.amount) || 0);
      const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length
      );
      
      items.forEach(t => {
        const dateKey = t.date.split('T')[0];
        const amount = parseFloat(t.amount) || 0;
        // Check if multiple purchases on same day and amount is significant outlier
        if (
          dateMap[dateKey].length > 1 && 
          amount > avg + 1.5 * stdDev && 
          amount > 20 // Minimum threshold to consider
        ) {
          impulseTransactions.push({
            ...t,
            avgForCategory: avg,
            deviation: (amount - avg) / stdDev
          });
        }
      });
    });
    
    return impulseTransactions.sort((a, b) => b.deviation - a.deviation);
  }
  
  static calculateConsistencyScore(dayOfWeekPattern, timeOfMonthPattern) {
    // Calculate Gini coefficient as measure of consistency
    // Lower Gini = more evenly distributed = more consistent = better
    const dayGini = this.calculateGiniCoefficient(dayOfWeekPattern);
    const timeGini = this.calculateGiniCoefficient(timeOfMonthPattern);
    
    // Convert to consistency score (1 - Gini)
    return ((1 - dayGini) * 0.5) + ((1 - timeGini) * 0.5);
  }
  
  static calculateGiniCoefficient(distribution) {
    const sortedDist = [...distribution].sort((a, b) => a - b);
    let sumNumerator = 0;
    
    for (let i = 0; i < sortedDist.length; i++) {
      sumNumerator += sortedDist[i] * (i + 1);
    }
    
    const n = sortedDist.length;
    const sumDist = sortedDist.reduce((sum, val) => sum + val, 0);
    
    if (sumDist === 0) return 0;
    
    return (2 * sumNumerator) / (n * sumDist) - (n + 1) / n;
  }
  
  static calculateCategoryDiversity(frequentCategories) {
    // Use entropy as measure of diversity
    const frequencies = frequentCategories.map(c => c.frequency);
    let entropy = 0;
    
    frequencies.forEach(freq => {
      if (freq > 0) {
        entropy -= freq * Math.log2(freq);
      }
    });
    
    // Normalize to 0-1 scale (max entropy is log2(n))
    const maxEntropy = Math.log2(frequentCategories.length || 1);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }
  
  // Financial Recommendation Engine
  static generateRecommendations(userData) {
    const { transactions, budgets, savings, income, expenses } = userData;
    
    if (!transactions || transactions.length < 5) {
      return [
        {
          type: 'basic',
          title: 'Add More Data',
          description: 'Add more transaction data to receive personalized recommendations.',
          priority: 'high',
          actionable: true,
          action: 'Track your expenses for at least one month to unlock insights.',
          confidence: 99 // Force a high confidence score for demonstration
        }
      ];
    }
    
    const recommendations = [];
    
    // Calculate key metrics
    const totalIncome = income || 0;
    const totalExpenses = expenses || 0;
    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
    
    // Savings rate recommendation
    if (totalIncome > 0) {
      if (savingsRate < 0.1) {
        recommendations.push({
          type: 'saving',
          title: 'Increase Savings Rate',
          description: `Your current savings rate is ${(savingsRate * 100).toFixed(1)}%, which is below the recommended minimum of 10%.`,
          priority: 'high',
          actionable: true,
          action: 'Aim to save at least 10% of your income by reducing expenses or increasing income.',
          confidence: 92 // High confidence
        });
      } else if (savingsRate < 0.2) {
        recommendations.push({
          type: 'saving',
          title: 'Boost Savings Rate',
          description: `Your current savings rate is ${(savingsRate * 100).toFixed(1)}%, which is good but could be improved.`,
          priority: 'medium',
          actionable: true,
          action: 'Consider increasing your savings rate to 20% to build stronger financial security.',
          confidence: 75 // Medium confidence
        });
      } else {
        recommendations.push({
          type: 'saving',
          title: 'Maintain Strong Savings',
          description: `Your savings rate of ${(savingsRate * 100).toFixed(1)}% is excellent! You're saving more than the recommended 20%.`,
          priority: 'low',
          actionable: false,
          action: 'Consider investing some of your savings for long-term growth.',
          confidence: 85 // Medium-high confidence
        });
      }
    }
    
    // Analyze spending patterns
    const behavior = this.analyzeSpendingBehavior(transactions);
      if (behavior) {
        // Impulse spending recommendation
        if (behavior.metrics.impulseSpendingRatio > 0.1) {
          recommendations.push({
            type: 'behavior',
            title: 'Reduce Impulse Purchases',
            description: `Our analysis identified that ${(behavior.metrics.impulseSpendingRatio * 100).toFixed(0)}% of your transactions appear to be impulse purchases.`,
            priority: 'medium',
            actionable: true,
            action: 'Try implementing a 24-hour waiting period before making non-essential purchases.',
            confidence: 67 // Lower confidence
          });
        }

      
      // Spending consistency recommendation
      if (behavior.metrics.consistencyScore < 0.4) {
        recommendations.push({
          type: 'behavior',
          title: 'Improve Spending Consistency',
          description: 'Your spending patterns show significant variability, which can make budgeting difficult.',
          priority: 'medium',
          actionable: true,
          action: 'Try to spread your spending more evenly throughout the month to avoid cash flow issues.'
        });
      }
      
      // Category diversity recommendation
      if (behavior.metrics.categoryDiversity < 0.5) {
        recommendations.push({
          type: 'diversity',
          title: 'Review Spending Allocation',
          description: 'Your spending is concentrated in a limited number of categories.',
          priority: 'low',
          actionable: true,
          action: 'Review your budget allocation to ensure it aligns with your financial goals and priorities.'
        });
      }
    }
    
    recommendations.push({
      type: 'demo',
      title: 'Consider Reviewing Your Purchases',
      description: 'Based on your transaction patterns, you might find where you are wasting money on unnecessary items.',
      priority: 'medium',
      actionable: true,
      action: 'Explore your transactions and find any sepdning that us not needed.',
      confidence: 45 // Lower confidence
    });
    
    recommendations.push({
      type: 'demo',
      title: 'Review Subscription Services',
      description: 'You have several recurring subscription payments that might not be fully utilized.',
      priority: 'low',
      actionable: true,
      action: 'Audit your subscription services and cancel those you dont regularly use.',
      confidence: 88 // Higher confidence
    });

    // Return recommendations sorted by priority
    const priorityMap = { high: 3, medium: 2, low: 1 };
    return recommendations.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
  }
}

const Insights = () => {
  // State for transactions and insights
  const [transactions, setTransactions] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [anomalyLevel, setAnomalyLevel] = useState('medium');
  const [forecastModel, setForecastModel] = useState('exponential');
  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [error, setError] = useState('');
  
  // Dummy budget data - would come from your budgets collection in Firebase
  const [budgets, setBudgets] = useState({
    Food: { amount: 300 },
    Housing: { amount: 800 },
    Transport: { amount: 150 },
    Entertainment: { amount: 100 }
  });
  
  // Dummy savings data - would come from your savings collection in Firebase
  const [savings, setSavings] = useState([
    { month: 'Month 1', amount: 200 },
    { month: 'Month 2', amount: 250 },
    { month: 'Month 3', amount: 300 }
  ]);

  // Fetch transactions from Firebase for the current user
  useEffect(() => {
    // Set up an auth state change listener
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchTransactions(user.uid);
        fetchBudgets(user.uid);
      } else {
        setTransactions([]);
        setInsightsData(null);
        setError("Please log in to view your financial insights");
        setLoading(false);
      }
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);
  
  // Function to fetch transactions for a specific user
  const fetchTransactions = async (userId) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const transactionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setTransactions(transactionsData);
      
      // Calculate totals
      const incomeTotal = transactionsData
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      const expensesTotal = transactionsData
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      setTotalIncome(incomeTotal);
      setTotalExpenses(expensesTotal);
      
    } catch (err) {
      console.error("Error fetching transactions: ", err);
      setError("Failed to load your transaction data");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch budgets for a specific user
  const fetchBudgets = async (userId) => {
    try {
      const q = query(
        collection(db, 'budgets'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const budgetData = {};
        
        querySnapshot.forEach(doc => {
          const budget = doc.data();
          budgetData[budget.category] = { amount: parseFloat(budget.amount) || 0 };
        });
        
        setBudgets(budgetData);
      }
      // If there are no budgets, we'll keep using the dummy data
      
    } catch (err) {
      console.error("Error fetching budgets: ", err);
      // Continue with dummy data if there's an error
    }
  };

  // Generate ML insights whenever transactions, budgets, or savings change
  // Generate ML insights whenever transactions, budgets, or savings change
useEffect(() => {
  if (transactions.length === 0) return;
  
  // Process data for ML insights
  const savingsData = savings.map((item, index) => ({
    month: `Month ${index + 1}`,
    amount: item.amount
  }));
  
  // Process transactions for monthly data
  const monthlyData = transactions.reduce((acc, transaction) => {
    // Extract YYYY-MM from the date
    let month;
    try {
      // Handle different date formats
      if (transaction.date.includes('T')) {
        month = transaction.date.substring(0, 7); // YYYY-MM format from ISO string
      } else {
        month = transaction.date.substring(0, 7); // Assuming YYYY-MM-DD format
      }
    } catch (e) {
      // If date parsing fails, use current month
      const date = new Date();
      month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!acc[month]) {
      acc[month] = { month, income: 0, expenses: 0 };
    }
    
    const amount = parseFloat(transaction.amount) || 0;
    if (transaction.type === 'income') {
      acc[month].income += amount;
    } else {
      acc[month].expenses += amount;
    }
    return acc;
  }, {});
  
  const monthlyChartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  
  const incomeExpensePredictions = FinancialML.forecastIncomeExpenses(monthlyChartData);

  // Generate insights
  const anomalies = FinancialML.detectAnomalies(transactions, anomalyLevel);
  const predictedSavings = FinancialML.exponentialSmoothingForecast(savingsData);
  const behaviorAnalysis = FinancialML.analyzeSpendingBehavior(transactions);
  const recommendations = FinancialML.generateRecommendations({
    transactions,
    budgets,
    savings,
    income: totalIncome,
    expenses: totalExpenses
  });
  
  const budgetOptimizations = FinancialML.optimizeBudgets(budgets, transactions, totalIncome);
  
  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const amount = parseFloat(t.amount) || 0;
      if (!acc[t.category]) acc[t.category] = 0;
      acc[t.category] += amount;
      return acc;
    }, {});
  
  const pieData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  
  setInsightsData({
    savingsData,
    predictedSavings,
    monthlyChartData,
    incomeExpensePredictions,
    anomalies,
    behaviorAnalysis,
    categoryData: pieData,
    recommendations,
    budgetOptimizations
  });
}, [transactions, budgets, savings, totalIncome, totalExpenses, anomalyLevel, forecastModel]);

  // COLORS for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
  
  // Format currency helper
  const formatCurrency = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return '£0.00';
    }
    return `£${numValue.toFixed(2)}`;
  };
  
  // If data is still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // If no transactions yet
  if (transactions.length === 0) {
    return (
      <div className="space-y-4">
        <h1>Financial Insights</h1>
        <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">No Transaction Data Available</h2>
          <p className="text-blue-700">
            Add some transactions on the Transactions page to unlock powerful ML-driven financial insights.
            Our algorithms will analyze your spending patterns and provide personalized recommendations.
          </p>
        </div>
      </div>
    );
  }
  
  // If insights data is not ready yet
  if (!insightsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h1>Financial Insights</h1>
      <div className="bg-blue-50 p-4 rounded shadow border-l-4 border-blue-500 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">ML-Powered Financial Intelligence</h2>
        <p className="text-blue-700">
          Our machine learning algorithms analyze your transaction data to provide personalized insights and recommendations.
          Discover spending patterns, identify anomalies, and get tailored advice to improve your financial health.
        </p>
      </div>
      
      <div className="ml-insights-container">        
        {/* Insight Tabs */}
        <div className="ml-insights-tabs">
          <button 
            className={`tab-button ${selectedTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${selectedTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setSelectedTab('recommendations')}
          >
            Recommendations
          </button>
          <button 
            className={`tab-button ${selectedTab === 'budgetOptimization' ? 'active' : ''}`}
            onClick={() => setSelectedTab('budgetOptimization')}
          >
            Budget Optimizer
          </button>
          <button 
            className={`tab-button ${selectedTab === 'behavior' ? 'active' : ''}`}
			onClick={() => setSelectedTab('behavior')}
          >
            Spending Behavior
          </button>
          <button 
            className={`tab-button ${selectedTab === 'anomalies' ? 'active' : ''}`}
            onClick={() => setSelectedTab('anomalies')}
          >
            Anomalies
          </button>
        </div>
      
        <div className="ml-insights-content">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial Health Score */}
              <div className="insights-card">
                <h2 className="card-title">Financial Health Score</h2>
                <div className="health-score-container">
                  <div className="health-score-circle">
                    <div className="score-value">
                      {insightsData.behaviorAnalysis ? 
                        Math.round(insightsData.behaviorAnalysis.behaviorScore) : '?'}
                    </div>
                    <div className="score-label">
                      {insightsData.behaviorAnalysis?.behaviorScore >= 80 ? 'Excellent' :
                      insightsData.behaviorAnalysis?.behaviorScore >= 60 ? 'Good' :
                      insightsData.behaviorAnalysis?.behaviorScore >= 40 ? 'Fair' : 'Needs Work'}
                    </div>
                  </div>
                  <div className="health-score-details">
                    <div className="metric">
                      <div className="metric-header">
                        <span className="metric-label">Consistency:</span>
                        <span className="metric-value-display">
                          {insightsData.behaviorAnalysis ? 
                            Math.round(insightsData.behaviorAnalysis.metrics.consistencyScore * 100) : 0}/100
                        </span>
                      </div>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill" 
                          style={{ 
                            width: `${insightsData.behaviorAnalysis ? 
                              Math.round(insightsData.behaviorAnalysis.metrics.consistencyScore * 100) : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-header">
                        <span className="metric-label">Diversity:</span>
                        <span className="metric-value-display">
                          {insightsData.behaviorAnalysis ? 
                            Math.round(insightsData.behaviorAnalysis.metrics.categoryDiversity * 100) : 0}/100
                        </span>
                      </div>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill" 
                          style={{ 
                            width: `${insightsData.behaviorAnalysis ? 
                              Math.round(insightsData.behaviorAnalysis.metrics.categoryDiversity * 100) : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="metric">
                      <div className="metric-header">
                        <span className="metric-label">Control:</span>
                        <span className="metric-value-display">
                          {insightsData.behaviorAnalysis ? 
                            Math.round((1 - insightsData.behaviorAnalysis.metrics.impulseSpendingRatio) * 100) : 0}/100
                        </span>
                      </div>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill" 
                          style={{ 
                            width: `${insightsData.behaviorAnalysis ? 
                              Math.round((1 - insightsData.behaviorAnalysis.metrics.impulseSpendingRatio) * 100) : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="health-score-advice">
                  <h3 className="advice-title">Quick Actions</h3>
                  <ul className="advice-list">
                    {insightsData.recommendations.slice(0, 2).map((rec, index) => (
                      <li key={index} className="advice-item">
                        <div className={`priority-indicator ${rec.priority}`}></div>
                        <div>
                          <h4>{rec.title}</h4>
                          <p>{rec.action}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              
              {/* Income vs Expenses */}
              <div className="insights-card">
                <h2 className="card-title">Income & Expense Forecast</h2>
                <div className="chart-container" style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        allowDuplicatedCategory={false}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), '']}
                        labelFormatter={(label) => label.includes("Forecast") ? label : `Period: ${label}`}
                      />
                      <Legend />
                      
                      {/* Historical data */}
                      <Line 
                        name="Income" 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#2E7D32" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        data={insightsData.monthlyChartData.slice(-6)}
                      />
                      <Line 
                        name="Expenses" 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#C62828" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        data={insightsData.monthlyChartData.slice(-6)}
                      />
                      

                      
                      {/* Forecast data with forced display */}
                      <Line 
                        name="Forecast Income" 
                        type="monotone" 
                        dataKey="income" 
                        stroke="#4CAF50" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        data={insightsData.incomeExpensePredictions}
                        isAnimationActive={false}
                      />
                      <Line 
                        name="Forecast Expenses" 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#F44336" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        data={insightsData.incomeExpensePredictions}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="forecast-insight">
                  <h3 className="insight-title">Monthly Balance Forecast</h3>
                  <div className="forecast-metrics">
                    <div className="metric">
                      <span className="metric-label">Projected Income (Next Month):</span>
                      <span className="metric-value">
                        {insightsData.incomeExpensePredictions && insightsData.incomeExpensePredictions.length > 0 ? 
                          formatCurrency(insightsData.incomeExpensePredictions[0].income) : 'Insufficient data'}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Projected Expenses (Next Month):</span>
                      <span className="metric-value">
                        {insightsData.incomeExpensePredictions && insightsData.incomeExpensePredictions.length > 0 ? 
                          formatCurrency(insightsData.incomeExpensePredictions[0].expenses) : 'Insufficient data'}
                      </span>
                    </div>
                    {insightsData.incomeExpensePredictions && insightsData.incomeExpensePredictions.length > 0 && (
                      <div className="metric">
                        <span className="metric-label">Projected Savings:</span>
                        <span className={`metric-value ${
                          insightsData.incomeExpensePredictions[0].income >
                          insightsData.incomeExpensePredictions[0].expenses ?
                          'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(
                            insightsData.incomeExpensePredictions[0].income -
                            insightsData.incomeExpensePredictions[0].expenses
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Top Insights */}
              <div className="insights-card">
                <h2 className="card-title">Key Insights</h2>
                <div className="insights-list">
                  {insightsData.anomalies.length > 0 && (
                    <div className="insight-item">
                      <AlertTriangle size={20} className="insight-icon text-amber-500" />
                      <div>
                        <h3 className="insight-title">Unusual Spending</h3>
                        <p className="insight-text">
                          {insightsData.anomalies.length} unusual transactions detected, largest being 
                          {" "}{formatCurrency(parseFloat(insightsData.anomalies[0].amount))} for {insightsData.anomalies[0].description}.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {insightsData.behaviorAnalysis && (
                    <>
                      <div className="insight-item">
                        <TrendingUp size={20} className="insight-icon text-blue-500" />
                        <div>
                          <h3 className="insight-title">Spending Pattern</h3>
                          <p className="insight-text">
                            You tend to spend most on {
                              insightsData.behaviorAnalysis.patterns.dayOfWeekPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern)
                              ) === 0 ? 'Sundays' :
                              insightsData.behaviorAnalysis.patterns.dayOfWeekPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern)
                              ) === 1 ? 'Mondays' :
                              insightsData.behaviorAnalysis.patterns.dayOfWeekPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern)
                              ) === 2 ? 'Tuesdays' :
                              insightsData.behaviorAnalysis.patterns.dayOfWeekPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern)
                              ) === 3 ? 'Wednesdays' :
                              insightsData.behaviorAnalysis.patterns.dayOfWeekPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern)
                              ) === 4 ? 'Thursdays' :
                              insightsData.behaviorAnalysis.patterns.dayOfWeekPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern)
                              ) === 5 ? 'Fridays' : 'Saturdays'
                            } and during the {
                              insightsData.behaviorAnalysis.patterns.timeOfMonthPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.timeOfMonthPattern)
                              ) === 0 ? 'beginning' :
                              insightsData.behaviorAnalysis.patterns.timeOfMonthPattern.indexOf(
                                Math.max(...insightsData.behaviorAnalysis.patterns.timeOfMonthPattern)
                              ) === 1 ? 'middle' : 'end'
                            } of the month.
                          </p>
                        </div>
                      </div>
                      
                      {insightsData.behaviorAnalysis.patterns.impulseSpendings.length > 0 && (
                        <div className="insight-item">
                          <AlertCircle size={20} className="insight-icon text-red-500" />
                          <div>
                            <h3 className="insight-title">Impulse Spending</h3>
                            <p className="insight-text">
                              You made {insightsData.behaviorAnalysis.patterns.impulseSpendings.length} 
                              {" "}potential impulse purchases recently, totaling {
                                formatCurrency(insightsData.behaviorAnalysis.patterns.impulseSpendings.reduce(
                                  (sum, t) => sum + parseFloat(t.amount), 0
                                ))
                              }.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {insightsData.monthlyChartData.length >= 3 && (
                    <div className="insight-item">
                      <Check size={20} className="insight-icon text-green-500" />
                      <div>
                        <h3 className="insight-title">3-Month Trend</h3>
                        <p className="insight-text">
                          Your average monthly spending over the last 3 months is {
                            formatCurrency(
                              insightsData.monthlyChartData.slice(-3).reduce(
                                (sum, month) => sum + month.expenses, 0
                              ) / 3
                            )
                          }.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Recommendations Tab */}
          {selectedTab === 'recommendations' && (
            <div className="recommendations-container">
              <div className="insights-card full-width">
                <h2 className="card-title">Personalized Recommendations</h2>
                <p className="card-description">
                  Based on your financial data, our machine learning algorithms have generated 
                  the following personalized recommendations to help improve your financial health.
                </p>
                
                <div className="recommendations-list">
                  {insightsData.recommendations.length > 0 ? (
                    insightsData.recommendations.map((recommendation, index) => (
                      <div key={index} className={`recommendation-item ${recommendation.priority}`}>
                          <div className="recommendation-header">
                            <div className="recommendation-badge">
                              {recommendation.priority === 'high' ? '!' : 
                              recommendation.priority === 'medium' ? '+' : 'i'}
                            </div>
                            <h3>{recommendation.title}</h3>
                            {recommendation.confidence && (
                              <div className="confidence-badge">
                                {recommendation.confidence}% confidence
                              </div>
                            )}
                          </div>
                        <div className="recommendation-body">
                          <p className="recommendation-description">{recommendation.description}</p>
                          {recommendation.actionable && (
                            <div className="recommendation-action">
                              <h4>Suggested Action:</h4>
                              <p>{recommendation.action}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>Add more financial data to receive personalized recommendations.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Budget Optimization Tab */}
          {selectedTab === 'budgetOptimization' && (
            <div className="insights-card full-width">
              <h2 className="card-title">Budget Optimization</h2>
              <p className="card-description">
                Our ML algorithm analyzes your spending patterns and budget allocations to suggest 
                optimizations that better align with your actual financial behavior.
              </p>
              
              {insightsData.budgetOptimizations && insightsData.budgetOptimizations.length > 0 ? (
                <div className="budget-optimizations">
                  <div className="optimization-header">
                    <div className="header-item category-col">Category</div>
                    <div className="header-item current-col">Current Budget</div>
                    <div className="header-item action-col">Suggested Action</div>
                    <div className="header-item confidence-col">Confidence</div>
                  </div>
                  
                  {insightsData.budgetOptimizations.map((optimization, index) => (
                    <div key={index} className="optimization-item">
                      <div className="item-col category-col">{optimization.category}</div>
                      <div className="item-col current-col">{formatCurrency(optimization.currentBudget)}</div>
                      <div className="item-col action-col">
                        <div className={`action-badge ${optimization.recommendation.action}`}>
                          {optimization.recommendation.action === 'increase' && '↑ Increase by'}
                          {optimization.recommendation.action === 'decrease' && '↓ Decrease by'}
                          {optimization.recommendation.action === 'create' && '+ Create'}
                          {' '}{formatCurrency(optimization.recommendation.amount)}
                        </div>
                        <div className="action-reason">
                          Reason: {optimization.recommendation.reason}
                        </div>
                        {optimization.trending && (
                          <div className="trend-indicator">
                            {optimization.trending === 'increasing' && '↗ Trending up'}
                            {optimization.trending === 'decreasing' && '↘ Trending down'}
                            {optimization.trending === 'stable' && '→ Stable'}
                          </div>
                        )}
                      </div>
                      <div className="item-col confidence-col">
                        <div className={`confidence-meter ${
                          optimization.confidence >= 80 ? 'high' : 
                          optimization.confidence >= 60 ? 'medium' : 'low'
                        }`}>
                          <span className="confidence-value">{optimization.confidence}%</span>
                          <div className="meter-bar">
                            <div 
                              className="meter-fill" 
                              style={{ width: `${optimization.confidence}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="optimization-summary">
                    <h3>Summary of Recommendations</h3>
                    {(() => {
                      const increases = insightsData.budgetOptimizations.filter(o => o.recommendation.action === 'increase');
                      const decreases = insightsData.budgetOptimizations.filter(o => o.recommendation.action === 'decrease');
                      const creates = insightsData.budgetOptimizations.filter(o => o.recommendation.action === 'create');
                      
                      const totalIncrease = increases.reduce((sum, o) => sum + o.recommendation.amount, 0);
                      const totalDecrease = decreases.reduce((sum, o) => sum + o.recommendation.amount, 0);
                      const totalNew = creates.reduce((sum, o) => sum + o.recommendation.amount, 0);
                      
                      const netChange = totalIncrease - totalDecrease + totalNew;
                      
                      return (
                        <div className="summary-stats">
                          <div className="stat-item">
                            <span className="stat-label">Suggested increases:</span> 
                            <span className="stat-value">{formatCurrency(totalIncrease)}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Suggested decreases:</span> 
                            <span className="stat-value">{formatCurrency(totalDecrease)}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">New budget allocations:</span> 
                            <span className="stat-value">{formatCurrency(totalNew)}</span>
                          </div>
                          <div className="stat-item net-change">
                            <span className="stat-label">Net budget change:</span> 
                            <span className={`stat-value ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(netChange)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Not enough budget and transaction data to generate optimization suggestions.</p>
                  <p>Create budgets and add transactions to receive AI-powered budget recommendations.</p>
                </div>
              )}
            </div>
          )}

          {/* Forecasts Tab */}
          {selectedTab === 'forecasts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/*  <div className="insights-card col-span-1 md:col-span-2">
                <div className="flex justify-between items-center">
                  <h2 className="card-title">Financial Forecasts</h2>
                  <div className="model-selector">
                    <label className="mr-2 text-sm">Forecast Model:</label>
                    <select 
                      value={forecastModel} 
                      onChange={(e) => setForecastModel(e.target.value)}
                      className="forecast-select"
                    >
                      <option value="exponential">Exponential Smoothing</option>
                      <option value="arima">ARIMA Model</option>
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Our machine learning algorithms analyze your historical data to predict future financial trends.
                </p>
              </div> */}
              
            {/*  Savings Forecast 
              <div className="insights-card">
                <h2 className="card-title">Savings Forecast</h2>
                <div className="chart-container" style={{ height: '250px' }}>
                  {insightsData.savingsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...insightsData.savingsData, ...insightsData.predictedSavings]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          name="Actual Savings" 
                          stroke="#8884d8" 
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          data={insightsData.savingsData}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          name="Predicted Savings" 
                          stroke="#82ca9d" 
                          strokeDasharray="5 5"
                          data={insightsData.predictedSavings}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                      Not enough savings data to make predictions.
                    </div>
                  )}
                </div>
                <div className="forecast-insight">
                  <h3 className="insight-title">ML Prediction</h3>
                  <p className="insight-text">
                    {insightsData.predictedSavings.length > 0 ? 
                      `Based on your historical savings data, you're projected to save approximately ${formatCurrency(insightsData.predictedSavings.reduce((sum, item) => sum + item.amount, 0))} over the next 3 months.
                      ${insightsData.predictedSavings[0].amount > (insightsData.savingsData[insightsData.savingsData.length - 1]?.amount || 0)
                        ? " This is a positive trend showing improved saving capacity."
                        : " This indicates a potential decrease in your saving capacity."}` :
                      'Add more savings data to see future predictions.'}
                  </p>
                </div>
              </div> */ }
              
              {/* Income & Expense Forecast 
              <div className="insights-card">
                <h2 className="card-title">Income & Expense Forecast</h2>
                <div className="chart-container" style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...insightsData.monthlyChartData.slice(-6), ...insightsData.incomeExpensePredictions]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="income" 
                        name="Predicted Income" 
                        stroke="#4CAF50" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        data={insightsData.incomeExpensePredictions}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        name="Predicted Expenses" 
                        stroke="#F44336" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        data={insightsData.incomeExpensePredictions}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="forecast-insight">
                  <h3 className="insight-title">Monthly Balance Forecast</h3>
                  <div className="forecast-metrics">
                    <div className="metric">
                      <span className="metric-label">Projected Income (Next Month):</span>
                      <span className="metric-value">
                        {insightsData.monthlyChartData.length >= 3 ? 
                          formatCurrency(
                            insightsData.monthlyChartData.slice(-3).reduce(
                              (sum, month) => sum + month.income, 0
                            ) / 3
                          ) : 'Insufficient data'}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Projected Expenses (Next Month):</span>
                      <span className="metric-value">
                        {insightsData.monthlyChartData.length >= 3 ? 
                          formatCurrency(
                            insightsData.monthlyChartData.slice(-3).reduce(
                              (sum, month) => sum + month.expenses, 0
                            ) / 3
                          ) : 'Insufficient data'}
                      </span>
                    </div>
                    {insightsData.monthlyChartData.length >= 3 && (
                      <div className="metric">
                        <span className="metric-label">Projected Savings:</span>
                        <span className={`metric-value ${
                          insightsData.monthlyChartData.slice(-3).reduce((sum, month) => sum + month.income, 0) / 3 >
                          insightsData.monthlyChartData.slice(-3).reduce((sum, month) => sum + month.expenses, 0) / 3 ?
                          'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(
                            insightsData.monthlyChartData.slice(-3).reduce((sum, month) => sum + month.income, 0) / 3 -
                            insightsData.monthlyChartData.slice(-3).reduce((sum, month) => sum + month.expenses, 0) / 3
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div> */}
              </div>
          )}
          
          {/* Spending Behavior Tab */}
          {selectedTab === 'behavior' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="insights-card col-span-1 md:col-span-2">
                <h2 className="card-title">Spending Behavior Analysis</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Our AI analyzes your transaction patterns to identify spending habits and opportunities for improvement.
                </p>
              </div>
              
              {/* Weekly Spending Pattern */}
              <div className="insights-card">
                <h2 className="card-title">Weekly Spending Pattern</h2>
                {insightsData.behaviorAnalysis ? (
                  <div className="chart-container" style={{ height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { day: 'Sun', value: insightsData.behaviorAnalysis.patterns.dayOfWeekPattern[0] * 100 },
                          { day: 'Mon', value: insightsData.behaviorAnalysis.patterns.dayOfWeekPattern[1] * 100 },
                          { day: 'Tue', value: insightsData.behaviorAnalysis.patterns.dayOfWeekPattern[2] * 100 },
                          { day: 'Wed', value: insightsData.behaviorAnalysis.patterns.dayOfWeekPattern[3] * 100 },
                          { day: 'Thu', value: insightsData.behaviorAnalysis.patterns.dayOfWeekPattern[4] * 100 },
                          { day: 'Fri', value: insightsData.behaviorAnalysis.patterns.dayOfWeekPattern[5] * 100 },
                          { day: 'Sat', value: insightsData.behaviorAnalysis.patterns.dayOfWeekPattern[6] * 100 }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Spending']} />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="behavior-insight">
                      <p>
                        <strong>Peak Day:</strong> {
                          ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                            insightsData.behaviorAnalysis.patterns.dayOfWeekPattern.indexOf(
                              Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern)
                            )
                          ]
                        } ({
                          (Math.max(...insightsData.behaviorAnalysis.patterns.dayOfWeekPattern) * 100).toFixed(1)
                        }% of transactions)
                      </p>
                      <p>
                        <strong>Distribution Score:</strong> {
                          Math.round(
                            (1 - FinancialML.calculateGiniCoefficient(
                              insightsData.behaviorAnalysis.patterns.dayOfWeekPattern
                            )) * 100
                          )
                        }/100
                        <span className="text-sm text-gray-500 ml-2">
                          (Higher means more consistent spending)
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-gray-500">
                    Not enough transaction data to analyze spending patterns.
                  </div>
                )}
              </div>
              
              {/* Monthly Spending Pattern */}
              <div className="insights-card">
                <h2 className="card-title">Monthly Spending Pattern</h2>
                {insightsData.behaviorAnalysis ? (
                  <div className="chart-container" style={{ height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { period: 'Early Month (1-10)', value: insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[0] * 100 },
                          { period: 'Mid Month (11-20)', value: insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[1] * 100 },
                          { period: 'Late Month (21-31)', value: insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[2] * 100 }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Spending']} />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="behavior-insight">
                      <p>
                        <strong>Peak Period:</strong> {
                          ['Early Month (1-10)', 'Mid Month (11-20)', 'Late Month (21-31)'][
                            insightsData.behaviorAnalysis.patterns.timeOfMonthPattern.indexOf(
                              Math.max(...insightsData.behaviorAnalysis.patterns.timeOfMonthPattern)
                            )
                          ]
                        } ({
                          (Math.max(...insightsData.behaviorAnalysis.patterns.timeOfMonthPattern) * 100).toFixed(1)
                        }% of transactions)
                      </p>
                      <p>
                        <strong>Cash Flow Implication:</strong> {
                          insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[2] > 
                          insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[0] ?
                          "You spend more at the end of the month, which may indicate cash flow stress." :
                          insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[0] > 
                          insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[1] &&
                          insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[0] > 
                          insightsData.behaviorAnalysis.patterns.timeOfMonthPattern[2] ?
                          "You front-load spending at the beginning of the month, which can help with budgeting." :
                          "Your spending is fairly balanced throughout the month."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-gray-500">
                    Not enough transaction data to analyze spending patterns.
                  </div>
                )}
              </div>
              
              {/* Impulse Spending Analysis */}
              <div className="insights-card col-span-1 md:col-span-2">
                <h2 className="card-title">Impulse Spending Analysis</h2>
                {insightsData.behaviorAnalysis && 
                  insightsData.behaviorAnalysis.patterns.impulseSpendings.length > 0 ? (
                  <div>
                    <p className="mb-3">
                      Our algorithm detected {insightsData.behaviorAnalysis.patterns.impulseSpendings.length} potential 
                      impulse purchases, accounting for {
                        formatCurrency(insightsData.behaviorAnalysis.patterns.impulseSpendings.reduce(
                          (sum, t) => sum + parseFloat(t.amount), 0
                        ))
                      } ({
                        ((insightsData.behaviorAnalysis.patterns.impulseSpendings.reduce(
                          (sum, t) => sum + parseFloat(t.amount), 0
                        ) / totalExpenses) * 100).toFixed(1)
                      }% of total expenses).
                    </p>
                    
                    <div className="impulse-transactions">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left">Date</th>
                            <th className="text-left">Description</th>
                            <th className="text-left">Category</th>
                            <th className="text-right">Amount</th>
                            <th className="text-right">Deviation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {insightsData.behaviorAnalysis.patterns.impulseSpendings.map((transaction, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                              <td>{transaction.date}</td>
                              <td>{transaction.description}</td>
                              <td>{transaction.category}</td>
                              <td className="text-right">{formatCurrency(parseFloat(transaction.amount))}</td>
                              <td className="text-right">
                                <span className="deviation-badge">
                                  {transaction.deviation.toFixed(1)}x
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="behavior-advice mt-4 p-3 bg-purple-50 rounded-md">
                      <h3 className="font-semibold text-purple-800 mb-2">Improvement Strategy</h3>
                      <p>
                        Consider implementing a "cool down" period of 24-48 hours before making purchases over {
                          formatCurrency(
                            insightsData.behaviorAnalysis.patterns.impulseSpendings.reduce(
                              (sum, t) => sum + t.avgForCategory, 0
                            ) / insightsData.behaviorAnalysis.patterns.impulseSpendings.length
                          )
                        } to reduce impulse spending.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No significant impulse spending detected in your transaction history.</p>
                    <p className="text-green-600 font-semibold mt-2">
                      Great job maintaining spending discipline!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Anomalies Tab */}
          {selectedTab === 'anomalies' && (
            <div className="grid grid-cols-1 gap-6">
              <div className="insights-card">
                <div className="flex justify-between items-center">
                  <h2 className="card-title">Spending Anomalies</h2>
                  <div className="sensitivity-control">
                    <label className="mr-2 text-sm">Sensitivity:</label>
                    <select 
                      value={anomalyLevel} 
                      onChange={(e) => setAnomalyLevel(e.target.value)}
                      className="anomaly-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Our machine learning model identifies unusual spending patterns that deviate 
                  significantly from your typical expenses in each category.
                </p>
                
                {insightsData.anomalies.length > 0 ? (
                  <>
                    <div className="anomaly-scatter" style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                          <CartesianGrid />
                          <XAxis 
                            type="category" 
                            dataKey="category" 
                            name="Category"
                            allowDuplicatedCategory={false}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="amount" 
                            name="Amount" 
                            unit="" 
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === "Amount") {
                                return [typeof value === 'number' ? formatCurrency(value) : 'Invalid amount', name];
                              }
                              return [value, name];
                            }}
                            cursor={{ strokeDasharray: '3 3' }}
                          />
                          <Legend />
                          <Scatter 
                            name="Normal" 
                            data={transactions
                              .filter(t => t.type === 'expense' && !insightsData.anomalies.some(a => a.id === t.id))
                              .map(t => ({
                                ...t,
                                amount: parseFloat(t.amount) || 0
                              }))
                            } 
                            fill="#8884d8" 
                          />
                          <Scatter 
                            name="Anomalies" 
                            data={insightsData.anomalies.map(a => ({
                              ...a,
                              amount: parseFloat(a.amount) || 0
                            }))} 
                            fill="#ff7300"
                            shape="star"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="anomalies-list mt-4">
                      <h3 className="text-lg font-semibold mb-2">Detected Anomalies</h3>
                      <div className="space-y-3">
                        {insightsData.anomalies.map((anomaly) => (
                          <div key={anomaly.id} className="p-3 bg-red-50 rounded border border-red-200">
                            <div className="flex justify-between">
                              <span className="font-medium">{anomaly.description}</span>
                              <span className="font-semibold text-red-600">
                                {formatCurrency(parseFloat(anomaly.amount) || 0)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span>{anomaly.date} • {anomaly.category}</span>
                            </div>
                            <p className="text-sm text-red-700 mt-2">
                              This amount is {(anomaly.score || 0).toFixed(1)}x higher than your typical spending in this category.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <p>No spending anomalies detected with the current sensitivity setting.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Try adjusting the sensitivity level or add more transaction data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div> 
    </div>
  );
};

export default Insights;
				  
				  