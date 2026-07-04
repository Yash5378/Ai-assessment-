import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  validatePhone,
  validateLength,
  validateResumeFile,
  collectErrors,
} from '../../utils/validation';
import FormField from '../../components/FormField';
import Alert from '../../components/Alert';

const EMPLOYMENT_OPTIONS = [
  { value: 'FRESHER', label: 'Fresher' },
  { value: 'EXPERIENCED', label: 'Experienced' },
];

/**
 * One-time gate: a candidate must supply their basics and a resume before
 * they can reach the rest of the app.
 */
export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ phone: '', currentCity: '', employmentStatus: 'FRESHER' });
  const [resume, setResume] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already-onboarded candidates (and HR) have no business here.
  if (user && (user.role !== 'CANDIDATE' || user.onboarded)) {
    return <Navigate to={user.role === 'HR' ? '/hr' : '/jobs'} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (event) => {
    setResume(event.target.files[0] ?? null);
    setErrors((prev) => ({ ...prev, resume: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError('');

    const fieldErrors = collectErrors({
      phone: () => validatePhone(form.phone),
      currentCity: () => validateLength(form.currentCity, 'Current city', 2, 100),
      resume: () => validateResumeFile(resume),
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const payload = new FormData();
    payload.append('phone', form.phone.trim());
    payload.append('currentCity', form.currentCity.trim());
    payload.append('employmentStatus', form.employmentStatus);
    payload.append('resume', resume);

    setSubmitting(true);
    try {
      await api.upload('/profile/onboarding', payload);
      await refreshUser();
      navigate('/jobs', { replace: true });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card onboarding-card" onSubmit={handleSubmit} noValidate>
        <h1>Complete your profile</h1>
        <p className="muted">
          Welcome{user ? `, ${user.name}` : ''}! Just a few details before you start applying.
        </p>

        <Alert>{apiError}</Alert>

        <FormField
          label="Phone number"
          name="phone"
          type="tel"
          placeholder="e.g. +91 98765 43210"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          autoComplete="tel"
        />
        <FormField
          label="Current city"
          name="currentCity"
          placeholder="e.g. Bengaluru, India"
          value={form.currentCity}
          onChange={handleChange}
          error={errors.currentCity}
        />
        <FormField
          label="Are you a fresher or experienced?"
          name="employmentStatus"
          as="select"
          value={form.employmentStatus}
          onChange={handleChange}
        >
          {EMPLOYMENT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormField>

        <div className="form-field">
          <label htmlFor="resume">Resume (PDF, DOC or DOCX — max 5 MB)</label>
          <input
            id="resume"
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx"
            className={errors.resume ? 'input input-error' : 'input'}
            onChange={handleFileChange}
          />
          {resume && !errors.resume && <p className="muted small">Selected: {resume.name}</p>}
          {errors.resume && <p className="field-error">{errors.resume}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Saving…' : 'Finish and continue'}
        </button>
      </form>
    </div>
  );
}
