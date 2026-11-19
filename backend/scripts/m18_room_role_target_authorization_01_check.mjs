import assert from 'node:assert/strict';
import {
  inferRoleScopedUiTarget,
} from '../src/ai/chat/canonicalSemanticRequest.js';
import {
  hasTurkishDirectionalNavigationPredicate,
} from '../src/ai/chat/turkishNavigationEvidence.js';

const roleTarget = inferRoleScopedUiTarget('Şirket yönetim ekranına geçmek istiyorum.');
assert.equal(
  hasTurkishDirectionalNavigationPredicate('geçmek'),
  true,
  'Turkish infinitive navigation form must be recognized structurally',
);
assert.deepEqual(
  roleTarget,
  {
    roleKey: 'COMPANY',
    targetKind: 'ROLE_SCOPED_UI',
    explicitlyMissing: false,
    source: 'EXPLICIT_ROLE_UI_REFERENCE',
  },
  'an explicit company surface request must reach role-target authorization',
);

assert.equal(
  inferRoleScopedUiTarget('Yönetim ekranına geçip ilk adımı anlatır mısın?'),
  null,
  'generic management-screen language must not infer an unauthorized role target',
);

console.log('M18_ROOM_ROLE_TARGET_AUTHORIZATION_CHECK=GREEN');
