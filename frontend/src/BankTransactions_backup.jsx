import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, Calendar, TrendingUp, Trash2, Download, FileText, AlertCircle, CheckCircle, ArrowLeft, Plus, Edit2, Save, X, FileDown, Banknote, CreditCard } from 'lucide-react';
import API_BASE from './config';

const BankTransactions = ({ onBackToTasks }) => {
  const [uploadedData, setUploadedData] = useState(null);
  const [savedMonths, setSavedMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [allDescriptions, setAllDescriptions] = useState([]);
  const [transactionType, setTransactionType] = useState('credit');
  const [transactionStats, setTransactionStats] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    account_number: '',
    month_year: new Date().toISOString().slice(0, 7),
    transaction_type: 'credit'
  });
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  useEffect(() => {
    fetchSavedMonths();
    fetchAllDescriptions();
    fetchAllTransactions();
    fetchTransactionStats();
  }, []);

  const fetchAllDescriptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/descriptions`);
      const data = await response.json();
      setAllDescriptions(data);
    } catch (err) {
      console.error('Error fetching descriptions:', err);
    }
  };

  const fetchTransactionStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/stats`);
      const data = await response.json();
      setTransactionStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSavedMonths = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/months`);
      const data = await response.json();
      setSavedMonths(data);
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/transactions/all`);
      const data = await response.json();
      setMonthTransactions(data);
      setSelectedMonth('all');
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthTransactions = async (monthYear) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/transactions/${monthYear}`);
      const data = await response.json();
      setMonthTransactions(data);
      setSelectedMonth(monthYear);
    } catch (err) {
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('transaction_type', transactionType);

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE}/transactions/upload`, {
        method: 'POST',
        body: formData
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server error: Expected JSON but got ${contentType}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedData(data);
      setPreviewFilter('all');
      const typeLabel = transactionType === 'cash' ? 'cash' : 'credit card';
      setSuccess(`Successfully parsed ${data.transaction_count} ${typeLabel} transactions.`);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransactions = async () => {
    if (!uploadedData) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: uploadedData.transactions })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Save failed');
      }

      setSuccess(data.message);
      setUploadedData(null);
      await fetchSavedMonths();
      await fetchTransactionStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleAddTransaction = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add transaction');

      setSuccess('Transaction added successfully');
      setShowAddForm(false);
      setNewTransaction({
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        account_number: '',
        month_year: new Date().toISOString().slice(0, 7),
        transaction_type: 'credit'
      });
      
      await fetchSavedMonths();
      await fetchAllDescriptions();
      await fetchTransactionStats();
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else if (selectedMonth) {
        await fetchMonthTransactions(selectedMonth);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTransaction = async (transactionId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTransaction)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update transaction');

      setSuccess('Transaction updated successfully');
      setEditingTransaction(null);
      
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else {
        await fetchMonthTransactions(selectedMonth);
      }
      await fetchAllDescriptions();
      await fetchTransactionStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Delete this transaction?')) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      setSuccess('Transaction deleted successfully');
      
      if (selectedMonth === 'all') {
        await fetchAllTransactions();
      } else {
        await fetchMonthTransactions(selectedMonth);
      }
      await fetchSavedMonths();
      await fetchTransactionStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonth = async (monthYear) => {
    if (!window.confirm(`Delete all transactions for ${monthYear}?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/transactions/month/${monthYear}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

      setSuccess('Transactions deleted successfully');
      if (selectedMonth === monthYear) {
        setSelectedMonth(null);
        setMonthTransactions([]);
      }
      await fetchSavedMonths();
      await fetchTransactionStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatMonthYear = (monthYear) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
