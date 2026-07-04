import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatEmploymentType, formatDate } from '../../utils/format';

export default function MyApplications() {
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/applications/mine')
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page"><Alert>{error}</Alert></div>;
  if (!applications) return <div className="page-loader">Loading applications…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My applications</h1>
          <p className="muted">Track the status of every job you applied to</p>
        </div>
      </div>

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
                <StatusBadge status={application.status} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
