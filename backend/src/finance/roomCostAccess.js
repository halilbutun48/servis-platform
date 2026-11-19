export { ROOM_FINANCE_SALARY } from './roomCostPolicy.js';

const SAFE_DENIAL_MESSAGE = 'Bu sürücü maliyeti ayrıntısını görme yetkiniz yok.';

function positiveInteger(value) {
  if (typeof value === 'string' && !value.trim()) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export async function canViewDriverCompensation({ user, roomId } = {}) {
  const actorRoomId = positiveInteger(user?.roomId);
  const requestedRoomId = positiveInteger(roomId);
  if (String(user?.role || '').trim().toUpperCase() !== 'ROOM') return false;
  return Boolean(actorRoomId && requestedRoomId && actorRoomId === requestedRoomId);
}

export async function assertDriverCompensationAccess(args = {}) {
  if (await canViewDriverCompensation(args)) return;
  const error = new Error(SAFE_DENIAL_MESSAGE);
  error.code = 'ROOM_FINANCE_SALARY_REQUIRED';
  error.status = 403;
  error.expose = false;
  throw error;
}
