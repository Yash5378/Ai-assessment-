import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import FormField from '../../components/FormField';
import SkillChips from '../../components/SkillChips';
import { validateLength, collectErrors } from '../../utils/validation';
import { formatEmploymentType, formatDate, formatSalary, formatExperience } from '../../utils/format';

export default function JobDetail() {
  const { id } = useParams();

  const [job, setJob] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [hasApplied, setHasApplied] = useState(false);

  const [coverLetter, setCoverLetter] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/jobs/${id}`), api.get('/applications/mine')])
      .then(([jobData, applicationsData]) => {
        setJob(jobData.job);
        setHasApplied(applicationsData.applications.some((a) => a.jobId === jobData.job.id));
      })
      .catch((err) => setLoadError(err.status === 404 ? 'This job does not exist or is no longer open.' : err.message));
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError('');

    const errors = collectErrors({
      coverLetter: () => validateLength(coverLetter, 'Cover letter', 20, 3000),
    });
    if (errors.coverLetter) {
      setFieldError(errors.coverLetter);
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/jobs/${id}/applications`, { coverLetter: coverLetter.trim() });
      setApplied(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="page">
        <Alert>{loadError}</Alert>
        <Link to="/jobs">← Back to jobs</Link>
      </div>
    );
  }
  if (!job) return <div className="page-loader">Loading job…</div>;

  return (
    <div className="page">
      <p>
        <Link to="/jobs">← Back to jobs</Link>
      </p>

      <div className="card">
        <h1>{job.title}</h1>
        <p className="card-meta">
          <span>{job.company}</span>
          <span>{job.location}</span>
          <span>{formatEmploymentType(job.employmentType)}</span>
          <span>{formatExperience(job.experienceMin, job.experienceMax)}</span>
          <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
          <span>Posted {formatDate(job.createdAt)}</span>
        </p>
        <SkillChips skills={job.skills} />
        <p className="description-text">{job.description}</p>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2>Apply for this position</h2>

        {hasApplied || applied ? (
          <Alert kind="success">
            {applied
              ? 'Application submitted! Track its status under My Applications.'
              : 'You have already applied to this job. Track it under My Applications.'}{' '}
            <Link to="/my-applications">View my applications</Link>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Alert>{apiError}</Alert>
            <FormField
              label="Cover letter"
              name="coverLetter"
              as="textarea"
              rows={6}
              placeholder="Tell the hiring team why you are a great fit (20–3000 characters)"
              value={coverLetter}
              onChange={(event) => {
                setCoverLetter(event.target.value);
                setFieldError('');
              }}
              error={fieldError}
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
