import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateName, validateEmail, validatePassword, collectErrors } from '../utils/validation';
import FormField from '../components/FormField';
import Alert from '../components/Alert';
import RoleTabs from '../components/RoleTabs';

const ROLE_COPY = {
  CANDIDATE: 'Find your next role — browse openings and apply in minutes',
  HR: 'Post jobs and search candidates by skill to build your team',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('CANDIDATE');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      name: () => validateName(form.name),
      email: () => validateEmail(form.email),
      password: () => validatePassword(form.password),
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password, role);
      navigate(user.role === 'HR' ? '/hr' : '/jobs');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create account</h1>

        <RoleTabs value={role} onChange={setRole} />
        <p className="muted small">{ROLE_COPY[role]}</p>

        <Alert>{apiError}</Alert>

        <FormField
          label={role === 'HR' ? 'Full name / recruiter name' : 'Full name'}
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          autoComplete="name"
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="new-password"
        />
        <p className="muted small">
          At least 8 characters with an uppercase letter, a lowercase letter and a number.
        </p>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting
            ? 'Creating account…'
            : `Sign up as ${role === 'HR' ? 'HR / Recruiter' : 'Candidate'}`}
        </button>

        <p className="muted auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
