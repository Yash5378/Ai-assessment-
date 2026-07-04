import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatEmploymentType, formatDate } from '../../utils/format';

// Withdrawal only makes sense while the application is still in play.
const WITHDRAWABLE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW'];

export default function MyApplications() {
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState(null);

  useEffect(() => {
    api
      .get('/applications/mine')
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message));
  }, []);

  const handleWithdraw = async (application) => {
    const confirmed = window.confirm(
      `Withdraw your application for "${application.jobTitle}"? You can apply again later while the job is open.`
    );
    if (!confirmed) return;

    setActionError('');
    setWithdrawingId(application.id);
    try {
      await api.delete(`/applications/${application.id}`);
      setApplications((previous) => previous.filter((a) => a.id !== application.id));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWithdrawingId(null);
    }
  };

  if (error)
    return (
      <div className="page">
        <Alert>{error}</Alert>
      </div>
    );
  if (!applications) return <div className="page-loader">Loading applications…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My applications</h1>
          <p className="muted">Track the status of every job you applied to</p>
        </div>
      </div>

      <Alert>{actionError}</Alert>

      {applications.length === 0 ? (
        <EmptyState
          title="You haven't applied to any jobs yet"
          hint={<Link to="/jobs">Browse open positions</Link>}
        />
      ) : (
        <div className="card-list">
          {applications.map((application) => (
            <article key={application.id} className="card">
              <div className="card-row">
                <div>
                  <h3>{application.jobTitle}</h3>
                  <p className="card-meta">
                    <span>{application.jobLocation}</span>
                    <span>{formatEmploymentType(application.employmentType)}</span>
                    <span>Applied {formatDate(application.createdAt)}</span>
                  </p>
                </div>
                <div className="card-actions">
                  <StatusBadge status={application.status} />
                  {WITHDRAWABLE_STATUSES.includes(application.status) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={withdrawingId === application.id}
                      onClick={() => handleWithdraw(application)}
                    >
                      {withdrawingId === application.id ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
