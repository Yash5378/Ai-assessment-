import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import FormField from '../../components/FormField';
import { NOTICE_PERIOD_OPTIONS } from '../../utils/format';
import {
  validateLength,
  validateNumber,
  validatePhone,
  validateSkills,
  validateResumeFile,
  parseSkills,
  collectErrors,
} from '../../utils/validation';

const EMPLOYMENT_OPTIONS = [
  { value: 'FRESHER', label: 'Fresher' },
  { value: 'EXPERIENCED', label: 'Experienced' },
];

const toNumberOrEmpty = (value) => (value == null ? '' : String(value));
const toNumberOrNull = (value) => (String(value).trim() === '' ? null : Number(value));

export default function Profile() {
  const [form, setForm] = useState(null);
  const [resumeName, setResumeName] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [resumeMessage, setResumeMessage] = useState('');
  const [resumeError, setResumeError] = useState('');
  const resumeInputRef = useRef(null);

  useEffect(() => {
    api
      .get('/profile/me')
      .then(({ profile }) => {
        setResumeName(profile.resumeName ?? null);
        setForm({
          headline: profile.headline ?? '',
          skills: (profile.skills ?? []).join(', '),
          experienceYears: String(profile.experienceYears ?? 0),
          phone: profile.phone ?? '',
          currentCity: profile.currentCity ?? '',
          employmentStatus: profile.employmentStatus ?? 'FRESHER',
          currentCompany: profile.currentCompany ?? '',
          currentDesignation: profile.currentDesignation ?? '',
          currentCtc: toNumberOrEmpty(profile.currentCtc),
          expectedCtc: toNumberOrEmpty(profile.expectedCtc),
          noticePeriod: profile.noticePeriod ?? '',
          industry: profile.industry ?? '',
          department: profile.department ?? '',
        });
      })
      .catch((err) => setApiError(err.message));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError('');
    setSuccess('');

    const fieldErrors = collectErrors({
      headline: () =>
        form.headline.trim() ? validateLength(form.headline, 'Headline', 1, 150) : '',
      skills: () => validateSkills(form.skills, { required: false }),
      experienceYears: () => validateNumber(form.experienceYears, 'Experience', { required: true }),
      phone: () => validatePhone(form.phone, { required: false }),
      currentCity: () =>
        form.currentCity.trim() ? validateLength(form.currentCity, 'Current city', 1, 100) : '',
      currentCompany: () =>
        form.currentCompany.trim()
          ? validateLength(form.currentCompany, 'Current company', 1, 100)
          : '',
      currentDesignation: () =>
        form.currentDesignation.trim()
          ? validateLength(form.currentDesignation, 'Designation', 1, 100)
          : '',
      industry: () =>
        form.industry.trim() ? validateLength(form.industry, 'Industry', 1, 100) : '',
      department: () =>
        form.department.trim() ? validateLength(form.department, 'Department', 1, 100) : '',
      currentCtc: () => validateNumber(form.currentCtc, 'Current CTC', { max: 1000 }),
      expectedCtc: () => validateNumber(form.expectedCtc, 'Expected CTC', { max: 1000 }),
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await api.put('/profile/me', {
        headline: form.headline.trim(),
        skills: parseSkills(form.skills),
        experienceYears: Number(form.experienceYears),
        phone: form.phone.trim(),
        currentCity: form.currentCity.trim(),
        employmentStatus: form.employmentStatus,
        currentCompany: form.currentCompany.trim(),
        currentDesignation: form.currentDesignation.trim(),
        currentCtc: toNumberOrNull(form.currentCtc),
        expectedCtc: toNumberOrNull(form.expectedCtc),
        noticePeriod: form.noticePeriod,
        industry: form.industry.trim(),
        department: form.department.trim(),
      });
      setSuccess('Profile saved.');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    setResumeError('');
    setResumeMessage('');
    if (!file) return;

    const validationError = validateResumeFile(file);
    if (validationError) {
      setResumeError(validationError);
      return;
    }

    const payload = new FormData();
    payload.append('resume', file);
    try {
      const { resume } = await api.upload('/profile/resume', payload);
      setResumeName(resume.resumeName);
      setResumeMessage('Resume updated.');
    } catch (err) {
      setResumeError(err.message);
    } finally {
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  if (!form && !apiError) return <div className="page-loader">Loading profile…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My profile</h1>
          <p className="muted">
            Recruiters search candidates by skill — keep this up to date to get discovered.
          </p>
        </div>
      </div>

      <Alert>{apiError}</Alert>

      {form && (
        <>
          <form onSubmit={handleSubmit} noValidate>
            <div className="card profile-section">
              <h2>Basics</h2>
              <div className="form-grid">
                <div className="full-width">
                  <FormField
                    label="Headline"
                    name="headline"
                    placeholder="e.g. Frontend developer with a passion for clean UIs"
                    value={form.headline}
                    onChange={handleChange}
                    error={errors.headline}
                  />
                </div>
                <div className="full-width">
                  <FormField
                    label="Skills (comma-separated)"
                    name="skills"
                    placeholder="e.g. react, javascript, css"
                    value={form.skills}
                    onChange={handleChange}
                    error={errors.skills}
                  />
                </div>
                <FormField
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  error={errors.phone}
                />
                <FormField
                  label="Current city"
                  name="currentCity"
                  value={form.currentCity}
                  onChange={handleChange}
                  error={errors.currentCity}
                />
                <FormField
                  label="Fresher or experienced"
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
                <FormField
                  label="Total experience (years)"
                  name="experienceYears"
                  type="number"
                  min="0"
                  max="50"
                  value={form.experienceYears}
                  onChange={handleChange}
                  error={errors.experienceYears}
                />
              </div>
            </div>

            <div className="card profile-section">
              <h2>Current role</h2>
              <div className="form-grid">
                <FormField
                  label="Current company"
                  name="currentCompany"
                  value={form.currentCompany}
                  onChange={handleChange}
                  error={errors.currentCompany}
                />
                <FormField
                  label="Current designation"
                  name="currentDesignation"
                  value={form.currentDesignation}
                  onChange={handleChange}
                  error={errors.currentDesignation}
                />
                <FormField
                  label="Current CTC (₹ LPA)"
                  name="currentCtc"
                  type="number"
                  min="0"
                  max="1000"
                  value={form.currentCtc}
                  onChange={handleChange}
                  error={errors.currentCtc}
                />
                <FormField
                  label="Notice period"
                  name="noticePeriod"
                  as="select"
                  value={form.noticePeriod}
                  onChange={handleChange}
                >
                  <option value="">Not specified</option>
                  {NOTICE_PERIOD_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </FormField>
                <FormField
                  label="Industry"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  error={errors.industry}
                />
                <FormField
                  label="Department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  error={errors.department}
                />
              </div>
            </div>

            <div className="card profile-section">
              <h2>Expectations</h2>
              <div className="form-grid">
                <FormField
                  label="Expected CTC (₹ LPA)"
                  name="expectedCtc"
                  type="number"
                  min="0"
                  max="1000"
                  value={form.expectedCtc}
                  onChange={handleChange}
                  error={errors.expectedCtc}
                />
              </div>
            </div>

            <div className="card-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              <Alert kind="success">{success}</Alert>
            </div>
          </form>

          <div className="card profile-section" style={{ marginTop: '1.25rem' }}>
            <h2>Resume</h2>
            <p className="muted">
              {resumeName ? `Current resume: ${resumeName}` : 'No resume uploaded yet.'}
            </p>
            <Alert kind="success">{resumeMessage}</Alert>
            <Alert>{resumeError}</Alert>
            <div className="card-actions">
              {resumeName && (
                <a className="btn btn-secondary btn-sm" href="/api/profile/resume">
                  Download current
                </a>
              )}
              <label className="btn btn-secondary btn-sm file-button">
                {resumeName ? 'Replace resume' : 'Upload resume'}
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  hidden
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
