import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Bell, Calendar, Edit2, Trash2, AlertCircle, Check, Plus, ChevronDown, Repeat,  PoundSterling } from 'lucide-react';
import './css/Reminders.css';

const Reminders = ({ user }) => {
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    title: '',
    amount: '',
    dueDate: '',
    category: 'bill',
    isRecurring: false,
    frequency: 'monthly',
    notes: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch reminders on component mount
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const remindersQuery = query(
          collection(db, 'reminders'),
          where('userId', '==', user.uid)
        );
        
        const remindersSnapshot = await getDocs(remindersQuery);
        const remindersList = remindersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setReminders(remindersList);
      } catch (err) {
        console.error("Error fetching reminders:", err);
        setError("Failed to load reminders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, [user]);

  const handleAddReminder = async (e) => {
    e.preventDefault();
    
    if (!newReminder.title.trim() || !newReminder.dueDate) {
      setError("Please fill in all required fields");
      return;
    }
    
    const amount = parseFloat(newReminder.amount) || 0;
    
    if (amount < 0) {
      setError("Amount must be a valid number");
      return;
    }
    
    try {
      setLoading(true);
      
      const reminderData = {
        title: newReminder.title.trim(),
        amount,
        dueDate: new Date(newReminder.dueDate),
        category: newReminder.category,
        isRecurring: newReminder.isRecurring,
        frequency: newReminder.frequency,
        notes: newReminder.notes.trim(),
        status: 'pending',
        userId: user.uid,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'reminders'), reminderData);
      
      setReminders([...reminders, { id: docRef.id, ...reminderData }]);
      
      setNewReminder({
        title: '',
        amount: '',
        dueDate: '',
        category: 'bill',
        isRecurring: false,
        frequency: 'monthly',
        notes: ''
      });
      
      setShowAddForm(false);
      setSuccess("Reminder added successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error("Error adding reminder:", err);
      setError("Failed to add reminder. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReminder = async (e) => {
    e.preventDefault();
    
    if (!editingReminder.title.trim() || !editingReminder.dueDate) {
      setError("Please fill in all required fields");
      return;
    }
    
    const amount = parseFloat(editingReminder.amount) || 0;
    
    if (amount < 0) {
      setError("Amount must be a valid number");
      return;
    }
    
    try {
      setLoading(true);
      
      const reminderRef = doc(db, 'reminders', editingReminder.id);
      
      const updatedData = {
        title: editingReminder.title.trim(),
        amount,
        dueDate: new Date(editingReminder.dueDate),
        category: editingReminder.category,
        isRecurring: editingReminder.isRecurring,
        frequency: editingReminder.frequency,
        notes: editingReminder.notes.trim(),
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(reminderRef, updatedData);
      
      setReminders(reminders.map(reminder => 
        reminder.id === editingReminder.id 
          ? { ...reminder, ...updatedData } 
          : reminder
      ));
      
      setEditingReminder(null);
      setSuccess("Reminder updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error("Error updating reminder:", err);
      setError("Failed to update reminder. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'reminders', id));
      
      setReminders(reminders.filter(reminder => reminder.id !== id));
      setShowDeleteConfirm(null);
      setSuccess("Reminder deleted successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error("Error deleting reminder:", err);
      setError("Failed to delete reminder. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id) => {
    try {
      const reminderRef = doc(db, 'reminders', id);
      
      await updateDoc(reminderRef, {
        status: 'paid',
        paidDate: new Date(),
        updatedAt: serverTimestamp()
      });
      
      setReminders(reminders.map(reminder => 
        reminder.id === id 
          ? { ...reminder, status: 'paid', paidDate: new Date() } 
          : reminder
      ));
      
      setSuccess("Marked as paid!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error("Error updating reminder status:", err);
      setError("Failed to update status. Please try again.");
    }
  };

  const startEdit = (reminder) => {
    // Convert Firestore timestamp to ISO string for date input
    let dueDate = reminder.dueDate;
    
    // Check if dueDate is a Firestore timestamp
    if (dueDate && typeof dueDate.toDate === 'function') {
      dueDate = dueDate.toDate().toISOString().split('T')[0];
    } else if (dueDate instanceof Date) {
      dueDate = dueDate.toISOString().split('T')[0];
    }
  
    // Set the editingReminder state and open the modal
    setEditingReminder({ 
      ...reminder, 
      dueDate 
    });
    setError('');  // Reset error message if any
    setIsModalOpen(true);  // Open the modal
  };
  
  
// Cancel function
  const cancelEdit = () => {
    setEditingReminder(false);
    setError('');
  };

  // Get days until due date
  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 'No due date';
    
    let dueDateObj;
    
    // Handle various date formats
    if (typeof dueDate === 'string') {
      dueDateObj = new Date(dueDate);
    } else if (dueDate instanceof Date) {
      dueDateObj = dueDate;
    } else if (dueDate && typeof dueDate.toDate === 'function') {
      dueDateObj = dueDate.toDate();
    } else {
      return 'Invalid date';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);
    
    const differenceMs = dueDateObj - today;
    const daysRemaining = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      return `${Math.abs(daysRemaining)} days overdue`;
    } else if (daysRemaining === 0) {
      return 'Due today';
    } else if (daysRemaining === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${daysRemaining} days`;
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    
    let dateObj;
    
    // Handle various date formats
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      return '';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'bill':
        return <PoundSterling size={18} />;
      case 'subscription':
        return <Repeat size={18} />;
      case 'appointment':
        return <Calendar size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  // Sort reminders by due date (closest first)
  const sortedReminders = [...reminders].sort((a, b) => {
    // Paid reminders at the bottom
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;
    
    // Then sort by due date
    const aDate = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
    const bDate = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate);
    return aDate - bDate;
  });

  // Group reminders by due status
  const overdueReminders = sortedReminders.filter(reminder => {
    if (reminder.status === 'paid') return false;
    
    let dueDateObj;
    if (reminder.dueDate instanceof Date) {
      dueDateObj = reminder.dueDate;
    } else if (reminder.dueDate && typeof reminder.dueDate.toDate === 'function') {
      dueDateObj = reminder.dueDate.toDate();
    } else {
      dueDateObj = new Date(reminder.dueDate);
    }
    
    return dueDateObj < new Date();
  });

  const upcomingReminders = sortedReminders.filter(reminder => {
    if (reminder.status === 'paid') return false;
    
    let dueDateObj;
    if (reminder.dueDate instanceof Date) {
      dueDateObj = reminder.dueDate;
    } else if (reminder.dueDate && typeof reminder.dueDate.toDate === 'function') {
      dueDateObj = reminder.dueDate.toDate();
    } else {
      dueDateObj = new Date(reminder.dueDate);
    }
    
    return dueDateObj >= new Date();
  });

  const paidReminders = sortedReminders.filter(reminder => reminder.status === 'paid');

  return (
    <div className="reminders-container">
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
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Set reminders for upcoming transactions</h2>
              <p className="text-blue-700">
              This page allows you to stay on top of your financial responsibilities by setting important reminders 
              for upcoming transactions. You can create alerts for upcoming bill payments, subscription renewals, or 
              any other upcoming payment. This feature promotes better financial planning and helps prevent missed 
              payments by keeping everything organized in one place. 
              </p>
            </div>
      
      {/* Reminders Overview Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Bell size={60} className="mr-2" />
            Payment Reminders
          </h2>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              <ChevronDown size={18} className="mr-1" />
            ) : (
              <Plus size={18} className="mr-1" />
            )}
            {showAddForm ? 'Hide Form' : 'Add Reminder'}
          </button>
        </div>
        
        {/* Add New Reminder Form */}
        {showAddForm && (
          <div className="card-body">
            <form onSubmit={handleAddReminder}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="reminder-title" className="form-label">Title</label>
                    <input
                      type="text"
                      id="reminder-title"
                      className="form-control"
                      value={newReminder.title}
                      onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                      placeholder="e.g., Rent Payment, Phone Bill, Netflix"
                      required
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="reminder-category" className="form-label">Category</label>
                    <select
                      id="reminder-category"
                      className="form-control"
                      value={newReminder.category}
                      onChange={(e) => setNewReminder({ ...newReminder, category: e.target.value })}
                    >
                      <option value="bill">Bill</option>
                      <option value="subscription">Subscription</option>
                      <option value="appointment">Appointment</option>
                      <option 
                        value="Other"
                        title=" Select this option if your category isn't listed. You can enter your own custom category" // Tooltip text
                      >
                      Other
                     </option>
                    </select>
                    {newReminder.category === 'Other' && (
              <input
                  type="text"
                  name="customCategory"
                  value={newReminder.customCategory}
                  onChange={(e) => setNewReminder({ ...newReminder, customCategory: e.target.value })}
                  className="w-full p-2 border rounded mt-2"
                  placeholder="Enter custom category"
                />
              )}
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="reminder-amount" className="form-label">Amount</label>
                    <input
                      type="number"
                      id="reminder-amount"
                      className="form-control"
                      value={newReminder.amount}
                      onChange={(e) => setNewReminder({ ...newReminder, amount: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="10"
                      required
                    />
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="reminder-due-date" className="form-label">Due Date</label>
                    <input
                      type="date"
                      id="reminder-due-date"
                      className="form-control"
                      value={newReminder.dueDate}
                      onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label d-block">Recurring</label>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="reminder-recurring"
                        checked={newReminder.isRecurring}
                        onChange={(e) => setNewReminder({ ...newReminder, isRecurring: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="reminder-recurring">
                        This is a recurring reminder
                      </label>
                    </div>
                  </div>
                </div>
                
                {newReminder.isRecurring && (
                  <div className="col-md-12">
                    <div className="form-group">
                      <label htmlFor="reminder-frequency" className="form-label">Frequency</label>
                      <select
                        id="reminder-frequency"
                        className="form-control"
                        value={newReminder.frequency}
                        onChange={(e) => setNewReminder({ ...newReminder, frequency: e.target.value })}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>
                  </div>
                )}
                
                <div className="col-12">
                  <div className="form-group">
                    <label htmlFor="reminder-notes" className="form-label">Notes (Optional)</label>
                    <textarea
                      id="reminder-notes"
                      className="form-control"
                      value={newReminder.notes}
                      onChange={(e) => setNewReminder({ ...newReminder, notes: e.target.value })}
                      placeholder="Additional details about this reminder..."
                      rows="2"
                    />
                  </div>
                </div>
                
                <div className="col-12">
                  <div className="form-group mt-3">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      <Plus size={18} className="mr-1" />
                      Add Reminder
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
        
        {/* Reminders Summary */}
        <div className="card-body">
          <div className="reminders-summary">
            <div className="reminder-stat">
              <div className="stat-label">Overdue</div>
              <div className="stat-value text-danger">{overdueReminders.length}</div>
            </div>
            <div className="reminder-stat">
              <div className="stat-label">Upcoming</div>
              <div className="stat-value text-primary">{upcomingReminders.length}</div>
            </div>
            <div className="reminder-stat">
              <div className="stat-label">Paid</div>
              <div className="stat-value text-success">{paidReminders.length}</div>
            </div>
            <div className="reminder-stat">
              <div className="stat-label">Total Due</div>
              <div className="stat-value">
                £{[...overdueReminders, ...upcomingReminders]
                    .reduce((sum, reminder) => sum + (reminder.amount || 0), 0)
                    .toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Reminders List */}
        <div className="card-body pt-0">
          {loading && reminders.length === 0 ? (
            <div className="text-center py-4">
              <div className="spinner"></div>
              <p className="mt-2">Loading reminders...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-4">
              <p>You haven't set any payment reminders yet.</p>
              <button 
                className="btn btn-primary mt-2"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={18} className="mr-1" />
                Create Your First Reminder
              </button>
            </div>
          ) : (
            <div className="reminders-list">
              {/* Overdue Section */}
              {overdueReminders.length > 0 && (
                <div className="reminders-section">
                  <h3 className="section-title text-danger">
                    <AlertCircle size={18} className="mr-1" />
                    Overdue
                  </h3>
                  {overdueReminders.map((reminder) => (
                    <ReminderItem 
                      key={reminder.id}
                      reminder={reminder}
                      onEdit={() => startEdit(reminder)}
                      onDelete={setShowDeleteConfirm}
                      onMarkAsPaid={markAsPaid}
                      onConfirmDelete={handleDeleteReminder}
                      showDeleteConfirm={showDeleteConfirm}
                      loading={loading}
                      formatDate={formatDate}
                      getDaysUntilDue={getDaysUntilDue}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              )}
              
              {/* Upcoming Section */}
              {upcomingReminders.length > 0 && (
                <div className="reminders-section">
                  <h3 className="section-title text-primary">
                    <Calendar size={18} className="mr-1" />
                    Upcoming
                  </h3>
                  {upcomingReminders.map((reminder) => (
                    <ReminderItem 
                      key={reminder.id}
                      reminder={reminder}
                      onEdit={() => startEdit(reminder)}
                      onDelete={setShowDeleteConfirm}
                      onMarkAsPaid={markAsPaid}
                      onConfirmDelete={handleDeleteReminder}
                      showDeleteConfirm={showDeleteConfirm}
                      loading={loading}
                      formatDate={formatDate}
                      getDaysUntilDue={getDaysUntilDue}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              )}
              
              {/* Paid Section */}
              {paidReminders.length > 0 && (
                <div className="reminders-section">
                  <h3 className="section-title text-success">
                    <Check size={18} className="mr-1" />
                    Paid
                  </h3>
                  {paidReminders.map((reminder) => (
                    <ReminderItem 
                      key={reminder.id}
                      reminder={reminder}
                      onEdit={() => startEdit(reminder)}
                      onDelete={setShowDeleteConfirm}
                      onMarkAsPaid={markAsPaid}
                      onConfirmDelete={handleDeleteReminder}
                      showDeleteConfirm={showDeleteConfirm}
                      loading={loading}
                      formatDate={formatDate}
                      getDaysUntilDue={getDaysUntilDue}
                      getCategoryIcon={getCategoryIcon}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      
{/* Editing Modal */}
{isModalOpen && editingReminder && (
  <div className="modal">
    <div className="modal-backdrop" onClick={cancelEdit}></div>
    <div 
      className="modal-content" 
      onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
    >
      <div className="modal-header">
        <h3 className="modal-title">Edit Reminder</h3>
        <button 
          type="button" 
          className="btn-close" 
          onClick={cancelEdit}
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className="modal-body">
        <form onSubmit={handleUpdateReminder}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-control"
              value={editingReminder.title}
              onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-control"
              value={editingReminder.category}
              onChange={(e) => setEditingReminder({ ...editingReminder, category: e.target.value })}
            >
              <option value="bill">Bill</option>
              <option value="subscription">Subscription</option>
              <option value="appointment">Appointment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              type="number"
              className="form-control"
              value={editingReminder.amount}
              onChange={(e) => setEditingReminder({ ...editingReminder, amount: e.target.value })}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-control"
              value={editingReminder.dueDate}
              onChange={(e) => setEditingReminder({ ...editingReminder, dueDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="edit-reminder-recurring"
                checked={editingReminder.isRecurring}
                onChange={(e) => setEditingReminder({ ...editingReminder, isRecurring: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="edit-reminder-recurring">
                This is a recurring reminder
              </label>
            </div>
          </div>

          {editingReminder.isRecurring && (
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select
                className="form-control"
                value={editingReminder.frequency}
                onChange={(e) => setEditingReminder({ ...editingReminder, frequency: e.target.value })}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              value={editingReminder.notes}
              onChange={(e) => setEditingReminder({ ...editingReminder, notes: e.target.value })}
              rows="2"
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={cancelEdit}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              Save Changes
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )}
 </div>
 );
};

// ReminderItem Component
const ReminderItem = ({ 
  reminder, 
  onEdit, 
  onDelete, 
  onMarkAsPaid, 
  onConfirmDelete,
  showDeleteConfirm, 
  loading,
  formatDate,
  getDaysUntilDue,
  getCategoryIcon
}) => {
  const isPaid = reminder.status === 'paid';
  const dueStatus = getDaysUntilDue(reminder.dueDate);
  const isOverdue = dueStatus.includes('overdue');

  return (
    <div className={`reminder-item ${isPaid ? 'paid' : ''} ${isOverdue && !isPaid ? 'overdue' : ''}`}>
      <div className="reminder-content">
        <div className="reminder-icon">
          {getCategoryIcon(reminder.category)}
        </div>
        
        <div className="reminder-details">
          <div className="reminder-title">
            <h4>{reminder.title}</h4>
            <div className="reminder-badges">
              {reminder.isRecurring && (
                <span className="badge recurring">
                  <Repeat size={12} className="mr-1" />
                  {reminder.frequency}
                </span>
              )}
              {isPaid ? (
                <span className="badge paid">Paid</span>
              ) : (
                <span className={`badge ${isOverdue ? 'overdue' : 'upcoming'}`}>
                  {dueStatus}
                </span>
              )}
            </div>
          </div>
          
          <div className="reminder-info">
            <div className="reminder-date">
              {isPaid ? (
                <span>Paid on {formatDate(reminder.paidDate)}</span>
              ) : (
                <span>Due date: {formatDate(reminder.dueDate)}</span>
              )}
            </div>
            
            {reminder.amount > 0 && (
              <div className="reminder-amount">
                £{reminder.amount.toFixed(2)}
              </div>
            )}
          </div>
          
          {reminder.notes && (
            <div className="reminder-notes">
              <p>{reminder.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="reminder-actions">
        {!isPaid && (
          <button
            className="btn btn-sm btn-success"
            onClick={() => onMarkAsPaid(reminder.id)}
            disabled={loading}
            title="Mark as paid"
          >
            <Check size={16} />
          </button>
        )}
        
        <button
          className="btn btn-sm btn-outline"
          onClick={() => onEdit(reminder)}
          disabled={loading}
          title="Edit"
        >
          <Edit2 size={16} />
        </button>
        
        <button
          className="btn btn-sm btn-outline text-danger"
          onClick={() => onDelete(reminder.id)}
          disabled={loading}
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
        
        {showDeleteConfirm === reminder.id && (
          <div className="delete-confirm">
            <p>Delete this reminder?</p>
            <div className="btn-group mt-2">
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onConfirmDelete(reminder.id)}
                disabled={loading}
              >
                Yes, Delete
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => onDelete(null)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reminders;