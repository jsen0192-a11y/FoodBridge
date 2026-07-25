const mockDb = require('./mockDb');
const Notification = require('../models/Notification');

let io = null;

// Memory registry storing online volunteer locations in real-time
// Key: volunteerUserId -> Value: { lat, lng, timestamp }
const volunteerLocations = new Map();

module.exports = {
  init(ioInstance) {
    io = ioInstance;
    console.log("⚡ Socket.io Helper Initialized");
  },
  getIo() {
    return io;
  },

  registerSocketEvents(socket) {
    // 1. Join room
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId.toString());
        console.log(`👤 User joined room: ${userId}`);
      }
    });

    // 2. Handle Live Volunteer Coordinate Broadcasts
    socket.on('update_location', (data) => {
      const { volunteerId, lat, lng } = data;
      if (volunteerId && lat && lng) {
        volunteerLocations.set(volunteerId.toString(), {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          timestamp: Date.now()
        });
        
        // Broadcast location change to any clients (like NGO dashboards)
        if (io) {
          io.emit('volunteer_location_changed', { volunteerId, lat, lng });
        }
      }
    });

    // 3. Handle Live Chat Room Messages
    // Connects NGO, Donor, and Volunteer for coordination
    socket.on('join_chat_room', (roomId) => {
      if (roomId) {
        socket.join(roomId);
        console.log(`💬 User joined chat room: ${roomId}`);
      }
    });

    socket.on('send_chat_message', (data) => {
      const { roomId, senderId, senderName, text } = data;
      if (roomId && text) {
        const payload = {
          senderId,
          senderName,
          text,
          timestamp: new Date().toISOString()
        };
        // Broadcast message to everyone in the room
        if (io) {
          io.to(roomId).emit('chat_message_received', payload);
        }
      }
    });
  },

  async sendNotification(userId, message, type = 'info') {
    console.log(`[Notification to ${userId}]: ${message} (${type})`);
    
    let savedNotif;
    if (mockDb.isMockActive()) {
      savedNotif = await mockDb.create('notifications', {
        user: userId,
        message,
        type,
        isRead: false
      });
    } else {
      try {
        savedNotif = await Notification.create({
          user: userId,
          message,
          type,
          isRead: false
        });
      } catch (err) {
        console.error("Failed to save mongoose notification:", err.message);
      }
    }

    if (io) {
      io.to(userId.toString()).emit('notification', savedNotif);
      io.emit('global_notification', savedNotif);
    }
    
    return savedNotif;
  },

  getVolunteerLocations() {
    return volunteerLocations;
  },

  getVolunteerLocation(id) {
    return volunteerLocations.get(id.toString()) || null;
  }
};
