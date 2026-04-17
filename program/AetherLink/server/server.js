/**
 * AetherLink Web - Signaling Server (Full Mesh Edition)
 * FIXED: Full mesh topology + Local direct connection + No duplicate joins
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;

// rooms: Map<roomId, Array<{id, name}>>
const rooms = new Map();

// discovery: Map<socketId, {socketId, deviceName, joinedAt}>
const discovery = new Map();

// Track joined sockets to prevent duplicates
const joinedSockets = new Set();

io.on('connection', (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, deviceName }) => {
    // Prevent duplicate joins
    if (joinedSockets.has(socket.id)) {
      console.log(`⚠️ Socket ${socket.id} already joined, skipping duplicate`);
      return;
    }

    if (!rooms.has(roomId)) rooms.set(roomId, []);
    const room = rooms.get(roomId);
    
    // Remove any stale entry for this socket
    const existingIndex = room.findIndex(u => u.id === socket.id);
    if (existingIndex !== -1) {
      console.log(`🧹 Removing stale entry for ${socket.id}`);
      room.splice(existingIndex, 1);
    }

    // Get existing peers BEFORE adding this socket
    const existingPeers = room.map(u => ({ id: u.id, name: u.name }));
    
    // Notify ALL existing peers about the new peer BEFORE the newcomer joins
    // This ensures everyone creates a peer connection to the newcomer
    socket.to(roomId).emit('new-peer', { id: socket.id, name: deviceName });

    // Add to room
    room.push({ id: socket.id, name: deviceName });
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.deviceName = deviceName;
    joinedSockets.add(socket.id);

    // Send existing peers to newcomer
    socket.emit('room-peers', existingPeers);

    const names = room.map(u => u.name).join(', ');
    console.log(`Room [${roomId.slice(0,8)}…] → ${names}`);

    if (existingPeers.length === 0) {
      socket.emit('waiting-for-peer');
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

  // Clean leave handler
  socket.on('leave-room', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    const idx = room.findIndex(u => u.id === socket.id);
    if (idx !== -1) {
      const name = room[idx].name;
      room.splice(idx, 1);
      // Notify ALL peers in room that this peer left
      io.to(roomId).emit('peer-left', { id: socket.id, name });
    }
    
    socket.leave(roomId);
    joinedSockets.delete(socket.id);
    
    if (room.length === 0) {
      rooms.delete(roomId);
      console.log(`🧹 Deleted empty room ${roomId.slice(0,8)}…`);
    }
  });

  socket.on('disconnecting', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    const idx = room.findIndex(u => u.id === socket.id);
    if (idx !== -1) {
      const name = room[idx].name;
      room.splice(idx, 1);
      // Notify ALL peers in room
      io.to(roomId).emit('peer-left', { id: socket.id, name });
    }
    if (room.length === 0) {
      rooms.delete(roomId);
      console.log(`🧹 Deleted empty room ${roomId.slice(0,8)}…`);
    }
    // Clean up discovery
    if (discovery.has(socket.id)) {
      discovery.delete(socket.id);
      io.to('discovery').emit('discovery-update', [...discovery.values()]);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    joinedSockets.delete(socket.id);
  });
});

server.listen(PORT, () => console.log(`🚀 AetherLink server on port ${PORT}`));