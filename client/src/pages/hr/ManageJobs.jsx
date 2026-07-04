import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/Alert';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import JobForm from '../../components/JobForm';
import SkillChips from '../../components/SkillChips';
import { formatEmploymentType, formatDate, formatSalary, formatExperience } from '../../utils/format';

export default function ManageJobs() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadJobs = () => {
    api
      .get('/jobs')
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err.message));
  };

  useEffect(loadJobs, []);

  const handleCreate = async (values) => {
    await api.post('/jobs', values);
    setShowCreateForm(false);
    loadJobs();
  };

  const handleUpdate = (jobId) => async (values) => {
    await api.patch(`/jobs/${jobId}`, values);
    setEditingJobId(null);
    loadJobs();
  };

  const toggleStatus = async (job) => {
    setActionError('');
    try {
      await api.patch(`/jobs/${job.id}`, {
        status: job.status === 'OPEN' ? 'CLOSED' : 'OPEN',
      });
      loadJobs();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (error) return <div className="page"><Alert>{error}</Alert></div>;
  if (!jobs) return <div className="page-loader">Loading jobs…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Manage jobs</h1>
          <p className="muted">Post openings, edit details and review applicants</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateForm((visible) => !visible)}
        >
          {showCreateForm ? 'Close form' : 'Post new job'}
        </button>
      </div>

      <Alert>{actionError}</Alert>

      {showCreateForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>New job posting</h2>
          <JobForm onSubmit={handleCreate} submitLabel="Publish job" onCancel={() => setShowCreateForm(false)} />
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState title="No jobs posted yet" hint="Use the button above to publish your first opening." />
      ) : (
        <div className="card-list">
          {jobs.map((job) => {
            const isOwner = job.createdBy === user.id;
            return (
              <article key={job.id} className="card">
                {editingJobId === job.id ? (
                  <>
                    <h2>Edit job</h2>
                    <JobForm
                      initialValues={{
                        title: job.title,
                        company: job.company,
                        description: job.description,
                        location: job.location,
                        employmentType: job.employmentType,
                        skills: (job.skills ?? []).join(', '),
                        experienceMin: String(job.experienceMin ?? 0),
                        experienceMax: job.experienceMax == null ? '' : String(job.experienceMax),
                        salaryMin: job.salaryMin == null ? '' : String(job.salaryMin),
                        salaryMax: job.salaryMax == null ? '' : String(job.salaryMax),
                      }}
                      onSubmit={handleUpdate(job.id)}
                      onCancel={() => setEditingJobId(null)}
                      submitLabel="Save changes"
                    />
                  </>
                ) : (
                  <div className="card-row">
                    <div>
                      <h3>
                        {job.title} <StatusBadge status={job.status} />
                      </h3>
                      <p className="card-meta">
                        <span>{job.company}</span>
                        <span>{job.location}</span>
                        <span>{formatEmploymentType(job.employmentType)}</span>
                        <span>{formatExperience(job.experienceMin, job.experienceMax)}</span>
                        <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                        <span>Posted {formatDate(job.createdAt)}</span>
                        {!isOwner && <span>Posted by another HR user</span>}
                      </p>
                      <SkillChips skills={job.skills} />
                    </div>
                    {isOwner && (
                      <div className="card-actions">
                        <Link className="btn btn-secondary btn-sm" to={`/hr/jobs/${job.id}/applicants`}>
                          Applicants ({job.applicationCount})
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingJobId(job.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleStatus(job)}
                        >
                          {job.status === 'OPEN' ? 'Close' : 'Reopen'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
