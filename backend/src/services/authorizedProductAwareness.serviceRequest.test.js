import assert from "node:assert/strict";
import test from "node:test";

import {
  composeMultiPartExecutionReply,
  isSelectedParentLiveStatusQuestion,
} from "./authorizedProductAwareness.js";

test("PARENT canlı ekranda seçili kayıt için genel servis durumu sorusunu seçili okumaya bağlar", () => {
  assert.equal(isSelectedParentLiveStatusQuestion({
    role: "PARENT",
    message: "Çocuğumun bugün servisi var mı?",
    screenContext: {
      path: "/parent/live",
      selectedRecordId: 3,
      selectedRecordType: "studentService",
      selectedLabel: "#2 Student One",
    },
  }), true);

  assert.equal(isSelectedParentLiveStatusQuestion({
    role: "PARENT",
    message: "Çocuğumun bugün servisi var mı?",
    screenContext: { path: "/parent/live", selectedRecordId: 3 },
  }), false);
});

test("seçili servis talebi karar ve uygulama durumunu gerçek fact değerleriyle açıklar", () => {
  const result = composeMultiPartExecutionReply({
    plan: {
      entity: { type: "serviceRequest", id: 3 },
      entities: [{ type: "serviceRequest", id: 3 }],
      requestedDomains: ["SERVICE_REQUESTS"],
      requestedFields: [
        { key: "REQUEST_STATUS", domain: "SERVICE_REQUESTS" },
        { key: "APPLICATION_STATUS", domain: "SERVICE_REQUESTS" },
      ],
    },
    execution: {
      items: [{
        domain: "SERVICE_REQUESTS",
        entity: { type: "serviceRequest", id: 3 },
        status: "RESOLVED",
        facts: [{
          requestId: 3,
          shiftId: 19,
          requestStatus: "ACCEPTED",
          applicationStatus: "Uygulamaya hazır",
        }],
      }],
    },
    baseReply: "1 servis talebi kaydı",
  });

  assert.match(result.reply, /Servis talebi #3 için istek durumu: Kabul edildi/);
  assert.match(result.reply, /uygulama durumu: Uygulamaya hazır/);
  assert.match(result.reply, /bağlı vardiya #19/);
  assert.match(result.reply, /henüz günlük atamaya uygulanmadı/);
  assert.match(result.reply, /Sürücü rotası henüz yenilenmedi/);
});

test("DRIVER seçili NO_SHOW talebinde günlük etki ile kalıcı rota sınırını birlikte açıklar", () => {
  const result = composeMultiPartExecutionReply({
    plan: {
      entity: { type: "serviceRequest", id: 5 },
      entities: [{ type: "serviceRequest", id: 5 }],
      requestedDomains: ["SERVICE_REQUESTS"],
      requestedFields: [
        { key: "REQUEST_STATUS", domain: "SERVICE_REQUESTS" },
        { key: "APPLICATION_STATUS", domain: "SERVICE_REQUESTS" },
      ],
    },
    execution: {
      items: [{
        domain: "SERVICE_REQUESTS",
        entity: { type: "serviceRequest", id: 5 },
        status: "RESOLVED",
        facts: [{
          requestId: 5,
          shiftId: 1,
          requestStatus: "ACCEPTED",
          applicationStatus: "Uygulandı",
          changeTypeLabel: "Bugün binmeyecek",
          routeRefreshNote: "Sürücü rota ekranında görünür; SMS/push yok; kalıcı rota değişmez.",
        }],
      }],
    },
    baseReply: "1 servis talebi kaydı",
  });

  assert.match(result.reply, /günlük etki: Bugün binmeyecek/iu);
  assert.match(result.reply, /kalıcı rota değişmez/iu);
});

test("DRIVER takip sorusunda rota alanı için günlük ve kalıcı etkiyi ayırır", () => {
  const result = composeMultiPartExecutionReply({
    plan: {
      entity: { type: "serviceRequest", id: 5 },
      entities: [{ type: "serviceRequest", id: 5 }],
      requestedDomains: ["SERVICE_REQUESTS", "OPERATIONS"],
      requestedFields: [{ key: "ROUTE", domain: "OPERATIONS" }],
    },
    execution: {
      items: [{
        domain: "SERVICE_REQUESTS",
        entity: { type: "serviceRequest", id: 5 },
        status: "RESOLVED",
        facts: [{
          requestId: 5,
          shiftId: 1,
          requestStatus: "ACCEPTED",
          applicationStatus: "Uygulandı",
          changeTypeLabel: "Bugün binmeyecek",
          permanentRouteNote: "Kalıcı rota ve durak ataması değişmez.",
        }],
      }],
    },
    baseReply: "1 servis talebi kaydı",
  });

  assert.match(result.reply, /kalıcı rota ve durak ataması değişmez/iu);
});

test("DRIVER genel seçili servis talebi sorusunu tarih aralığına daraltmaz", () => {
  const result = composeMultiPartExecutionReply({
    plan: {
      entity: { type: "serviceRequest", id: 5 },
      entities: [{ type: "serviceRequest", id: 5 }],
      requestedDomains: ["SERVICE_REQUESTS"],
      requestedFields: [{ key: "DATE_RANGE", domain: "SERVICE_REQUESTS" }],
    },
    execution: {
      items: [{
        domain: "SERVICE_REQUESTS",
        entity: { type: "serviceRequest", id: 5 },
        status: "RESOLVED",
        facts: [{
          requestId: 5,
          shiftId: 1,
          requestStatus: "ACCEPTED",
          applicationStatus: "Uygulandı",
          changeTypeLabel: "Bugün binmeyecek",
          permanentRouteNote: "Kalıcı rota ve durak ataması değişmez.",
        }],
      }],
    },
    baseReply: "1 servis talebi kaydı",
  });

  assert.match(result.reply, /günlük etki: Bugün binmeyecek/iu);
});

test("PARENT seçili araç ETA sorusunda GPS yanıtına düşmeden güvenli eksik veri sonucu verir", () => {
  const result = composeMultiPartExecutionReply({
    plan: {
      typedRequest: { taskType: "FIELD_LOOKUP" },
      requestedDomains: ["VEHICLES", "OPERATIONS"],
      requestedFields: [{ key: "ETA", domain: "OPERATIONS" }],
    },
    execution: {
      items: [{
        domain: "VEHICLES",
        count: 1,
        status: "RESOLVED",
        facts: [{ text: "Araç 34 ABC 125", statusBand: "OFFLINE" }],
      }],
    },
    baseReply: "1 yetkili araç kaydı",
  });

  assert.match(result.reply, /ETA/iu);
  assert.match(result.reply, /tahmini süre|GPS|konum/iu);
  assert.doesNotMatch(result.reply, /Veli rolünde öğrencinin servisini canlı izlersin/iu);
});
