const Notification = require('../models/Notification');
const mockDb = require('../config/mockDb');

exports.getNotifications = async (req, res) => {
  try {
    let notifications = [];
    if (mockDb.isMockActive()) {
      const all = await mockDb.find('notifications', { user: req.user._id.toString() });
      const allStr = await mockDb.find('notifications', { user: req.user._id });
      // Union and sort
      notifications = [...all, ...allStr].filter((item, index, self) => 
        self.findIndex(t => t._id === item._id) === index
      );
      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    }
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error loading notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    if (mockDb.isMockActive()) {
      if (id === 'all') {
        const notifs = await mockDb.find('notifications', { user: req.user._id.toString() });
        for (let n of notifs) {
          await mockDb.findByIdAndUpdate('notifications', n._id, { isRead: true });
        }
      } else {
        await mockDb.findByIdAndUpdate('notifications', id, { isRead: true });
      }
    } else {
      if (id === 'all') {
        await Notification.updateMany({ user: req.user._id }, { isRead: true });
      } else {
        await Notification.findByIdAndUpdate(id, { isRead: true });
      }
    }
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating notifications' });
  }
};
