import { getShiftContext, getVehicleContext } from '../tools.js';
import { getScreenDefinitionForUser } from '../jobGuide/screenCatalog.js';

function describeEntity(context) {
  if (!context) return '-';
  if (context.type === 'shift') return `Vardiya #${context.id} • ${context.status || '-'} • ${context.company?.name || context.room?.name || 'vardiya'}`;
  if (context.type === 'vehicle') return `Araç #${context.id} • ${context.plate || 'plaka?'} • ${context.status || '-'}`;
  if (context.type === 'screen') return `${context.label || 'Ekran'} • ${context.roleLabel || context.roleKey || 'rol'}`;
  return `${context.type || 'entity'} #${context.id || '-'}`;
}

function buildScopeSummary(user, entityType, entityId) {
  const role = String(user?.role || '-');
  const room = user?.roomId != null ? `roomId=${user.roomId}` : null;
  const company = user?.companyId != null ? `companyId=${user.companyId}` : null;
  const scopeBits = [room, company].filter(Boolean).join(', ');
  if (entityType === 'screen') return `${role} rolü için ekran bağlamı okundu${scopeBits ? ` (${scopeBits})` : ''}.`;
  return `${role} scope içinde ${entityType} #${entityId} okundu${scopeBits ? ` (${scopeBits})` : ''}.`;
}

function deriveRoleMode(user) {
  return ['DRIVER', 'PERSONEL', 'PARENT'].includes(String(user?.role || '')) ? 'SIMPLE' : 'OPERATIONS';
}

export async function resolveChatContext({ entityType, entityId, user, screenContext }) {
  let context = null;
  if (entityType === 'shift') {
    context = await getShiftContext(user, entityId);
  } else if (entityType === 'vehicle') {
    context = await getVehicleContext(user, entityId);
  } else if (entityType === 'screen') {
    context = getScreenDefinitionForUser(user, screenContext || {}, entityId);
    if (!context) {
      const e = new Error('SCREEN_CONTEXT_NOT_FOUND');
      e.status = 400;
      e.code = 'SCREEN_CONTEXT_NOT_FOUND';
      throw e;
    }
  } else {
    const e = new Error('UNSUPPORTED_ENTITY_TYPE');
    e.status = 400;
    e.code = 'UNSUPPORTED_ENTITY_TYPE';
    throw e;
  }

  const screenDefinition = getScreenDefinitionForUser(user, screenContext || {}, Number(screenContext?.id || 0));

  return {
    context,
    screenDefinition,
    entityLabel: describeEntity(context),
    scope: {
      role: String(user?.role || ''),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: buildScopeSummary(user, entityType, entityId),
      roleMode: deriveRoleMode(user),
    },
  };
}
