import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeoReviewStatusReply } from './helpComposerSelectedRuntime.js';

test('GeoReview selected status question uses the authorized status field', () => {
  const reply = buildGeoReviewStatusReply({
    message: 'Seçili personelin konum durumu nedir?',
    screenContext: {
      path: '/company/georeview',
      selectedLabel: 'Personel One',
      selectedFields: [
        { label: 'Ad Soyad', value: 'Personel One' },
        { label: 'Durum', value: 'OK' },
        { label: 'Neden', value: 'Elle doğrulandı' },
      ],
    },
  });

  assert.match(reply, /Personel One/);
  assert.match(reply, /Hazır \(OK\)/);
  assert.match(reply, /Elle doğrulandı/);
  assert.doesNotMatch(reply, /hedef: “Seçili”/);
});

test('GeoReview status reply does not cross a non-GeoReview surface', () => {
  const reply = buildGeoReviewStatusReply({
    message: 'Seçili personelin konum durumu nedir?',
    screenContext: {
      path: '/company/live',
      selectedLabel: 'Personel One',
      selectedFields: [{ label: 'Durum', value: 'OK' }],
    },
  });

  assert.equal(reply, '');
});
