import { customAlphabet } from 'nanoid';

// Unambiguous alphabet (no 0/O, 1/I) for easy verbal/typed sharing.
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export function generateRoomCode() {
  return nanoid();
}
