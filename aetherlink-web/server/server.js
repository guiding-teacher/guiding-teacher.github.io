 
/**
 * AetherLink Web - Signaling Server (Upgraded Version)
 * ----------------------------------------------------
 * هذا الخادم لا يتعامل مع أي ملفات أو بيانات شخصية.
 * وظيفته الوحيدة هي العمل كوسيط أولي (Signaling) لمساعدة جهازين (Peers)
 * على العثور على بعضهما البعض لبدء اتصال WebRTC مباشر (Peer-to-Peer).
 *
 * --- التحسينات النهائية ---
 * - إصلاح منطق تبادل الإشارات (Signaling) ليكون أكثر قوة وموثوقية باستخدام البث داخل الغرف.
 * - إضافة معالجة قوية لانقطاع الاتصال.
 * - تحسين تسجيل الأحداث (Logging).
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
  
  // --- منطق انضمام للغرفة مُحسَّن ---
  socket.on('join-room', (roomId) => {
    const roomClients = io.sockets.adapter.rooms.get(roomId);
    const numClients = roomClients ? roomClients.size : 0;
    
    if (numClients >= 2) {
      socket.emit('room-full');
      console.log(`🚪 Room ${roomId} is full. User ${socket.id} was denied.`);
      return;
    }

    socket.join(roomId);
    console.log(`🔗 User ${socket.id} joined room: ${roomId}`);

    const updatedRoomClients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    
    if (updatedRoomClients.length === 2) {
        const initiatorId = updatedRoomClients.find(id => id !== socket.id);
        if (initiatorId) {
            io.to(initiatorId).emit('peer-joined');
            console.log(`🔔 Notified user ${initiatorId} that a peer has joined.`);
        }
        
        const peerId = socket.id;
        console.log(`🎉 Room ${roomId} is now ready for connection! Initiator: ${initiatorId}, Peer: ${peerId}`);
        
        io.to(initiatorId).emit('ready-to-connect', { initiator: true, peerId: peerId });
        io.to(peerId).emit('ready-to-connect', { initiator: false, peerId: initiatorId });
    }
  });
  
  // --- التعديل الرئيسي لحل مشكلة الاتصال العالق ---
  // الاستماع لحدث 'send-signal' واستخدام البث داخل الغرفة (Broadcasting)
  socket.on('send-signal', (payload) => {
    // هذا الأسلوب هو الأكثر قوة. بدلاً من الوثوق بالـ ID القادم من العميل،
    // نقوم ببث الإشارة إلى الطرف الآخر الموجود في نفس الغرفة.
    const targetRoom = Array.from(socket.rooms).find(room => room !== socket.id);
  
    if (targetRoom) {
      console.log(`📡 Broadcasting signal from ${socket.id} to room ${targetRoom}`);
      // .to(targetRoom).emit() يرسل للجميع في الغرفة ما عدا المرسل الحالي
      socket.to(targetRoom).emit('receive-signal', { signal: payload.signal, from: socket.id });
    } else {
      console.warn(`⚠️ User ${socket.id} tried to send a signal but was not in a valid room.`);
    }
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
