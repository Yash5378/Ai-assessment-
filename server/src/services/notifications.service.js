const db = require('../db/pool');

const NOTIFICATION_FIELDS = 'id, message, is_read AS "isRead", created_at AS "createdAt"';

/**
 * Fire-and-forget insert used by other services when something the user
 * cares about happens (e.g. an application status change).
 */
async function createNotification(userId, message) {
  await db.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [userId, message]);
}

/**
 * Latest notifications for the bell dropdown plus the unread badge count.
 */
async function listMyNotifications(userId) {
  const [items, unread] = await Promise.all([
    db.query(
      `SELECT ${NOTIFICATION_FIELDS} FROM notifications
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    ),
    db.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND NOT is_read',
      [userId]
    ),
  ]);
  return { notifications: items.rows, unreadCount: unread.rows[0].count };
}

async function markAllRead(userId) {
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND NOT is_read', [
    userId,
  ]);
}

module.exports = { createNotification, listMyNotifications, markAllRead };
