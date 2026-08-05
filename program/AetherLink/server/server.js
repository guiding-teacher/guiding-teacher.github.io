/**
 * AetherLink Web - Signaling Server (Large-File Edition)
 * v5: instant WebSocket · fast ICE · faster peer detection
 *     + serves the whole web app AND the client-side libraries locally,
 *       so the entire app (signaling + UI + WebRTC libs) runs from this
 *       one process with ZERO internet access required — perfect for a
 *       phone hotspot / LAN with no real internet connectivity.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────
//  Serve the web app itself (index.html, app.js, style.css, images/)
//  so any device on the same network can just open this server's URL
//  in a browser — no separate web host needed, no internet needed.
// ─────────────────────────────────────────
const APP_ROOT = path.join(__dirname, '..');
app.use(express.static(APP_ROOT));

// ─────────────────────────────────────────
//  Serve the browser libraries LOCALLY instead of from a CDN
//  (socket.io.min.js / simplepeer.min.js / qrcode.min.js).
//  Without this, the app would still need real internet to fetch these
//  from cdn.socket.io / cdn.jsdelivr.net even though signaling itself
//  is fully local — this closes that gap.
//  These come straight from the already-installed npm packages, so no
//  extra download step is needed beyond the normal `npm install`.
// ─────────────────────────────────────────
function serveVendorFile(route, resolveTarget) {
  app.get(route, (req, res) => {
    try {
      res.sendFile(require.resolve(resolveTarget));
    } catch (err) {
      console.error(`⚠️  تعذّر تقديم ${route} — تأكد من تشغيل npm install:`, err.message);
      res.status(404).send(`// missing dependency for ${resolveTarget}, run: npm install`);
    }
  });
}
serveVendorFile('/vendor/socket.io.min.js', 'socket.io/client-dist/socket.io.min.js');
serveVendorFile('/vendor/simplepeer.min.js', 'simple-peer/simplepeer.min.js');
serveVendorFile('/vendor/qrcode.min.js', 'qrcode-generator/qrcode.js');

// ✅ FIX 1: Force WebSocket-only — يمنع تأخير HTTP polling → WebSocket upgrade
// ✅ FIX 2: allowUpgrades: false — لا داعي للـ upgrade لأننا على WebSocket مباشرةً
// ✅ FIX 3: pingTimeout أقل — كشف الانقطاع بسرعة بدلاً من 30 ثانية
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e8,
  pingTimeout: 8000,        // ✅ كان 30000 — الآن يكتشف الانقطاع في 8 ثوانٍ
  pingInterval: 5000,       // ✅ كان 10000 — keepalive أسرع
  transports: ['websocket'], // ✅ WebSocket فوراً، بدون polling
  allowUpgrades: false,      // ✅ لا upgrade = لا تأخير
  perMessageDeflate: false,
});

const PORT = process.env.PORT || 3000;

// rooms: Map<roomId, Array<{id, name}>>
const rooms = new Map();

// discovery: Map<socketId, {socketId, deviceName, joinedAt}>
const discovery = new Map();

io.on('connection', (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, deviceName }) => {
    if (!rooms.has(roomId)) rooms.set(roomId, []);
    const room = rooms.get(roomId);

    // منع التكرار: إذا كان نفس الجهاز (نفس الاسم) موجوداً بـ socket قديم، أزله بصمت
    const dupIdx = room.findIndex(u => u.name === deviceName && u.id !== socket.id);
    if (dupIdx !== -1) {
      const oldEntry = room[dupIdx];
      room.splice(dupIdx, 1);
      socket.to(roomId).emit('peer-stale', { id: oldEntry.id });
      console.log(`♻️  استبدل socket قديم لـ ${deviceName} في الغرفة`);
    }

    // Send existing peers to the newcomer
    const existingPeers = room.map(u => ({ id: u.id, name: u.name }));
    socket.emit('room-peers', existingPeers);

    // Add to room
    room.push({ id: socket.id, name: deviceName });
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.deviceName = deviceName;

    // Notify all existing users about the new peer
    socket.to(roomId).emit('new-peer', { id: socket.id, name: deviceName });

    const names = room.map(u => u.name).join(', ');
    console.log(`Room [${roomId.slice(0,8)}…] → ${names}`);

    if (existingPeers.length === 0) {
      socket.emit('waiting-for-peer');
    }
  });

  // ── Leave room explicitly (called on endSession) ────────
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
      console.log(`🧹 Deleted empty room ${roomId.slice(0,8)}… (leave-room)`);
    }
  });

  // Signal relay: target is a specific socket id
  socket.on('send-signal', ({ to, signal }) => {
    io.to(to).emit('receive-signal', { signal, from: socket.id });
  });

  // Reconnect helpers
  socket.on('reconnect-request', ({ to, fromName }) => {
    io.to(to).emit('reconnect-request', { from: socket.id, fromName });
  });

  socket.on('reconnect-accept', ({ to, newRoomId }) => {
    io.to(to).emit('reconnect-accepted', { newRoomId });
  });

  // ── Local Discovery ─────────────────────
  socket.on('discover-join', ({ deviceName }) => {
    if (deviceName) socket.data.deviceName = deviceName;
    discovery.set(socket.id, {
      socketId: socket.id,
      deviceName: socket.data.deviceName || 'Unknown',
      joinedAt: Date.now()
    });
    socket.join('discovery');
    io.to('discovery').emit('discovery-update', [...discovery.values()]);
    console.log(`📶 Discovery: ${socket.data.deviceName} joined (${discovery.size} total)`);
  });

  socket.on('discover-leave', () => {
    if (discovery.has(socket.id)) {
      discovery.delete(socket.id);
      socket.leave('discovery');
      io.to('discovery').emit('discovery-update', [...discovery.values()]);
    }
  });

  // Relay connection invitations between discovered devices
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
    if (room.length === 0) {
      rooms.delete(roomId);
      console.log(`🧹 Deleted empty room ${roomId.slice(0,8)}…`);
    }
    if (discovery.has(socket.id)) {
      discovery.delete(socket.id);
      io.to('discovery').emit('discovery-update', [...discovery.values()]);
    }
  });

  socket.on('disconnect', () => console.log(`❌ Disconnected: ${socket.id}`));
});

// ─────────────────────────────────────────
//  اطبع كل عناوين الشبكة المحلية التي يمكن لأي جهاز آخر على نفس
//  الواي فاي/الهوتسبوت استخدامها لفتح التطبيق — بدون أي إنترنت.
// ─────────────────────────────────────────
function getLanUrls(port) {
  const urls = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AetherLink server on port ${PORT}`);
  console.log(`\n📱 افتح أحد هذه الروابط من أي جهاز على نفس الشبكة (بدون إنترنت):`);
  const lan = getLanUrls(PORT);
  if (lan.length === 0) {
    console.log('   ⚠️  لم يتم العثور على شبكة محلية — تأكد من الاتصال بنفس الواي فاي/الهوتسبوت.');
  } else {
    lan.forEach(u => console.log(`   → ${u}`));
  }
  console.log(`   → http://localhost:${PORT}  (على هذا الجهاز نفسه)\n`);
});
