/**
 * AetherLink Web - Signaling Server
 */
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// تخزين معلومات الغرف
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  socket.on('join-room', (roomId) => {
    console.log(`🔗 User ${socket.id} attempting to join room: ${roomId}`);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: [] });
      console.log(`🏠 Created new room: ${roomId}`);
    }
    
    const room = rooms.get(roomId);
    
    if (room.users.length >= 2) {
      socket.emit('room-full');
      console.log(`🚪 Room ${roomId} is full. User ${socket.id} was denied.`);
      return;
    }
    
    // إضافة المستخدم للغرفة
    room.users.push(socket.id);
    socket.join(roomId);
    console.log(`✅ User ${socket.id} joined room: ${roomId}`);
    console.log(`👥 Room ${roomId} now has ${room.users.length} users`);
    
    // إعلام المالك بأن هناك شخصًا ينضم
    if (room.users.length === 1) {
      socket.emit('waiting-for-peer');
      console.log(`⏳ Room ${roomId} waiting for peer...`);
    }
    
    // عندما ينضم شخصان، نبدأ الاتصال
    if (room.users.length === 2) {
      console.log(`🎉 Room ${roomId} is now ready for connection!`);
      
      // إعلام كلا المستخدمين بالاستعداد للاتصال
      io.to(room.users[0]).emit('ready-to-connect', { 
        initiator: true, 
        peerId: room.users[1] 
      });
      
      io.to(room.users[1]).emit('ready-to-connect', { 
        initiator: false, 
        peerId: room.users[0] 
      });
      
      console.log(`📢 Notified both users in room ${roomId} to connect`);
    }
  });
  
  socket.on('send-signal', (payload) => {
    console.log(`📡 Forwarding signal from ${socket.id} to ${payload.to}`);
    io.to(payload.to).emit('receive-signal', { 
      signal: payload.signal, 
      from: socket.id 
    });
  });
  
  socket.on('disconnecting', () => {
    console.log(`👋 User ${socket.id} is disconnecting...`);
    
    // تنظيف الغرف عند مغادرة المستخدم
    for (const [roomId, room] of rooms.entries()) {
      const userIndex = room.users.indexOf(socket.id);
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        
        // إعلام الأعضاء الآخرين في الغرفة
        socket.to(roomId).emit('peer-disconnected');
        console.log(`❌ User ${socket.id} disconnected from room ${roomId}`);
        
        // إذا أصبحت الغرفة فارغة، نزيلها
        if (room.users.length === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        } else {
          console.log(`👥 Room ${roomId} now has ${room.users.length} users`);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User session ended: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Signaling server is live and listening on port ${PORT}`);
});
