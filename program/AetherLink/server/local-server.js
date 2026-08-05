/**
 * AetherLink Local Signaling Server — يعمل بدون إنترنت
 * نفس منطق السيرفر السحابي، لكن على الشبكة المحلية
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket'],
  allowUpgrades: false,
  pingTimeout: 8000,
  pingInterval: 5000,
});

const PORT = process.env.PORT || 3000;

// ── اكتشاف IP المحلي ──
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
const LOCAL_URL = `http://${LOCAL_IP}:${PORT}`;

// ── نفس منطق الغرف تماماً ──
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`📡 متصل: ${socket.id.slice(0, 8)}`);

  socket.on('join-room', ({ roomId, deviceName }) => {
    if (!rooms.has(roomId)) rooms.set(roomId, []);
    const room = rooms.get(roomId);

    const dupIdx = room.findIndex(u => u.name === deviceName && u.id !== socket.id);
    if (dupIdx !== -1) {
      const oldEntry = room[dupIdx];
      room.splice(dupIdx, 1);
      socket.to(roomId).emit('peer-stale', { id: oldEntry.id });
      console.log(`♻️ استبدل socket قديم لـ ${deviceName}`);
    }

    const existingPeers = room.map(u => ({ id: u.id, name: u.name }));
    socket.emit('room-peers', existingPeers);

    room.push({ id: socket.id, name: deviceName });
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.deviceName = deviceName;

    socket.to(roomId).emit('new-peer', { id: socket.id, name: deviceName });

    console.log(`🟢 غرفة [${roomId.slice(0, 8)}…] → ${room.map(u => u.name).join(', ')}`);

    if (existingPeers.length === 0) socket.emit('waiting-for-peer');
  });

  socket.on('send-signal', ({ to, signal }) => {
    io.to(to).emit('receive-signal', { signal, from: socket.id });
  });

  socket.on('leave-room', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    const idx = room.findIndex(u => u.id === socket.id);
    if (idx !== -1) room.splice(idx, 1);
    socket.to(roomId).emit('peer-left', {
      id: socket.id,
      name: socket.data.deviceName || 'Unknown'
    });
    socket.leave(roomId);
    socket.data.roomId = null;
    if (room.length === 0) {
      rooms.delete(roomId);
      console.log(`🧹 حذفت غرفة فارغة`);
    }
  });

  socket.on('disconnecting', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    const idx = room.findIndex(u => u.id === socket.id);
    if (idx !== -1) room.splice(idx, 1);
    socket.to(roomId).emit('peer-left', {
      id: socket.id,
      name: socket.data.deviceName || 'Unknown'
    });
    if (room.length === 0) rooms.delete(roomId);
    if (discovery.has(socket.id)) {
      discovery.delete(socket.id);
      io.to('discovery').emit('discovery-update', [...discovery.values()]);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 انفصل: ${socket.id.slice(0, 8)}`);
  });
});

// ── Discovery محلي (بدون إنترنت) ──
const discovery = new Map();

io.on('connection', (socket) => {
  socket.on('discover-join', ({ deviceName }) => {
    if (deviceName) socket.data.deviceName = deviceName;
    discovery.set(socket.id, {
      socketId: socket.id,
      deviceName: socket.data.deviceName || 'Unknown',
      joinedAt: Date.now()
    });
    socket.join('discovery');
    io.to('discovery').emit('discovery-update', [...discovery.values()]);
  });

  socket.on('discover-leave', () => {
    if (discovery.has(socket.id)) {
      discovery.delete(socket.id);
      socket.leave('discovery');
      io.to('discovery').emit('discovery-update', [...discovery.values()]);
    }
  });

  socket.on('connect-invite', ({ to, roomId: inviteRoomId }) => {
    io.to(to).emit('connect-invite', {
      from: socket.id,
      fromName: socket.data.deviceName || 'Unknown',
      roomId: inviteRoomId
    });
  });

  socket.on('connect-invite-response', ({ to, accepted, roomId: inviteRoomId }) => {
    io.to(to).emit('connect-invite-response', { accepted, roomId: inviteRoomId });
  });
});

// ── تشغيل الخادم ──
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  🚀 AetherLink Local Signaling Server      ║`);
  console.log(`╠════════════════════════════════════════════╣`);
  console.log(`║  📡 يعمل على: ${LOCAL_URL.padEnd(31)}║`);
  console.log(`║  🌐 متاح لكل الأجهزة على نفس الشبكة        ║`);
  console.log(`╚════════════════════════════════════════════╝\n`);
  console.log(`💡 افتح المتصفح على هذا الجهاز:`);
  console.log(`   ${LOCAL_URL}\n`);
  console.log(`📱 الأجهزة الأخرى تفتح نفس الرابط أو تدخل IP:`);
  console.log(`   ${LOCAL_IP}:${PORT}\n`);
});
