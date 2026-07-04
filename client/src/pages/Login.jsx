import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validateRequired, collectErrors } from '../utils/validation';
import FormField from '../components/FormField';
import Alert from '../components/Alert';
import RoleTabs from '../components/RoleTabs';

const ROLE_LABELS = { HR: 'HR / Recruiter', CANDIDATE: 'Candidate' };

export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('CANDIDATE');
  const [form, setForm] = useState({ email: '', password: '' });
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
      email: () => validateEmail(form.email),
      password: () => validateRequired(form.password, 'Password'),
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(form.email.trim(), form.password);

      // The account's actual role is authoritative. If it doesn't match the
      // selected tab, tell the user which kind of account this is.
      if (user.role !== role) {
        await logout();
        setApiError(
          `This email is registered as a ${ROLE_LABELS[user.role]} account. ` +
            `Please switch to the ${ROLE_LABELS[user.role]} tab to log in.`
        );
        return;
      }

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
        <h1>Welcome back</h1>
        <p className="muted">Log in to the Recruitment Portal</p>

        <RoleTabs value={role} onChange={setRole} />

        <Alert>{apiError}</Alert>

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
          autoComplete="current-password"
        />

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Logging in…' : `Log in as ${ROLE_LABELS[role]}`}
        </button>

        <p className="muted auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
