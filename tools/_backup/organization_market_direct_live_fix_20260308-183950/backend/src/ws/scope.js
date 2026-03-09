export function scopeRoomsForUser(user) {
  const rooms = new Set();

  rooms.add(`user:${user.id}`);
  rooms.add(`role:${user.role}`);

  if (user.companyId) rooms.add(`company:${user.companyId}`);
  if (user.roomId) rooms.add(`room:${user.roomId}`);

  return Array.from(rooms);
}
