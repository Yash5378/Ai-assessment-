import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import FormField from '../../components/FormField';
import {
  validateLength,
  validateNumber,
  validateSkills,
  parseSkills,
  collectErrors,
} from '../../utils/validation';

const toNumberOrNull = (value) => (String(value).trim() === '' ? null : Number(value));

export default function Profile() {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/profile/me')
      .then(({ profile }) =>
        setForm({
          headline: profile.headline ?? '',
          skills: (profile.skills ?? []).join(', '),
          experienceYears: String(profile.experienceYears ?? 0),
          location: profile.location ?? '',
          expectedSalary: profile.expectedSalary == null ? '' : String(profile.expectedSalary),
        })
      )
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
      headline: () => (form.headline.trim() ? validateLength(form.headline, 'Headline', 1, 150) : ''),
      skills: () => validateSkills(form.skills, { required: false }),
      experienceYears: () => validateNumber(form.experienceYears, 'Experience', { required: true }),
      location: () => (form.location.trim() ? validateLength(form.location, 'Location', 1, 100) : ''),
      expectedSalary: () => validateNumber(form.expectedSalary, 'Expected salary', { max: 1000 }),
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
        location: form.location.trim(),
        expectedSalary: toNumberOrNull(form.expectedSalary),
      });
      setSuccess('Profile saved. Recruiters can now find you by your skills.');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
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

      <div className="card">
        <Alert>{apiError}</Alert>
        <Alert kind="success">{success}</Alert>

        {form && (
          <form onSubmit={handleSubmit} noValidate>
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
                label="Experience (years)"
                name="experienceYears"
                type="number"
                min="0"
                max="50"
                value={form.experienceYears}
                onChange={handleChange}
                error={errors.experienceYears}
              />
              <FormField
                label="Expected salary (₹ LPA, optional)"
                name="expectedSalary"
                type="number"
                min="0"
                max="1000"
                value={form.expectedSalary}
                onChange={handleChange}
                error={errors.expectedSalary}
              />
              <div className="full-width">
                <FormField
                  label="Location"
                  name="location"
                  placeholder="e.g. Bengaluru, India"
                  value={form.location}
                  onChange={handleChange}
                  error={errors.location}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
