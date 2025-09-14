/**
 * AetherLink Web - Signaling Server (Upgraded Version)
 * ----------------------------------------------------
 * هذا الخادم لا يتعامل مع أي ملفات أو بيانات شخصية.
 * وظيفته الوحيدة هي العمل كوسيط أولي (Signaling) لمساعدة جهازين (Peers)
 * على العثور على بعضهما البعض لبدء اتصال WebRTC مباشر (Peer-to-Peer).
 */

// 1. استيراد المكتبات الأساسية
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

// 2. إعداد الخادم
const app = express();
const server = http.createServer(app);

// 3. إعداد Socket.IO مع سياسة CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 4. تحديد المنفذ (Port)
const PORT = process.env.PORT || 3000;

// 5. منطق التعامل مع اتصالات المستخدمين
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  // --- منطق انضمام للغرفة مُحسَّن ---
  socket.on('join-room', (roomId) => {
    // 1. الحصول على معلومات الغرفة قبل الانضمام
    const roomClients = io.sockets.adapter.rooms.get(roomId);
    const numClients = roomClients ? roomClients.size : 0;
    
    if (numClients >= 2) {
      socket.emit('room-full');
      console.log(`🚪 Room ${roomId} is full. User ${socket.id} was denied.`);
      return;
    }

    // 2. الانضمام للغرفة
    socket.join(roomId);
    console.log(`🔗 User ${socket.id} joined room: ${roomId}`);

    // 3. الحصول على معلومات الغرفة بعد الانضمام
    const updatedRoomClients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    
    // إعلام الطرف الأول (المُنشئ) بأن الطرف الثاني قد انضم
    if (updatedRoomClients.length === 1) {
      // المستخدم الأول فقط في الغرفة
      socket.emit('waiting-for-peer');
      console.log(`⏳ User ${socket.id} is waiting for a peer in room ${roomId}`);
    } else if (updatedRoomClients.length === 2) {
      // إعلام الطرف الأول (المُنشئ) بأن الطرف الثاني قد انضم
      const initiatorId = updatedRoomClients.find(id => id !== socket.id);
      if (initiatorId) {
        io.to(initiatorId).emit('peer-joined');
        console.log(`🔔 Notified user ${initiatorId} that a peer has joined.`);
      }
      
      // الآن بعد أن انضم كلاهما، نبدأ عملية الاتصال
      const peerId = socket.id;
      console.log(`🎉 Room ${roomId} is now ready for connection! Initiator: ${initiatorId}, Peer: ${peerId}`);
      
      io.to(initiatorId).emit('ready-to-connect', { initiator: true, peerId: peerId });
      io.to(peerId).emit('ready-to-connect', { initiator: false, peerId: initiatorId });
    }
  });
  
  // الاستماع لحدث 'send-signal' لتبادل بيانات WebRTC
  socket.on('send-signal', (payload) => {
    console.log(`📡 Forwarding signal from ${socket.id} to ${payload.to}`);
    io.to(payload.to).emit('receive-signal', { signal: payload.signal, from: socket.id });
  });
  
  // معالجة انقطاع الاتصال
  socket.on('disconnecting', () => {
    const rooms = socket.rooms;
    rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('peer-disconnected');
        console.log(`👋 User ${socket.id} disconnected. Notifying room ${roomId}.`);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User session ended: ${socket.id}`);
  });
});

// 6. تشغيل الخادم
server.listen(PORT, () => {
  console.log(`🚀 Signaling server is live and listening on port ${PORT}`);
});
