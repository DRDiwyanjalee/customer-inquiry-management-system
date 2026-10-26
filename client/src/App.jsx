
import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import {
  Search, Plus, LogOut, RefreshCw, Inbox,
  AlertCircle, CheckCircle2, Clock, X,
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


  // Automatically sign out after 15 minutes without user activity.
  useEffect(() => {
    if (!token || !user) return;

    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    let inactivityTimer;

    function signOutForInactivity() {
      localStorage.removeItem('inquiry_token');
      setToken('');
      setUser(null);
      setInquiries([]);
      setNotice('');
      setLoginError('Your session ended due to inactivity. Please sign in again.');
    }

    function resetInactivityTimer() {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(signOutForInactivity, INACTIVITY_LIMIT);
    }

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];

    events.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);

      events.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
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


  async function changeStatus(inquiry) {
    const nextStatus = {
      New: 'In Progress',
      'In Progress': 'Resolved',
      Resolved: 'In Progress',
    }[inquiry.status];

    if (!nextStatus) {
      setPageError('Invalid status transition.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change inquiry #${inquiry.id} from "${inquiry.status}" to "${nextStatus}"?`
    );

    if (!confirmed) return;

    setPageError('');
    setNotice('');

    try {
      const { response, data } = await apiRequest(
        `/inquiries/${inquiry.id}/status`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      if (!response.ok || !data.success) {
        setPageError(data.message || 'Unable to update status.');
        return;
      }

      // Reload inquiries using the currently selected search and filter.
      const params = new URLSearchParams();

      if (query.trim()) {
        params.set('q', query.trim());
      }

      if (statusFilter) {
        params.set('status', statusFilter);
      }

      const refreshed = await apiRequest(
        `/inquiries?${params.toString()}`,
        { token }
      );

      if (refreshed.response.ok && refreshed.data.success) {
        setInquiries(refreshed.data.inquiries || []);
      } else {
        setPageError('Status updated, but the list could not be refreshed.');
      }

      setNotice(`Inquiry #${inquiry.id} changed to ${nextStatus}.`);
    } catch {
      setPageError('Cannot connect to the API server.');
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
        <div className="sidebar-brand">
          <div className="brand-mark small-mark">IF</div>
          <div>
            <strong>InquiryFlow</strong>
            <span>Inquiry Desk</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
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
                    <td>
                      <strong>{item.customer_name}</strong>
                      <span className="table-subtitle">{item.subject}</span>
                      <span className="table-description">{item.description}</span>
                    </td>
                    <td>{item.customer_contact}</td>
                    <td>{item.source_channel}</td>
                    <td>
                      <span className={`status-pill ${item.status.toLowerCase().replace(' ', '-')}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => changeStatus(item)}
                      >
                        {item.status === 'New'
                          ? 'Start'
                          : item.status === 'In Progress'
                            ? 'Resolve'
                            : 'Reopen'}
                      </button>
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
    </div>
  );
}

export default App;
