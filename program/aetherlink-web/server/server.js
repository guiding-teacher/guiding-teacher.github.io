/**
 * AetherLink Web - Signaling Server (Fixed Version)
 * ----------------------------------------------------
 * إصلاح كامل لمشكلة الاتصال بين الأقران وتحسين الأداء
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
    console.log(`🔗 User ${socket.id} trying to join room: ${roomId}`);
    
    // التحقق من وجود الغرفة
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: [] });
    }
    
    const room = rooms.get(roomId);
    
    // التحقق إذا كانت الغرفة ممتلئة
    if (room.users.length >= 2) {
      socket.emit('room-full');
      console.log(`🚪 Room ${roomId} is full. User ${socket.id} was denied.`);
      return;
    }
    
    // الانضمام إلى الغرفة
    socket.join(roomId);
    room.users.push(socket.id);
    
    console.log(`✅ User ${socket.id} joined room: ${roomId}`);
    console.log(`👥 Room ${roomId} now has ${room.users.length} users`);
    
    // إعلام المستخدم بالحالة
    if (room.users.length === 1) {
      socket.emit('waiting-for-peer');
      console.log(`⏳ User ${socket.id} is waiting for peer in room ${roomId}`);
    } else if (room.users.length === 2) {
      // إعلام كلا المستخدمين بالاستعداد للاتصال
      const [user1, user2] = room.users;
      
      io.to(user1).emit('ready-to-connect', { 
        initiator: true, 
        peerId: user2 
      });
      
      io.to(user2).emit('ready-to-connect', { 
        initiator: false, 
        peerId: user1 
      });
      
      console.log(`🎉 Room ${roomId} ready for connection between ${user1} and ${user2}`);
    }
  });
  
  // تبادل إشارات WebRTC
  socket.on('send-signal', (payload) => {
    // *** التحسين الرئيسي هنا ***
    // نستخدم socket.to() لإرسال الإشارة إلى كل من في الغرفة باستثناء المرسل نفسه
    // هذا يمنع حدوث مشاكل في الاتصال ويجعله أكثر استقراراً
    console.log(`📡 Signal from ${socket.id} being sent to room ${payload.to}`);
    socket.to(payload.to).emit('receive-signal', { 
      signal: payload.signal, 
      from: socket.id 
    });
  });
  
  // معالجة انقطاع الاتصال
  socket.on('disconnecting', (reason) => {
    console.log(`❌ User ${socket.id} disconnecting: ${reason}`);
    
    // إزالة المستخدم من جميع الغرف
    for (const [roomId, room] of rooms.entries()) {
      const userIndex = room.users.indexOf(socket.id);
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        console.log(`🗑️ Removed user ${socket.id} from room ${roomId}`);
        
        // إعلام المستخدم الآخر بانقطاع الاتصال
        // نستخدم socket.to() هنا أيضاً لضمان إرسال الرسالة للطرف الآخر فقط
        socket.to(roomId).emit('peer-disconnected');
        console.log(`👋 Notified peer in room ${roomId} about disconnection`);
        
        // حذف الغرفة إذا أصبحت فارغة
        if (room.users.length === 0) {
          rooms.delete(roomId);
          console.log(`🧹 Deleted empty room ${roomId}`);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});