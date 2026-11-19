import { filterWorkflowGenericChips, workflowTopicChipSet } from './answerQualityPolicy.js';
import { buildOperationHealthChips } from './conversationOperationHealthEngine.js';
import { listCopilotEBlockRuntimeAnswerTopics } from './copilotEBlockRuntimeAnswerIntegration.js';
import { pathHas } from './intentRouterCore.js';

const COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS = new Set(listCopilotEBlockRuntimeAnswerTopics());

function simpleScreenChipsByPath(screenPath = '', questionType = 'OPEN') {
  const workflowQuestionTypes = new Set(['ROOT_CAUSE', 'WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP', 'SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION', ...COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS]);
  const workflowQuestion = workflowQuestionTypes.has(String(questionType || ''));
  if (workflowQuestion) {
    const chips = filterWorkflowGenericChips(workflowTopicChipSet({ activeTopic: questionType, questionType, screenPath }), { activeTopic: questionType, questionType });
    if (chips.length) return chips.slice(0, 4);
  }
  if (pathHas(screenPath, ['/driver/today'])) {
    return workflowQuestion ? ['Bugünkü görevleri göster', 'Rota ne durumda?', 'Bildirimleri göster', 'PIN/konum sınırı nedir?'] : ['Bu ekranı detaylı anlat', 'Ne yapayım?', 'Konum sinyali bekleniyor', 'Eksik veri'];
  }
  if (pathHas(screenPath, ['/personel/live'])) {
    if (String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY') {
      return ['Bugün binmeyeceğim talebi oluştur', 'Konumumu al', 'Büyük haritada konum seç', 'Adresten konum bul'];
    }
    return workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri'];
  }
  if (pathHas(screenPath, ['/parent/live'])) {
    if (String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY') {
      return ['Çocuğum bugün binmeyecek', 'Çocuğum başka duraktan binecek', 'Çocuğum şu konumdan alınsın', 'Konumumu al'];
    }
    return workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri'];
  }
  if (pathHas(screenPath, ['/room/map'])) {
    return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
  }
  if (pathHas(screenPath, ['/room/operation-health'])) {
    const operationHealthChips = buildOperationHealthChips({ questionType, screenPath });
    return operationHealthChips.length ? operationHealthChips : ['Riskli cihazı göster', 'Konum sinyali güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'];
  }
  if (pathHas(screenPath, ['/room/shifts'])) {
    return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et'];
  }
  if (pathHas(screenPath, ['/room/drivers'])) {
    return ['Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'Bu kayıtta kim görevli?'];
  }
  if (pathHas(screenPath, ['/shared/feedback'])) {
    return ['Bu kayıt kimde?', 'Açık kayıt var mı?', 'Kritik geri bildirim var mı?', 'Sorumlu rol kim?'];
  }
  if (pathHas(screenPath, ['/shared/kvkk'])) {
    return ['Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Yetki sınırı'];
  }
  if (pathHas(screenPath, ['/shared/notifications'])) {
    return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
  }
  if (pathHas(screenPath, ['/room/commercial-flow'])) {
    return ['Üretim geçmişini göster', 'İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
  }
  if (pathHas(screenPath, ['/superadmin/operations'])) {
    return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et'];
  }
  if (pathHas(screenPath, ['/superadmin/commercial-core'])) {
    return ['Hakediş eksiklerini göster', 'Ödeme hesabı var mı?', 'Ödeme hazırlığı hangi aşamada?', 'Hakediş önizlemesini aç'];
  }
  if (pathHas(screenPath, ['/georeview'])) {
    return ['Konum İncele akışını aç', 'OSRM nedir?', 'Matrix nedir?', 'İlgili harita görünümünü aç'];
  }
  if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
  }
  if (pathHas(screenPath, ['/agreements'])) {
    if (String(questionType || '') === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') {
      return ['Sözleşme ödeme modeli nedir?', 'Ödeme hazırlığı hangi aşamada?', 'Bu sözleşme SeferPakt kaynaklı mı?', 'Kaynak vardiyası var mı?', 'Organizasyon planı tek başına kaynak kanıtı sayılır mı?'];
    }
    if (String(questionType || '') === 'AGREEMENT_ROUTE_REFRESH') {
      return ['Bu sözleşmede rota değişikliği var mı?', 'Room’a rota güncelleme talebi gitti mi?', 'Eski rota ile yeni rota farkı ne?', 'Teklif mi, kabul mü?'];
    }
    return ['İlgili sözleşmeyi aç', 'Üretim geçmişini göster', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
  }
  if (pathHas(screenPath, ['/operation-verification', '/acceptance', '/trust-quality', '/observability'])) {
    return ['İlgili kontrol kartını aç', 'Bu ne demek?', 'Sıradaki adımı göster', 'İlgili yere götür'];
  }
  if (pathHas(screenPath, ['/hub'])) {
    return ['Hub akışını aç', 'Inbound akışını göster', 'Outbound akışını göster', 'Sonraki adımı göster'];
  }
  if (pathHas(screenPath, ['/notifications'])) {
    return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
  }
  if (pathHas(screenPath, ['/logs'])) {
    return ['İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'İlgili yere git', 'Sıradaki adımı göster'];
  }
  if (pathHas(screenPath, ['/checkin'])) {
    return ['Check-in akışını aç', 'Bu ekranın amacını göster', 'Sıradaki adımı göster', 'Bu rolde ne yapabilirim?'];
  }
  if (pathHas(screenPath, ['/today', '/live', '/my', '/route', '/map'])) {
    return workflowQuestion ? ['Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?', 'İlgili kaydı aç'] : ['Bu ekranı detaylı anlat', 'Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?'];
  }
  return ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?'];
}

export function screenChipsByPath(screenPath = '', roleMode = 'OPERATIONS', questionType = 'OPEN') {
  const workflowQuestionTypes = new Set(['ROOT_CAUSE', 'WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP', 'SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION', ...COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS]);
  const workflowQuestion = workflowQuestionTypes.has(String(questionType || ''));
  if (workflowQuestion) {
    const chips = filterWorkflowGenericChips(workflowTopicChipSet({ activeTopic: questionType, questionType, screenPath }), { activeTopic: questionType, questionType });
    if (chips.length) return Array.from(new Set(chips)).slice(0, roleMode === 'SIMPLE' ? 4 : 6);
  }
  const chips = [];
  if (pathHas(screenPath, ['/driver/today'])) {
    chips.push(...(workflowQuestion ? ['Bugünkü görevleri göster', 'Rota ne durumda?', 'Bildirimleri göster', 'PIN/konum sınırı nedir?'] : ['Bu ekranı detaylı anlat', 'Ne yapayım?', 'Konum sinyali bekleniyor', 'Eksik veri', 'Yetki sınırı']));
  } else if (pathHas(screenPath, ['/personel/live'])) {
    chips.push(...(String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY'
      ? ['Bugün binmeyeceğim talebi oluştur', 'Konumumu al', 'Büyük haritada konum seç', 'Adresten konum bul']
      : workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri']));
  } else if (pathHas(screenPath, ['/parent/live'])) {
    chips.push(...(String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY'
      ? ['Çocuğum bugün binmeyecek', 'Çocuğum başka duraktan binecek', 'Çocuğum şu konumdan alınsın', 'Konumumu al']
      : workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri']));
  } else if (pathHas(screenPath, ['/room/map'])) {
    chips.push(...(workflowQuestion ? ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'] : ['Bu ekranı detaylı anlat', 'Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç']));
  } else if (pathHas(screenPath, ['/room/operation-health'])) {
    chips.push('Riskli cihazı göster', 'Konum sinyali güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et');
  } else if (pathHas(screenPath, ['/room/shifts'])) {
    chips.push('Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?');
  } else if (pathHas(screenPath, ['/superadmin/operations'])) {
    chips.push('Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et');
  } else if (pathHas(screenPath, ['/superadmin/commercial-core'])) {
    chips.push('Hakediş eksiklerini göster', 'Ödeme hesabı var mı?', 'Ödeme hazırlığı hangi aşamada?', 'Hakediş önizlemesini aç');
  } else if (pathHas(screenPath, ['/room/commercial-flow'])) {
    chips.push('Üretim geçmişini göster', 'İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla');
  } else if (pathHas(screenPath, ['/shared/feedback'])) {
    chips.push('Bu ekranı detaylı anlat', 'Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala', 'Sorumlu rolü göster', 'Geri bildirim açık');
  } else if (pathHas(screenPath, ['/shared/kvkk'])) {
    chips.push('Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Yetki sınırı');
  } else if (pathHas(screenPath, ['/shared/notifications'])) {
    chips.push('Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster');
  } else if (pathHas(screenPath, ['/shared/logs'])) {
    chips.push('Bu ekranı detaylı anlat', 'İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'Sıradaki adımı göster');
  } else if (pathHas(screenPath, ['/room/drivers'])) {
    chips.push('Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/room/reports'])) {
    chips.push('Bu ekranı detaylı anlat', 'Hangi rapora bakmalıyım?', 'Filtreleri nasıl kullanırım?');
  } else if (pathHas(screenPath, ['/company/operations', '/school/operations', '/organization/operations'])) {
    chips.push('Bu ekranı detaylı anlat', 'Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri', 'Yetki sınırı');
  } else if (pathHas(screenPath, ['/driver/change-pin'])) {
    chips.push('Bu ekranı detaylı anlat', 'PIN veya şifre nasıl değişir?', 'İlk girişte ne olur?');
  } else if (pathHas(screenPath, ['/superadmin/trust-quality'])) {
    chips.push('Bu sağlayıcı neden daha iyi?', 'Bu bilgi kesin kalite puanı mı?');
  } else if (pathHas(screenPath, ['/superadmin/operation-verification', '/acceptance', '/trust-quality', '/observability'])) {
    chips.push('İlgili kontrol kartını aç', 'Bu ne demek?', 'Sıradaki adımı göster', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    chips.push(...(workflowQuestion ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'] : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']));
  } else if (pathHas(screenPath, ['/agreements'])) {
    if (String(questionType || '') === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') {
    chips.push('Sözleşme ödeme modeli nedir?', 'Ödeme hazırlığı hangi aşamada?', 'Bu sözleşme SeferPakt kaynaklı mı?', 'Kaynak vardiyası var mı?', 'Organizasyon planı tek başına kaynak kanıtı sayılır mı?');
    } else
    chips.push(...(String(questionType || '') === 'AGREEMENT_ROUTE_REFRESH'
      ? ['Bu sözleşmede rota değişikliği var mı?', 'Room’a rota güncelleme talebi gitti mi?', 'Eski rota ile yeni rota farkı ne?', 'Teklif mi, kabul mü?']
      : ['İlgili sözleşmeyi aç', 'Üretim geçmişini göster', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla']));
  } else if (pathHas(screenPath, ['/georeview'])) {
    chips.push('Konum İncele akışını aç', 'Geo Review ne işe yarar?', 'OSRM nedir?', 'Matrix nedir?');
  } else if (pathHas(screenPath, ['/hub'])) {
    chips.push('Hub akışını aç', 'Inbound akışını göster', 'Outbound akışını göster', 'Sonraki adımı göster');
  } else if (pathHas(screenPath, ['/notifications'])) {
    chips.push('Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster');
  } else if (pathHas(screenPath, ['/logs'])) {
    chips.push('İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'İlgili yere git', 'Sıradaki adımı göster');
  } else if (pathHas(screenPath, ['/checkin'])) {
    chips.push('Check-in akışını aç', 'Bu ekranın amacını göster', 'Sıradaki adımı göster', 'Bu rolde ne yapabilirim?');
  } else if (pathHas(screenPath, ['/today', '/live', '/my', '/route', '/map'])) {
    chips.push(...(workflowQuestion ? ['Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?', 'İlgili kaydı aç'] : ['Bu ekranı detaylı anlat', 'Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?']));
  } else {
    chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?', 'Bu rolde ne yapabilirim?');
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(simpleScreenChipsByPath(screenPath, questionType))).slice(0, 4);
  }

  return Array.from(new Set(chips.concat(['Bu rolde ne yapabilirim?']))).slice(0, 6);
}
