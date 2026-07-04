import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { formatDate } from '../utils/format';

const POLL_INTERVAL_MS = 30_000;

/**
 * Navbar bell: shows an unread badge, polls the feed, and marks everything
 * read when the dropdown is opened.
 */
export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Non-critical UI — a failed poll just tries again next interval.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Close when clicking anywhere outside the dropdown.
  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const toggleOpen = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      try {
        await api.post('/notifications/read');
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch {
        // Badge will correct itself on the next poll.
      }
    }
  };

  return (
    <div className="notif" ref={containerRef}>
      <button
        type="button"
        className="notif-button"
        onClick={toggleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu">
          <p className="notif-title">Notifications</p>
          {notifications.length === 0 ? (
            <p className="muted small notif-empty">Nothing here yet.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.isRead ? 'notif-item' : 'notif-item unread'}
                >
                  <p>{notification.message}</p>
                  <span className="muted small">{formatDate(notification.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
