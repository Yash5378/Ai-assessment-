const notificationsService = require('../services/notifications.service');
const asyncHandler = require('../utils/asyncHandler');

const listMine = asyncHandler(async (req, res) => {
  const result = await notificationsService.listMyNotifications(req.user.id);
  res.json(result);
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationsService.markAllRead(req.user.id);
  res.json({ message: 'All notifications marked as read' });
});

module.exports = { listMine, markAllRead };
