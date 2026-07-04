import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/format';

const STATUS_OPTIONS = [
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function JobApplicants() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/applications`)])
      .then(([jobData, applicationsData]) => {
        setJob(jobData.job);
        setApplications(applicationsData.applications);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const updateStatus = async (applicationId, status) => {
    setActionError('');
    try {
      const data = await api.patch(`/applications/${applicationId}/status`, { status });
      setApplications((previous) =>
        previous.map((application) =>
          application.id === applicationId
            ? { ...application, status: data.application.status }
            : application
        )
      );
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (error)
    return (
      <div className="page">
        <Alert>{error}</Alert>
      </div>
    );
  if (!job || !applications) return <div className="page-loader">Loading applicants…</div>;

  return (
    <div className="page">
      <p>
        <Link to="/hr/jobs">← Back to manage jobs</Link>
      </p>

      <div className="page-header">
        <div>
          <h1>
            {job.title} <StatusBadge status={job.status} />
          </h1>
          <p className="muted">
            {applications.length} applicant{applications.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <Alert>{actionError}</Alert>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          hint="Candidates will appear here once they apply."
        />
      ) : (
        <div className="card-list">
          {applications.map((application) => (
            <article key={application.id} className="card">
              <div className="card-row">
                <div>
                  <h3>{application.candidateName}</h3>
                  <p className="card-meta">
                    <span>{application.candidateEmail}</span>
                    <span>Applied {formatDate(application.createdAt)}</span>
                  </p>
                </div>
                <div className="card-actions">
                  <StatusBadge status={application.status} />
                  {application.hasResume && (
                    <a
                      className="btn btn-secondary btn-sm"
                      href={`/api/candidates/${application.candidateId}/resume`}
                    >
                      Resume
                    </a>
                  )}
                  <select
                    className="select-inline"
                    value=""
                    aria-label={`Update status for ${application.candidateName}`}
                    onChange={(event) => {
                      if (event.target.value) updateStatus(application.id, event.target.value);
                    }}
                  >
                    <option value="" disabled>
                      Move to…
                    </option>
                    {STATUS_OPTIONS.filter((option) => option.value !== application.status).map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <p className="description-text muted">{application.coverLetter}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
