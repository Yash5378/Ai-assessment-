import { useState } from 'react';
import FormField from './FormField';
import Alert from './Alert';
import { validateLength, collectErrors } from '../utils/validation';

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  location: '',
  employmentType: 'FULL_TIME',
  salaryRange: '',
};

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
      description: () => validateLength(form.description, 'Description', 10, 5000),
      location: () => validateLength(form.location, 'Location', 2, 100),
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        employmentType: form.employmentType,
        salaryRange: form.salaryRange.trim(),
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
        <div className="full-width">
          <FormField
            label="Job title"
            name="title"
            value={form.title}
            onChange={handleChange}
            error={errors.title}
          />
        </div>
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
            label="Salary range (optional)"
            name="salaryRange"
            placeholder="e.g. ₹20L – ₹32L per year"
            value={form.salaryRange}
            onChange={handleChange}
          />
        </div>
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
