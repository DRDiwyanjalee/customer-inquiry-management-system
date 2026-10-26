
import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import {
  Search, Plus, LogOut, RefreshCw, Inbox,
  AlertCircle, CheckCircle2, Clock, X, Pencil, Play,
} from 'lucide-react';
import './App.css';

const emptyForm = {
  customer_name: '',
  customer_contact: '',
  subject: '',
  description: '',
  source_channel: 'Phone Call',
};

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('inquiry_token') || ''
  );
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [inquiries, setInquiries] = useState([]);
  const [query, setQuery] = useState(
    () => sessionStorage.getItem('inquiryflow_query') || ''
  );
  const [statusFilter, setStatusFilter] = useState(
    () => sessionStorage.getItem('inquiryflow_status') || ''
  );
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [duplicates, setDuplicates] = useState([]);
  const [pendingInquiry, setPendingInquiry] = useState(null);
  const [viewingDuplicates, setViewingDuplicates] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reopeningInquiry, setReopeningInquiry] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenSaving, setReopenSaving] = useState(false);
  const [reopenError, setReopenError] = useState('');

  const [historyInquiry, setHistoryInquiry] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Selected inquiry and editable details.
  const [detailsInquiry, setDetailsInquiry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');


  // Automatically sign out after 15 minutes without user activity.
  useEffect(() => {
    if (!token || !user) return;

    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    const ACTIVITY_KEY = 'inquiryflow_last_activity';

    let inactivityTimer;

    function signOutForInactivity() {
      clearTimeout(inactivityTimer);

      localStorage.removeItem('inquiry_token');
      localStorage.removeItem(ACTIVITY_KEY);

      setToken('');
      setUser(null);
      setInquiries([]);
      setNotice('');
      setLoginError(
        'Your session ended due to inactivity. Please sign in again.'
      );
    }

    function checkInactivity() {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY));

      if (!lastActivity || Date.now() - lastActivity >= INACTIVITY_LIMIT) {
        signOutForInactivity();
        return false;
      }

      return true;
    }

    function resetInactivityTimer() {
      clearTimeout(inactivityTimer);

      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY));
      const remaining = INACTIVITY_LIMIT - (Date.now() - lastActivity);

      if (remaining <= 0) {
        signOutForInactivity();
        return;
      }

      inactivityTimer = setTimeout(signOutForInactivity, remaining);
    }

    function recordActivity() {
      // Never revive a session that has already expired.
      if (!checkInactivity()) return;

      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      resetInactivityTimer();
    }

    function handleReturnToTab() {
      if (!document.hidden && checkInactivity()) {
        resetInactivityTimer();
      }
    }

    // Check the stored timestamp before starting the timer.
    if (!checkInactivity()) return;

    resetInactivityTimer();

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];

    events.forEach((event) => {
      window.addEventListener(event, recordActivity);
    });

    window.addEventListener('focus', handleReturnToTab);
    document.addEventListener('visibilitychange', handleReturnToTab);

    return () => {
      clearTimeout(inactivityTimer);

      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });

      window.removeEventListener('focus', handleReturnToTab);
      document.removeEventListener('visibilitychange', handleReturnToTab);
    };
  }, [token, user]);

  // Verify the saved token and load the staff profile.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function verifySession() {
      const { response, data } = await apiRequest('/auth/me', { token });

      if (cancelled) return;

      if (response.ok && data.success) {
        setUser(data.user);
      } else {
        localStorage.removeItem('inquiry_token');
        setToken('');
        setUser(null);
      }
    }

    verifySession().catch(() => {
      if (!cancelled) setPageError('Unable to connect to the server.');
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Refresh the list when the search query or status filter changes.
  useEffect(() => {
    if (!token || !user) return;

    let cancelled = false;

    async function loadInquiries() {
      setPageError('');

      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter) params.set('status', statusFilter);

      try {
        const { response, data } = await apiRequest(
          `/inquiries?${params.toString()}`,
          { token }
        );

        if (cancelled) return;


        if (response.status === 401) {
          localStorage.removeItem('inquiry_token');
          setToken('');
          setUser(null);
          setInquiries([]);
          setLoginError('Your session has expired. Please sign in again.');
          return;
        }

        if (response.ok && data.success) {
          setInquiries(data.inquiries);
        } else {
          setPageError(data.message || 'Unable to load inquiries.');
        }
      } catch {
        if (!cancelled) {
          setPageError('Cannot connect to the API server.');
        }
      }
    }

    loadInquiries();

    return () => {
      cancelled = true;
    };
  }, [token, user, query, statusFilter]);

  // Refresh inquiries when the user returns to this tab.
  useEffect(() => {
    if (!token || !user) return;

    let refreshing = false;

    async function refreshOnReturn() {
      // Only refresh when this tab is visible.
      if (document.hidden || refreshing) return;

      // Do not make a request after the inactivity session expires.
      const lastActivity = Number(
        localStorage.getItem('inquiryflow_last_activity')
      );

      const inactiveTooLong =
        !lastActivity || Date.now() - lastActivity >= 15 * 60 * 1000;

      if (inactiveTooLong) return;

      refreshing = true;

      try {
        // Keep the current search and status filter.
        const params = new URLSearchParams();

        if (query.trim()) params.set('q', query.trim());
        if (statusFilter) params.set('status', statusFilter);

        const { response, data } = await apiRequest(
          `/inquiries?${params.toString()}`,
          { token }
        );

        if (response.status === 401) {
          // Sign out if the server rejects the session.
          localStorage.removeItem('inquiry_token');
          localStorage.removeItem('inquiryflow_last_activity');

          setToken('');
          setUser(null);
          setInquiries([]);
          setLoginError('Your session has expired. Please sign in again.');
          return;
        }

        if (response.ok && data.success) {
          setInquiries(data.inquiries || []);
          setPageError('');
        } else {
          setPageError(data.message || 'Unable to refresh inquiries.');
        }
      } catch {
        setPageError('Unable to refresh inquiries. Check your connection.');
      } finally {
        refreshing = false;
      }
    }

    // Switching tabs or returning to the browser triggers a refresh.
    function handleTabReturn() {
      if (!document.hidden) {
        refreshOnReturn();
      }
    }

    // Refresh when the user returns to this tab.
    document.addEventListener('visibilitychange', handleTabReturn);
    window.addEventListener('focus', handleTabReturn);

    // Check for updates every 30 seconds while the tab is visible.
    const refreshInterval = setInterval(() => {
      if (!document.hidden) {
        refreshOnReturn();
      }
    }, 30000);

    // Clean up listeners and polling when the component changes.
    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleTabReturn);
      window.removeEventListener('focus', handleTabReturn);
    };
  }, [token, user, query, statusFilter]);

  useEffect(() => {
    sessionStorage.setItem('inquiryflow_query', query);
    sessionStorage.setItem('inquiryflow_status', statusFilter);
  }, [query, statusFilter]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const { response, data } = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok || !data.success) {
        setLoginError(data.message || 'Login failed.');
        return;
      }

      localStorage.setItem('inquiry_token', data.token);
      localStorage.setItem('inquiryflow_last_activity', String(Date.now()));
      setUser(data.user);
      setToken(data.token);
      setNotice('Welcome back!');
    } catch {
      setLoginError('Cannot connect to the API. Check whether the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('inquiry_token');
    localStorage.removeItem('inquiryflow_last_activity');
    setToken('');
    setUser(null);
    setInquiries([]);
    setNotice('');
  }

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitInquiry(event, confirmDuplicate = false) {
    event?.preventDefault();
    setSaving(true);
    setPageError('');

    try {
      const payload = { ...form };
      if (confirmDuplicate) payload.confirmDuplicate = true;

      const { response, data } = await apiRequest('/inquiries', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });

      if (response.status === 409 && data.requiresConfirmation) {
        setDuplicates(data.duplicates || []);
        setPendingInquiry(payload);
        return;
      }

      if (!response.ok || !data.success) {
        setPageError(data.message || 'Unable to create inquiry.');
        return;
      }

      setShowForm(false);
      setForm(emptyForm);
      setDuplicates([]);
      setPendingInquiry(null);
      setNotice(`Inquiry #${data.inquiry.id} created successfully.`);

      // Refresh the current list using its active search and filter.
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter) params.set('status', statusFilter);

      const refreshed = await apiRequest(`/inquiries?${params.toString()}`, { token });
      if (refreshed.response.ok) {
        setInquiries(refreshed.data.inquiries || []);
      }
    } catch {
      setPageError('Cannot connect to the API server.');
    } finally {
      setSaving(false);
    }
  }


  async function changeStatus(inquiry, reason = null) {
    const nextStatus = {
      New: 'In Progress',
      'In Progress': 'Resolved',
      Resolved: 'In Progress',
    }[inquiry.status];

    if (!nextStatus) {
      setPageError('Invalid status transition.');
      return false;
    }

    // Reopening requires a reason entered through our modal.
    if (inquiry.status === 'Resolved' && reason === null) {
      setReopeningInquiry(inquiry);
      setReopenReason('');
      setReopenError('');
      return false;
    }

    if (inquiry.status !== 'Resolved') {
      const confirmed = window.confirm(
        `Change inquiry #${inquiry.id} from "${inquiry.status}" to "${nextStatus}"?`
      );

      if (!confirmed) return false;
    }

    setPageError('');
    setNotice('');

    try {
      const payload = { status: nextStatus };

      if (inquiry.status === 'Resolved') {
        payload.reopen_reason = reason;
      }

      const { response, data } = await apiRequest(
        `/inquiries/${inquiry.id}/status`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok || !data.success) {
        const message = data.message || 'Unable to update status.';

        if (inquiry.status === 'Resolved') {
          setReopenError(message);
        } else {
          setPageError(message);
        }

        return false;
      }

      const params = new URLSearchParams();

      if (query.trim()) params.set('q', query.trim());
      if (statusFilter) params.set('status', statusFilter);

      const refreshed = await apiRequest(
        `/inquiries?${params.toString()}`,
        { token }
      );

      if (refreshed.response.ok && refreshed.data.success) {
        setInquiries(refreshed.data.inquiries || []);
      } else {
        setPageError('Status updated, but the list could not be refreshed.');
      }

      setNotice(
        inquiry.status === 'Resolved'
          ? `Inquiry #${inquiry.id} reopened successfully.`
          : `Inquiry #${inquiry.id} changed to ${nextStatus}.`
      );

      return true;
    } catch {
      const message = 'Cannot connect to the API server.';

      if (inquiry.status === 'Resolved') {
        setReopenError(message);
      } else {
        setPageError(message);
      }

      return false;
    }
  }

  // Load the status history of the selected inquiry
  async function openHistory(inquiry) {
    setHistoryInquiry(inquiry);
    setStatusHistory([]);
    setHistoryError('');
    setHistoryLoading(true);

    try {
      const { response, data } = await apiRequest(
        `/inquiries/${inquiry.id}/history`,
        { token }
      );

      if (!response.ok || !data.success) {
        setHistoryError(data.message || 'Unable to load status history.');
        return;
      }

      // Save the returned history records
      setStatusHistory(data.history || []);
    } catch {
      setHistoryError('Cannot connect to the API server.');
    } finally {
      setHistoryLoading(false);
    }
  }

  // Open the inquiry details modal.
  function openDetails(inquiry) {
    setDetailsInquiry(inquiry);

    // Fill the form with the selected inquiry's current values.
    setEditForm({
      customer_name: inquiry.customer_name,
      customer_contact: inquiry.customer_contact,
      subject: inquiry.subject,
      description: inquiry.description,
      source_channel: inquiry.source_channel,
    });

    setIsEditing(false);
    setEditError('');
  }

  // Save edited inquiry details to the database.
  async function saveInquiryEdit(event) {
    event.preventDefault();
    if (!detailsInquiry || editSaving) return;

    setEditSaving(true);
    setEditError('');

    try {
      const { response, data } = await apiRequest(
        `/inquiries/${detailsInquiry.id}`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok || !data.success) {
        // Show the backend validation message.
        const firstError = data.errors?.[0]?.message;
        setEditError(firstError || data.message || 'Unable to save changes.');
        return;
      }

      // Update the details modal and the inquiry list.
      setDetailsInquiry(data.inquiry);
      setInquiries((current) =>
        current.map((item) =>
          item.id === data.inquiry.id
            ? { ...item, ...data.inquiry }
            : item
        )
      );

      setIsEditing(false);
      setNotice(`Inquiry #${detailsInquiry.id} updated successfully.`);
    } catch {
      setEditError('Cannot connect to the API server.');
    } finally {
      setEditSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-mark">IF</div>
          <p className="eyebrow">INQUIRYFLOW</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage customer inquiries.</p>

          <form onSubmit={handleLogin} className="form-stack">
            <label>
              Work email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {loginError && <p className="error-message">{loginError}</p>}

            <button className="primary-button full-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="login-footnote">
            Local assessment demo · Use the seeded staff accounts
          </p>
        </section>
      </main>
    );
  }

  const newCount = inquiries.filter((item) => item.status === 'New').length;
  const progressCount = inquiries.filter(
    (item) => item.status === 'In Progress'
  ).length;
  const resolvedCount = inquiries.filter(
    (item) => item.status === 'Resolved'
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* Application branding */}
        <div className="sidebar-brand">
          <div className="brand-symbol">
            <Inbox size={25} strokeWidth={2.2} />
          </div>

          <div>
            <strong>
              Inquiry<span className="brand-accent">Flow</span>
            </strong>
            <span>Inquiry Desk</span>
          </div>
        </div>

        <div className="nav-item active">
          <Inbox size={18} /> Inquiries
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">{user.name?.charAt(0) || 'S'}</div>
          <div className="staff-info">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button className="icon-button" title="Sign out" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">CUSTOMER SUPPORT</p>
            <h1>Inquiry Management</h1>
            <p className="muted">Keep every customer conversation on track.</p>
          </div>

          <button
            className="primary-button"
            onClick={() => {
              setShowForm(true);
              setPageError('');
              setDuplicates([]);
              setPendingInquiry(null);
            }}
          >
            <Plus size={18} /> New inquiry
          </button>
        </header>

        {notice && (
          <div className="notice-message">
            <CheckCircle2 size={18} /> {notice}
            <button className="icon-button" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {pageError && (
          <div className="error-banner">
            <AlertCircle size={18} /> {pageError}
            <button className="icon-button" onClick={() => setPageError('')}>
              <X size={16} />
            </button>
          </div>
        )}

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon blue"><Inbox size={20} /></span>
            <p>Total shown</p>
            <h2>{inquiries.length}</h2>
          </article>
          <article className="stat-card">
            <span className="stat-icon orange"><Clock size={20} /></span>
            <p>New</p>
            <h2>{newCount}</h2>
          </article>
          <article className="stat-card">
            <span className="stat-icon purple"><RefreshCw size={20} /></span>
            <p>In progress</p>
            <h2>{progressCount}</h2>
          </article>
          <article className="stat-card">
            <span className="stat-icon green"><CheckCircle2 size={20} /></span>
            <p>Resolved</p>
            <h2>{resolvedCount}</h2>
          </article>
        </section>

        {viewingDuplicates && (
          <div className="duplicate-return">
            <p>
              Reviewing existing inquiries for {form.customer_contact}
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setViewingDuplicates(false);
                setShowForm(true);
              }}
            >
              <X size={16} />
              Back to inquiry form
            </button>
          </div>
        )}
        
        <section className="inquiries-panel">
          <div className="panel-heading">
            <div>
              <h2>All inquiries</h2>
              <p className="muted">Search, review and update customer requests.</p>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                placeholder="Search customer, contact or subject..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer / Subject</th>
                  <th>Contact</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((item) => (
                  <tr key={item.id}>
                    {/* Customer and inquiry summary */}
                    <td className="customer-cell">
                      <strong>{item.customer_name}</strong>
                      <span className="table-subtitle">{item.subject}</span>
                      <span className="table-description">{item.description}</span>
                    </td>
                    <td>{item.customer_contact}</td>
                    <td>{item.source_channel}</td>
                    <td>
                      <div className="status-cell">
                        <span
                          className={`status-pill ${item.status.toLowerCase().replace(' ', '-')}`}
                        >
                          {item.status}
                        </span>

                        {item.was_reopened && (
                          <span className="reopened-badge">
                            <RefreshCw size={12} />
                            Reopened
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      {/* Compact inquiry actions */}
                      <div className="table-actions">
                        {/* Change status using a color based on the action */}
                        <button
                          type="button"
                          className={`action-status ${item.status === 'New'
                              ? 'action-start'
                              : item.status === 'In Progress'
                                ? 'action-resolve'
                                : 'action-reopen'
                            }`}
                          onClick={() => changeStatus(item)}
                        >
                          {item.status === 'New' ? (
                            <>
                              <Play size={14} fill="currentColor" />
                              Start
                            </>
                          ) : item.status === 'In Progress' ? (
                            <>
                              <CheckCircle2 size={14} />
                              Resolve
                            </>
                          ) : (
                            <>
                              <RefreshCw size={14} />
                              Reopen
                            </>
                          )}
                        </button>

                        {/* Open inquiry details and edit form */}
                        <button
                          type="button"
                          className="secondary-button action-icon"
                          title="View or edit inquiry"
                          aria-label={`View details for inquiry ${item.id}`}
                          onClick={() => openDetails(item)}
                        >
                          <Pencil size={16} />
                        </button>

                        {/* View status history */}
                        <button
                          type="button"
                          className="secondary-button action-icon"
                          title="View status history"
                          aria-label={`View history for inquiry ${item.id}`}
                          onClick={() => openHistory(item)}
                        >
                          <Clock size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {inquiries.length === 0 && (
              <div className="empty-state">
                <Inbox size={32} />
                <h3>No inquiries found</h3>
                <p>Try changing your search or create a new inquiry.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <section className="modal-card">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">CUSTOMER SUPPORT</p>
                <h2>New inquiry</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="form-stack" onSubmit={(e) => submitInquiry(e)}>
              <label>
                Customer name
                <input name="customer_name" value={form.customer_name} onChange={updateForm} maxLength={150} required />
              </label>

              <label>
                Customer contact
                <input name="customer_contact" value={form.customer_contact} onChange={updateForm} maxLength={255} required />
              </label>

              <label>
                Subject
                <input name="subject" value={form.subject} onChange={updateForm} minLength={3} maxLength={200} required />
              </label>

              <label>
                Description
                <textarea name="description" value={form.description} onChange={updateForm} minLength={5} maxLength={2000} rows={3} required />
              </label>

              <label>
                Received through
                <select name="source_channel" value={form.source_channel} onChange={updateForm}>
                  <option>Phone Call</option>
                  <option>Email</option>
                  <option>WhatsApp</option>
                  <option>Website</option>
                  <option>Other</option>
                </select>
              </label>

              {duplicates.length > 0 && (
                <div className="duplicate-box">
                  <h3><AlertCircle size={18} /> Similar inquiry found</h3>
                  <p>Review the existing inquiry before creating another one.</p>

                  {duplicates.map((item) => (
                    <div className="duplicate-item" key={item.id}>
                      <strong>#{item.id} · {item.subject}</strong>
                      <span>{item.customer_name} · {item.customer_contact}</span>
                      <span className="status-pill">{item.status}</span>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setViewingDuplicates(true);
                      setShowForm(false);
                      setQuery(form.customer_contact);
                      setStatusFilter('');
                    }}
                  >
                    View existing inquiry
                  </button>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>

                {duplicates.length > 0 ? (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={saving}
                    onClick={() => submitInquiry(null, true)}
                  >
                    {saving ? 'Saving...' : 'Create anyway'}
                  </button>
                ) : (
                  <button className="primary-button" disabled={saving}>
                    {saving ? 'Saving...' : 'Create inquiry'}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

      {reopeningInquiry && (
        <div className="modal-backdrop">
          <section
            className="modal-card reopen-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reopen-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">INQUIRY LIFECYCLE</p>
                <h2 id="reopen-title">Reopen inquiry</h2>
              </div>

              <button
                type="button"
                className="icon-button"
                disabled={reopenSaving}
                aria-label="Close reopen dialog"
                onClick={() => setReopeningInquiry(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="reopen-summary">
              <span className="reopen-reference">
                Inquiry #{reopeningInquiry.id}
              </span>

              <h3>{reopeningInquiry.subject}</h3>
              <p>{reopeningInquiry.customer_name}</p>

              <div className="reopen-transition">
                <span className="status-pill resolved">Resolved</span>
                <span aria-hidden="true">→</span>
                <span className="status-pill in-progress">In Progress</span>
              </div>
            </div>

            <form
              className="form-stack"
              onSubmit={async (event) => {
                event.preventDefault();

                const reason = reopenReason.trim();

                if (reason.length < 10 || reason.length > 500) {
                  setReopenError('Reason must be between 10 and 500 characters.');
                  return;
                }

                setReopenError('');
                setReopenSaving(true);

                try {
                  const success = await changeStatus(reopeningInquiry, reason);

                  if (success) {
                    setReopeningInquiry(null);
                    setReopenReason('');
                  }
                } finally {
                  setReopenSaving(false);
                }
              }}
            >
              <label>
                Reason for reopening
                <textarea
                  value={reopenReason}
                  onChange={(event) => {
                    setReopenReason(event.target.value);
                    setReopenError('');
                  }}
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  required
                  autoFocus
                  placeholder="Explain why this inquiry needs further attention..."
                />
              </label>

              <div className="reopen-helper">
                <span>This reason will be saved in the status history.</span>
                <span>{reopenReason.length}/500</span>
              </div>

              {reopenError && (
                <p className="error-message" role="alert">
                  {reopenError}
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={reopenSaving}
                  onClick={() => setReopeningInquiry(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    reopenSaving ||
                    reopenReason.trim().length < 10
                  }
                >
                  <RefreshCw size={16} />
                  {reopenSaving ? 'Reopening...' : 'Confirm reopen'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Show the selected inquiry's status history */}
      {historyInquiry && (
        <div className="modal-backdrop">
          <section
            className="modal-card history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">ACTIVITY LOG</p>
                <h2 id="history-title">Status history</h2>
                <p className="muted">
                  Inquiry #{historyInquiry.id} · {historyInquiry.subject}
                </p>
              </div>

              <button
                type="button"
                className="icon-button"
                aria-label="Close history"
                onClick={() => setHistoryInquiry(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Show loading, error, empty state, or history records */}
            {historyLoading ? (
              <div className="history-feedback">
                <RefreshCw size={20} />
                <p>Loading history...</p>
              </div>
            ) : historyError ? (
              <div className="history-feedback">
                <AlertCircle size={20} />
                <p>{historyError}</p>
              </div>
            ) : statusHistory.length === 0 ? (
              <div className="history-feedback">
                <Clock size={24} />
                <p>No status changes recorded yet.</p>
              </div>
            ) : (
              <div className="history-timeline">
                {/* Display each status change */}
                {statusHistory.map((entry) => (
                  <article className="history-entry" key={entry.id}>
                    <span className="history-dot" />

                    <div className="history-entry-content">
                      <div className="history-transition">
                        <span>{entry.previous_status}</span>
                        <span aria-hidden="true">→</span>
                        <strong>{entry.new_status}</strong>
                      </div>

                      {/* Staff member and change date */}
                      <p className="history-meta">
                        {entry.changed_by_name} ·{' '}
                        {new Date(entry.changed_at).toLocaleString()}
                      </p>

                      {/* Only reopened inquiries have a reopen reason */}
                      {entry.reopen_reason && (
                        <div className="history-reason">
                          <strong>Reason for reopening</strong>
                          <p>{entry.reopen_reason}</p>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setHistoryInquiry(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* View and edit inquiry details */}
      {detailsInquiry && (
        <div className="modal-backdrop">
          <section
            className="modal-card details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">CUSTOMER INQUIRY</p>
                <h2 id="details-title">
                  Inquiry #{detailsInquiry.id}
                </h2>
                <p className="muted">
                  View or correct customer inquiry information.
                </p>
              </div>

              <button
                type="button"
                className="icon-button"
                aria-label="Close details"
                disabled={editSaving}
                onClick={() => setDetailsInquiry(null)}
              >
                <X size={20} />
              </button>
            </div>

            {!isEditing ? (
              <>
                {/* Read-only inquiry information */}
                <div className="details-grid">
                  <div>
                    <span>Customer name</span>
                    <strong>{detailsInquiry.customer_name}</strong>
                  </div>

                  <div>
                    <span>Customer contact</span>
                    <strong>{detailsInquiry.customer_contact}</strong>
                  </div>

                  <div>
                    <span>Subject</span>
                    <strong>{detailsInquiry.subject}</strong>
                  </div>

                  <div>
                    <span>Received through</span>
                    <strong>{detailsInquiry.source_channel}</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>{detailsInquiry.status}</strong>
                  </div>

                  <div>
                    <span>Created</span>
                    <strong>
                      {new Date(detailsInquiry.created_at).toLocaleString()}
                    </strong>
                  </div>

                  <div className="details-full">
                    <span>Description</span>
                    <p>{detailsInquiry.description}</p>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDetailsInquiry(null)}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setEditError('');
                      setIsEditing(true);
                    }}
                  >
                    Edit inquiry
                  </button>
                </div>
              </>
            ) : (
              <form className="form-stack" onSubmit={saveInquiryEdit}>
                {/* Only customer details can be edited; status is separate. */}
                <label>
                  Customer name
                  <input
                    value={editForm.customer_name}
                    maxLength={150}
                    minLength={2}
                    required
                    onChange={(e) =>
                      setEditForm({ ...editForm, customer_name: e.target.value })
                    }
                  />
                </label>

                <label>
                  Customer contact
                  <input
                    value={editForm.customer_contact}
                    maxLength={255}
                    minLength={3}
                    required
                    onChange={(e) =>
                      setEditForm({ ...editForm, customer_contact: e.target.value })
                    }
                  />
                </label>

                <label>
                  Subject
                  <input
                    value={editForm.subject}
                    maxLength={200}
                    minLength={3}
                    required
                    onChange={(e) =>
                      setEditForm({ ...editForm, subject: e.target.value })
                    }
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={editForm.description}
                    maxLength={2000}
                    minLength={5}
                    rows={4}
                    required
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                  />
                </label>

                <label>
                  Received through
                  <select
                    value={editForm.source_channel}
                    onChange={(e) =>
                      setEditForm({ ...editForm, source_channel: e.target.value })
                    }
                  >
                    <option>Phone Call</option>
                    <option>Email</option>
                    <option>WhatsApp</option>
                    <option>Website</option>
                    <option>Other</option>
                  </select>
                </label>

                {editError && (
                  <p className="error-message" role="alert">
                    {editError}
                  </p>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={editSaving}
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={editSaving}
                  >
                    {editSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

    </div>
  );
}

export default App;