/**
 * AetherLink Web - Signaling Server (Multi-Peer Edition with Data Limit)
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// rooms: Map<roomId, Array<{id, name}>>
const rooms = new Map();

// NEW: Session data tracking - 2GB limit per session
const MAX_SESSION_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const sessionDataUsage = new Map(); // Map<roomId, number (bytes used)>

io.on('connection', (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, deviceName }) => {
    // Initialize room if doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, []);
      sessionDataUsage.set(roomId, 0); // Initialize data counter
    }
    const room = rooms.get(roomId);

    // NEW: Check if session has exceeded data limit
    const currentUsage = sessionDataUsage.get(roomId) || 0;
    if (currentUsage >= MAX_SESSION_BYTES) {
      socket.emit('session-limit-reached', {
        limit: MAX_SESSION_BYTES,
        used: currentUsage,
        message: 'تم تجاوز حد البيانات المسموح به في هذه الجلسة (2 جيجابايت)'
      });
      return;
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

    // NEW: Send current data usage to new peer
    socket.emit('data-usage-update', {
      used: currentUsage,
      limit: MAX_SESSION_BYTES,
      remaining: MAX_SESSION_BYTES - currentUsage
    });

    const names = room.map(u => u.name).join(', ');
    console.log(`Room [${roomId.slice(0,8)}…] → ${names} | Data: ${(currentUsage / 1024 / 1024).toFixed(2)}MB / 2048MB`);

    if (existingPeers.length === 0) {
      socket.emit('waiting-for-peer');
    }
  });

  // Signal relay: target is a specific socket id
  socket.on('send-signal', ({ to, signal }) => {
    io.to(to).emit('receive-signal', { signal, from: socket.id });
  });

  // NEW: Track data usage from file transfers
  socket.on('file-transfer-start', ({ roomId, fileSize }) => {
    const currentUsage = sessionDataUsage.get(roomId) || 0;
    const newUsage = currentUsage + fileSize;
    
    // Check if this transfer would exceed limit
    if (newUsage > MAX_SESSION_BYTES) {
      socket.emit('transfer-rejected', {
        reason: 'session_limit',
        message: 'لا يمكن إرسال الملف - سيتم تجاوز حد البيانات (2 جيجابايت)',
        remaining: MAX_SESSION_BYTES - currentUsage
      });
      return;
    }
    
    // Update usage
    sessionDataUsage.set(roomId, newUsage);
    
    // Broadcast updated usage to all room members
    io.to(roomId).emit('data-usage-update', {
      used: newUsage,
      limit: MAX_SESSION_BYTES,
      remaining: MAX_SESSION_BYTES - newUsage
    });
  });

  // Reconnect helpers
  socket.on('reconnect-request', ({ to, fromName }) => {
    io.to(to).emit('reconnect-request', { from: socket.id, fromName });
  });

  socket.on('reconnect-accept', ({ to, newRoomId }) => {
    io.to(to).emit('reconnect-accepted', { newRoomId });
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
      sessionDataUsage.delete(roomId); // Clean up data usage tracking
      console.log(`🧹 Deleted empty room ${roomId.slice(0,8)}…`);
    }
  });

  socket.on('disconnect', () => console.log(`❌ Disconnected: ${socket.id}`));
});

server.listen(PORT, () => console.log(`🚀 AetherLink server on port ${PORT} (2GB limit per session)`));