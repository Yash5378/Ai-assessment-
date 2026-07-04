import { useState } from 'react';
import FormField from './FormField';
import Alert from './Alert';
import {
  validateLength,
  validateNumber,
  validateSkills,
  parseSkills,
  collectErrors,
} from '../utils/validation';

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const EMPTY_FORM = {
  title: '',
  company: '',
  location: '',
  employmentType: 'FULL_TIME',
  skills: '',
  experienceMin: '0',
  experienceMax: '',
  salaryMin: '',
  salaryMax: '',
  description: '',
};

const toNumberOrUndefined = (value) => (String(value).trim() === '' ? undefined : Number(value));

/**
 * Shared create/edit job form for HR. Calls onSubmit(values) and lets the
 * parent own the API call; API errors come back via the thrown error.
 */
export default function JobForm({ initialValues, onSubmit, onCancel, submitLabel = 'Save job' }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialValues });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError('');

    const fieldErrors = collectErrors({
      title: () => validateLength(form.title, 'Title', 3, 150),
      company: () => validateLength(form.company, 'Company', 2, 100),
      location: () => validateLength(form.location, 'Location', 2, 100),
      skills: () => validateSkills(form.skills),
      experienceMin: () => validateNumber(form.experienceMin, 'Min experience', { required: true }),
      experienceMax: () => validateNumber(form.experienceMax, 'Max experience'),
      salaryMin: () => validateNumber(form.salaryMin, 'Min salary', { max: 1000 }),
      salaryMax: () => validateNumber(form.salaryMax, 'Max salary', { max: 1000 }),
      description: () => validateLength(form.description, 'Description', 10, 5000),
    });

    const expMin = toNumberOrUndefined(form.experienceMin);
    const expMax = toNumberOrUndefined(form.experienceMax);
    const salMin = toNumberOrUndefined(form.salaryMin);
    const salMax = toNumberOrUndefined(form.salaryMax);
    if (
      !fieldErrors.experienceMax &&
      expMin !== undefined &&
      expMax !== undefined &&
      expMin > expMax
    ) {
      fieldErrors.experienceMax = 'Max experience cannot be less than min';
    }
    if (!fieldErrors.salaryMax && salMin !== undefined && salMax !== undefined && salMin > salMax) {
      fieldErrors.salaryMax = 'Max salary cannot be less than min';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim(),
        employmentType: form.employmentType,
        skills: parseSkills(form.skills),
        experienceMin: expMin ?? 0,
        experienceMax: expMax ?? null,
        salaryMin: salMin ?? null,
        salaryMax: salMax ?? null,
        description: form.description.trim(),
      });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Alert>{apiError}</Alert>

      <div className="form-grid">
        <FormField
          label="Job title"
          name="title"
          value={form.title}
          onChange={handleChange}
          error={errors.title}
        />
        <FormField
          label="Company"
          name="company"
          value={form.company}
          onChange={handleChange}
          error={errors.company}
        />
        <FormField
          label="Location"
          name="location"
          value={form.location}
          onChange={handleChange}
          error={errors.location}
        />
        <FormField
          label="Employment type"
          name="employmentType"
          as="select"
          value={form.employmentType}
          onChange={handleChange}
        >
          {EMPLOYMENT_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormField>
        <div className="full-width">
          <FormField
            label="Required skills (comma-separated)"
            name="skills"
            placeholder="e.g. react, node.js, postgresql"
            value={form.skills}
            onChange={handleChange}
            error={errors.skills}
          />
        </div>
        <FormField
          label="Min experience (years)"
          name="experienceMin"
          type="number"
          min="0"
          max="50"
          value={form.experienceMin}
          onChange={handleChange}
          error={errors.experienceMin}
        />
        <FormField
          label="Max experience (years, optional)"
          name="experienceMax"
          type="number"
          min="0"
          max="50"
          value={form.experienceMax}
          onChange={handleChange}
          error={errors.experienceMax}
        />
        <FormField
          label="Min salary (₹ LPA, optional)"
          name="salaryMin"
          type="number"
          min="0"
          max="1000"
          value={form.salaryMin}
          onChange={handleChange}
          error={errors.salaryMin}
        />
        <FormField
          label="Max salary (₹ LPA, optional)"
          name="salaryMax"
          type="number"
          min="0"
          max="1000"
          value={form.salaryMax}
          onChange={handleChange}
          error={errors.salaryMax}
        />
        <div className="full-width">
          <FormField
            label="Description"
            name="description"
            as="textarea"
            rows={6}
            value={form.description}
            onChange={handleChange}
            error={errors.description}
          />
        </div>
      </div>

      <div className="card-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
