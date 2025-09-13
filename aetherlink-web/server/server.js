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
   // الاستماع لحدث 'join-room' (النسخة المُصححة والأكثر موثوقية)
socket.on('join-room', (roomId) => {
    // 1. تحقق من عدد العملاء الحاليين في الغرفة قبل الانضمام
    const currentRoom = io.sockets.adapter.rooms.get(roomId);
    const numClients = currentRoom ? currentRoom.size : 0;

    if (numClients >= 2) {
        socket.emit('room-full');
        console.log(`🚪 Room ${roomId} is full. User ${socket.id} was denied.`);
        return;
    }
    
    // 2. انضم إلى الغرفة
    socket.join(roomId);
    console.log(`🔗 User ${socket.id} joined room: ${roomId}`);

    // 3. بعد الانضمام، إذا أصبح عدد العملاء 2، ابدأ الاتصال
    if (numClients === 1) { // كان هناك شخص واحد، والآن انضممت أنت، فأصبح المجموع 2
        console.log(`🎉 Room ${roomId} is now ready for connection!`);

        // احصل على معرف (ID) العميل الآخر الموجود بالفعل في الغرفة
        const otherClient = Array.from(currentRoom)[0];

        // أرسل للعميل الأول (البادئ) ليقوم بالاتصال بك
        io.to(otherClient).emit('ready-to-connect', { 
            initiator: true, 
            peerId: socket.id // أنت (المنضم الجديد) هو الطرف الآخر (peer)
        });

        // أرسل لنفسك (المنضم الجديد) لكي تتصل بالعميل الأول
        socket.emit('ready-to-connect', { 
            initiator: false, 
            peerId: otherClient // العميل الأول هو الطرف الآخر (peer)
        });
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
