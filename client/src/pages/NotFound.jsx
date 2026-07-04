import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page">
      <div className="empty-state">
        <p className="empty-title">Page not found</p>
        <p className="empty-hint">
          The page you are looking for does not exist. <Link to="/">Go home</Link>
        </p>
      </div>
    </div>
  );
}
