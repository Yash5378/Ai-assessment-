import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CANDIDATE_LINKS = [
  { to: '/jobs', label: 'Browse Jobs' },
  { to: '/my-applications', label: 'My Applications' },
  { to: '/profile', label: 'My Profile' },
];

const HR_LINKS = [
  { to: '/hr', label: 'Dashboard', end: true },
  { to: '/hr/jobs', label: 'Manage Jobs' },
  { to: '/hr/candidates', label: 'Find Candidates' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const links = user.role === 'HR' ? HR_LINKS : CANDIDATE_LINKS;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">Recruitment Portal</span>
        <nav className="navbar-links">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className="navbar-link">
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="navbar-user">
          <span className="navbar-username">
            {user.name}{' '}
            <span className={`role-chip role-${user.role.toLowerCase()}`}>{user.role}</span>
          </span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
