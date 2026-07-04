import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/AuthContext';

const STAT_LABELS = [
  { key: 'totalJobs', label: 'Total jobs posted' },
  { key: 'openJobs', label: 'Open positions' },
  { key: 'totalApplications', label: 'Applications received' },
  { key: 'pendingApplications', label: 'Awaiting review' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/stats')
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message));
  }, []);

  if (error)
    return (
      <div className="page">
        <Alert>{error}</Alert>
      </div>
    );
  if (!stats) return <div className="page-loader">Loading dashboard…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>HR Dashboard</h1>
          <p className="muted">Welcome back, {user.name}</p>
        </div>
        <Link className="btn btn-primary" to="/hr/jobs">
          Manage jobs
        </Link>
      </div>

      <div className="stat-grid">
        {STAT_LABELS.map(({ key, label }) => (
          <div key={key} className="card">
            <p className="stat-value">{stats[key]}</p>
            <p className="stat-label">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Getting started</h2>
        <p className="muted">
          Post new openings and review candidates from <Link to="/hr/jobs">Manage Jobs</Link>.
          Applications awaiting review are marked <strong>Submitted</strong> or{' '}
          <strong>Under review</strong>.
        </p>
      </div>
    </div>
  );
}
