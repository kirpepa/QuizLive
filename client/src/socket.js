import { io } from 'socket.io-client';
import { API_URL } from './api/client.js';

// One shared socket connection for the whole app. Created lazily so pages that
// don't need realtime never open a connection.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}

// Promisified emit for request/response style events with an ack callback.
export function emitAck(event, payload) {
  return new Promise((resolve) => {
    getSocket().emit(event, payload, (response) => resolve(response || {}));
  });
}
