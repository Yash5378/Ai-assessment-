import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import { formatEmploymentType, formatDate } from '../../utils/format';

export default function Jobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/jobs')
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page"><Alert>{error}</Alert></div>;
  if (!jobs) return <div className="page-loader">Loading jobs…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Open positions</h1>
          <p className="muted">{jobs.length} job{jobs.length === 1 ? '' : 's'} accepting applications</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No open positions right now" hint="Please check back later." />
      ) : (
        <div className="card-list">
          {jobs.map((job) => (
            <article key={job.id} className="card">
              <div className="card-row">
                <div>
                  <h3>
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                  </h3>
                  <p className="card-meta">
                    <span>{job.location}</span>
                    <span>{formatEmploymentType(job.employmentType)}</span>
                    {job.salaryRange && <span>{job.salaryRange}</span>}
                    <span>Posted {formatDate(job.createdAt)}</span>
                  </p>
                </div>
                <div className="card-actions">
                  {job.hasApplied ? (
                    <span className="badge badge-submitted">Applied</span>
                  ) : (
                    <Link className="btn btn-primary btn-sm" to={`/jobs/${job.id}`}>
                      View & apply
                    </Link>
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
