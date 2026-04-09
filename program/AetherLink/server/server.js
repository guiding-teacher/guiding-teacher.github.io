/**
 * AetherLink Web - Signaling Server (Multi-Peer Edition)
 * With session data limit tracking (2 GB per room)
 */

const express = require('express');
const http    = require('http');
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────
//  In-memory state
// ─────────────────────────────────────────

// rooms: Map<roomId, Array<{id, name}>>
const rooms = new Map();

// roomUsage: Map<roomId, bytesTransferred>
const roomUsage = new Map();

// حد البيانات لكل غرفة: 2 GB
const ROOM_DATA_LIMIT = 2 * 1024 * 1024 * 1024;

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / 1024 ** i).toFixed(2)} ${u[i]}`;
}

// ─────────────────────────────────────────
//  Socket.IO events
// ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  // ── انضمام لغرفة ──
  socket.on('join-room', ({ roomId, deviceName }) => {
    if (!roomId || !deviceName) return;

    if (!rooms.has(roomId))    rooms.set(roomId, []);
    if (!roomUsage.has(roomId)) roomUsage.set(roomId, 0);

    const room = rooms.get(roomId);

    // أرسل قائمة الـ peers الموجودين للقادم الجديد
    const existingPeers = room.map(u => ({ id: u.id, name: u.name }));
    socket.emit('room-peers', existingPeers);

    // أضفه للغرفة
    room.push({ id: socket.id, name: deviceName });
    socket.join(roomId);
    socket.data.roomId     = roomId;
    socket.data.deviceName = deviceName;

    // أبلغ الآخرين بالـ peer الجديد
    socket.to(roomId).emit('new-peer', { id: socket.id, name: deviceName });

    const names = room.map(u => u.name).join(', ');
    console.log(`Room [${roomId.slice(0, 8)}…] → ${names}`);

    if (existingPeers.length === 0) {
      socket.emit('waiting-for-peer');
    }

    // أرسل حالة الاستخدام الحالية للقادم الجديد
    const usedBytes = roomUsage.get(roomId) || 0;
    const pct = Math.round((usedBytes / ROOM_DATA_LIMIT) * 100);
    socket.emit('room-usage', { used: usedBytes, limit: ROOM_DATA_LIMIT, pct });

    // إذا كانت الغرفة وصلت الحد مسبقاً، أبلغه فوراً
    if (usedBytes >= ROOM_DATA_LIMIT) {
      socket.emit('room-limit-reached');
    }
  });

  // ── ترحيل إشارات WebRTC بين الـ peers ──
  socket.on('send-signal', ({ to, signal }) => {
    if (!to || !signal) return;
    io.to(to).emit('receive-signal', { signal, from: socket.id });
  });

  // ── تتبع استهلاك البيانات ──
  socket.on('data-usage', ({ roomId, bytes }) => {
    if (!roomId || typeof bytes !== 'number' || bytes <= 0) return;

    const prev = roomUsage.get(roomId) || 0;
    const next = prev + bytes;
    roomUsage.set(roomId, next);

    const pct = Math.min(100, Math.round((next / ROOM_DATA_LIMIT) * 100));

    // أبلغ كل أعضاء الغرفة بالاستخدام المحدّث
    io.to(roomId).emit('room-usage', {
      used:  next,
      limit: ROOM_DATA_LIMIT,
      pct,
    });

    console.log(
      `📊 Room [${roomId.slice(0, 8)}…] usage: ${fmtBytes(next)} / ${fmtBytes(ROOM_DATA_LIMIT)} (${pct}%)`
    );

    // تنبيه عند الاقتراب من الحد (90%)
    if (pct >= 90 && pct < 100) {
      io.to(roomId).emit('room-usage-warning', { pct });
      console.log(`⚠️  Room [${roomId.slice(0, 8)}…] at ${pct}% of limit`);
    }

    // تنفيذ الحد عند الوصول إليه
    if (next >= ROOM_DATA_LIMIT) {
      io.to(roomId).emit('room-limit-reached');
      console.log(`🚫 Room [${roomId.slice(0, 8)}…] reached 2 GB limit`);
    }
  });

  // ── مساعدات إعادة الاتصال ──
  socket.on('reconnect-request', ({ to, fromName }) => {
    if (!to) return;
    io.to(to).emit('reconnect-request', { from: socket.id, fromName });
  });

  socket.on('reconnect-accept', ({ to, newRoomId }) => {
    if (!to) return;
    io.to(to).emit('reconnect-accepted', { newRoomId });
  });

  // ── مغادرة الغرفة يدوياً ──
  socket.on('leave-room', () => {
    handleLeave(socket);
  });

  // ── قطع الاتصال ──
  socket.on('disconnecting', () => {
    handleLeave(socket);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────
//  Leave / cleanup helper
// ─────────────────────────────────────────
function handleLeave(socket) {
  const roomId = socket.data.roomId;
  if (!roomId || !rooms.has(roomId)) return;

  const room = rooms.get(roomId);
  const idx  = room.findIndex(u => u.id === socket.id);
  if (idx !== -1) room.splice(idx, 1);

  socket.to(roomId).emit('peer-left', {
    id:   socket.id,
    name: socket.data.deviceName || 'Unknown',
  });

  // نظّف الغرفة إذا أصبحت فارغة
  if (room.length === 0) {
    rooms.delete(roomId);
    roomUsage.delete(roomId);
    console.log(`🧹 Deleted empty room [${roomId.slice(0, 8)}…]`);
  }

  // امسح بيانات الـ socket
  socket.data.roomId     = undefined;
  socket.data.deviceName = undefined;
}

// ─────────────────────────────────────────
//  Start
// ─────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 AetherLink server running on port ${PORT}`);
  console.log(`📦 Session data limit: ${fmtBytes(ROOM_DATA_LIMIT)} per room`);
});