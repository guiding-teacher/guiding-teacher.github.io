/**
 * AetherLink Web - Signaling Server (Upgraded Version)
 * ----------------------------------------------------
 * هذا الخادم لا يتعامل مع أي ملفات أو بيانات شخصية.
 * وظيفته الوحيدة هي العمل كوسيط أولي (Signaling) لمساعدة جهازين (Peers)
 * على العثور على بعضهما البعض لبدء اتصال WebRTC مباشر (Peer-to-Peer).
 *
 * --- التحسينات ---
 * - إضافة معالجة قوية لانقطاع الاتصال: عندما يغادر مستخدم، يتم إعلام الطرف الآخر فوراً.
 * - تحسين تسجيل الأحداث (Logging) لمتابعة أفضل.
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
    origin: "*", // هام: في بيئة الإنتاج، يجب تقييده إلى نطاق موقعك فقط.
    methods: ["GET", "POST"]
  }
});

// 4. تحديد المنفذ (Port)
const PORT = process.env.PORT || 3000;

// 5. منطق التعامل مع اتصالات المستخدمين
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  // الاستماع لحدث 'join-room'
  socket.on('join-room', (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId) || new Set();
  const numClients = room.size;
  
  if (numClients >= 2) {
    socket.emit('room-full');
    console.log(`🚪 Room ${roomId} is full. User ${socket.id} was denied.`);
    return;
  }
  
  socket.join(roomId);
  console.log(`🔗 User ${socket.id} joined room: ${roomId}`);
  
  // الحل: تحقق من عدد العملاء بعد الانضمام
  const updatedRoom = io.sockets.adapter.rooms.get(roomId);
  if (updatedRoom && updatedRoom.size === 2) {
    console.log(`🎉 Room ${roomId} is now ready for connection!`);
    const clients = Array.from(updatedRoom);
    
    // تأكد من أن المبتدئ هو أول من انضم
    const [initiatorId, peerId] = clients;
    
    io.to(initiatorId).emit('ready-to-connect', { initiator: true, peerId: peerId });
    io.to(peerId).emit('ready-to-connect', { initiator: false, peerId: initiatorId });
  }
});
  
  // الاستماع لحدث 'send-signal' لتبادل بيانات WebRTC
  socket.on('send-signal', (payload) => {
    console.log(`📡 Forwarding signal from ${socket.id} to ${payload.to}`);
    io.to(payload.to).emit('receive-signal', { signal: payload.signal, from: socket.id });
  });
  
  // --- التحسين الرئيسي: معالجة انقطاع الاتصال ---
  // نستخدم 'disconnecting' لأنه يعطينا وصولاً للغرف التي كان فيها المستخدم قبل مغادرته
  socket.on('disconnecting', () => {
    const rooms = socket.rooms;
    rooms.forEach(roomId => {
      // نتأكد من أننا لا نرسل للمستخدم نفسه الذي يغادر
      if (roomId !== socket.id) {
        // نرسل حدثًا إلى كل شخص آخر في الغرفة
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
