/**
 * AetherLink Web - Signaling Server (Large-File Edition)
 * v4: instant WebSocket · fast ICE · faster peer detection
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e8,
  pingTimeout: 8000,
  pingInterval: 5000,
  transports: ['websocket'],
  allowUpgrades: false,
  perMessageDeflate: false,
});

const PORT = process.env.PORT || 3000;

const rooms = new Map();
const discovery = new Map();

io.on('connection', (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, deviceName }) => {
    if (!rooms.has(roomId)) rooms.set(roomId, []);
    const room = rooms.get(roomId);

    const dupIdx = room.findIndex(u => u.name === deviceName && u.id !== socket.id);
    if (dupIdx !== -1) {
      const oldEntry = room[dupIdx];
      room.splice(dupIdx, 1);
      socket.to(roomId).emit('peer-stale', { id: oldEntry.id });
      console.log(`♻️  استبدل socket قديم لـ ${deviceName} في الغرفة`);
    }

    const existingPeers = room.map(u => ({ id: u.id, name: u.name }));
    socket.emit('room-peers', existingPeers);

    room.push({ id: socket.id, name: deviceName });
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.deviceName = deviceName;

    socket.to(roomId).emit('new-peer', { id: socket.id, name: deviceName });

    const names = room.map(u => u.name).join(', ');
    console.log(`Room [${roomId.slice(0,8)}…] → ${names}`);

    if (existingPeers.length === 0) {
      socket.emit('waiting-for-peer');
    }
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
      console.log(`🧹 Deleted empty room ${roomId.slice(0,8)}… (leave-room)`);
    }
  });

  socket.on('send-signal', ({ to, signal }) => {
    io.to(to).emit('receive-signal', { signal, from: socket.id });
  });

  socket.on('reconnect-request', ({ to, fromName }) => {
    io.to(to).emit('reconnect-request', { from: socket.id, fromName });
  });

  socket.on('reconnect-accept', ({ to, newRoomId }) => {
    io.to(to).emit('reconnect-accepted', { newRoomId });
  });

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

server.listen(PORT, () => console.log(`🚀 AetherLink server on port ${PORT}`));
