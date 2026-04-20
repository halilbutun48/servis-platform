function action(label, routeKey, kind, reason) {
  return { label, routeKey, kind, reason };
}

function roomShiftActions(context) {
  if (!context?.vehicleId) return [action('Araçlar ekranını aç', 'ROOM_VEHICLES', 'PRIMARY', 'Önce uygun araç seçilmelidir.')];
  if (!context?.driverId) return [action('Sürücüler ekranını aç', 'ROOM_DRIVERS', 'PRIMARY', 'Önce sürücü bağlanmalıdır.')];
  if (!Number(context?.stopCount || 0)) return [action('Vardiyalar ekranını aç', 'ROOM_SHIFTS', 'PRIMARY', 'Durak bilgisi vardiya içinde kontrol edilir.')];
  if (context?.agreementId) return [action('Sözleşmeler ekranını aç', 'ROOM_AGREEMENTS', 'PRIMARY', 'Bu iş sözleşmeye bağlı görünüyor.')];
  return [action('Teklifler ekranını aç', 'ROOM_OFFERS', 'PRIMARY', 'Karar adımını aynı akıştan tamamlayabilirsin.')];
}

function companyShiftActions(context) {
  if (context?.agreementId) return [action('Sözleşmeler ekranını aç', 'COMPANY_AGREEMENTS', 'PRIMARY', 'Bu iş sözleşmeye bağlı görünüyor.')];
  return [action('Vardiyalar ekranını aç', 'COMPANY_SHIFTS', 'PRIMARY', 'İlgili kayıtları vardiya ekranında kontrol edebilirsin.')];
}

function superAdminActions(context) {
  if (context?.agreementId) return [action('Copilot ekranını aç', 'SUPERADMIN_COPILOT', 'PRIMARY', 'Kayıt detayını Copilot üzerinden izleyebilirsin.')];
  return [action('Genel görünümü aç', 'SUPERADMIN_OVERVIEW', 'PRIMARY', 'Önce genel yönetim ekranından kapsamı doğrula.')];
}


function buildScreenIfStuck(context) {
  const rows = [];
  rows.push({
    problem: 'Hangi menüye gideceğimi bilmiyorum',
    routeKey: context?.path || '',
    advice: 'Önce bu ekranın amacını oku, sonra ilgili menüye geç.',
  });
  if ((context?.screenMenus || []).length) {
    const first = context.screenMenus[0];
    rows.push({
      problem: 'Bu ekranda aradığımı bulamadım',
      routeKey: first?.path || '',
      advice: first?.purpose || 'İlgili yardımcı menüye geç.',
    });
  }
  return rows.slice(0, 2);
}

export function buildQuickActions({ jobType, context, user }) {
  const role = String(user?.role || '');
  if (jobType === 'TELEMATICS_DEVICE_CREATE') {
    if (role === 'ROOM') {
      const out = [action("Araçlar ekranını aç", 'ROOM_VEHICLES', 'PRIMARY', "Cihaz GPS'i kaydını bu araçtan açabilir veya kontrol edebilirsin.")];
      if (!context?.driver?.id) out.push(action('Sürücüler ekranını aç', 'ROOM_DRIVERS', 'SECONDARY', "Telefon GPS'i tarafını görmek için önce sürücü bağını kontrol et."));
      return out.slice(0, 3);
    }
    if (role === 'COMPANY') return [action('Vardiyalar ekranını aç', 'COMPANY_SHIFTS', 'PRIMARY', "Araç etkisini ilgili vardiyalarda takip et.")];
    return superAdminActions(context);
  }

  if (jobType === 'LOCATION_SOURCE_GUIDE') {
    if (role === 'ROOM') {
      const out = [action("Araçlar ekranını aç", 'ROOM_VEHICLES', 'PRIMARY', 'Konum kaynağını araç detayından daha net görebilirsin.')];
      if (!context?.driver?.id) out.push(action('Sürücüler ekranını aç', 'ROOM_DRIVERS', 'SECONDARY', "Telefon GPS'i tarafı için sürücü bağını kontrol et."));
      if ((context?.currentShiftIds || []).length) out.push(action('Vardiyalar ekranını aç', 'ROOM_SHIFTS', 'SECONDARY', 'Canlı işte hangi kaynağa güveneceğini vardiya akışında karşılaştır.'));
      return out.slice(0, 3);
    }
    if (role === 'COMPANY') return [action('Vardiyalar ekranını aç', 'COMPANY_SHIFTS', 'PRIMARY', 'Konum etkisini vardiya ekranında görmen daha kolay olur.')];
    return superAdminActions(context);
  }

  if (jobType === 'GPS_SIGNAL_DIAGNOSIS_GUIDE') {
    if (role === 'ROOM') {
      const out = [action("Araçlar ekranını aç", 'ROOM_VEHICLES', 'PRIMARY', 'Sinyal ve cihaz durumunu önce araç ekranından kontrol et.')];
      if (!context?.driver?.id) out.push(action('Sürücüler ekranını aç', 'ROOM_DRIVERS', 'SECONDARY', "Telefon GPS'i akışını görmek için sürücü bağını kontrol et."));
      if ((context?.currentShiftIds || []).length) out.push(action('Vardiyalar ekranını aç', 'ROOM_SHIFTS', 'SECONDARY', 'Aktif iş üzerindeki etkisini vardiyada karşılaştır.'));
      return out.slice(0, 3);
    }
    if (role === 'COMPANY') return [action('Vardiyalar ekranını aç', 'COMPANY_SHIFTS', 'PRIMARY', 'Sinyal etkisini vardiya ekranında izle.')];
    return superAdminActions(context);
  }

  if (jobType === 'VEHICLE_DRIVER_BIND') {
    if (role === 'ROOM') {
      const out = [];
      if (!context?.driver?.id) out.push(action('Sürücüler ekranını aç', 'ROOM_DRIVERS', 'PRIMARY', 'Bağlanacak sürücüyü bu ekrandan seçebilirsin.'));
      out.push(action('Araçlar ekranını aç', 'ROOM_VEHICLES', out.length ? 'SECONDARY' : 'PRIMARY', 'Araç kaydını ve cihaz durumunu burada görebilirsin.'));
      if ((context?.currentShiftIds || []).length) out.push(action('Vardiyalar ekranını aç', 'ROOM_SHIFTS', 'SECONDARY', 'Aktif iş etkisini vardiya ekranından kontrol et.'));
      return out.slice(0, 3);
    }
    if (role === 'COMPANY') return [action('Vardiyalar ekranını aç', 'COMPANY_SHIFTS', 'PRIMARY', 'Araç-sürücü etkisini vardiya ekranında takip et.')];
    return superAdminActions(context);
  }

  if (role === 'ROOM') return roomShiftActions(context);
  if (role === 'COMPANY') return companyShiftActions(context);
  return superAdminActions(context);
}

export function buildIfStuck({ jobType, context, user }) {
  if (jobType === 'SCREEN_MENU_GUIDE' || jobType === 'BUTTON_ACTION_GUIDE' || jobType === 'ROLE_HELP_GUIDE') return buildScreenIfStuck(context);
  const role = String(user?.role || '');
  if (jobType === 'TELEMATICS_DEVICE_CREATE') {
    const rows = [];
    rows.push({
      problem: "Cihaz türünü bilmiyorum",
      routeKey: role === 'ROOM' ? 'ROOM_VEHICLES' : 'COMPANY_SHIFTS',
      advice: "Önce araç kaydı ve mevcut cihaz notlarını kontrol et.",
    });
    rows.push({
      problem: "Test verisi gelmiyor",
      routeKey: role === 'ROOM' ? 'ROOM_VEHICLES' : 'COMPANY_SHIFTS',
      advice: "Cihaz GPS'i aktif mi ve son konum zamanı güncelleniyor mu kontrol et.",
    });
    return rows.slice(0, 2);
  }
  if (jobType === 'LOCATION_SOURCE_GUIDE') {
    const rows = [];
    rows.push({
      problem: "Hangi konum kaynağına bakacağımı bilmiyorum",
      routeKey: role === 'ROOM' ? 'ROOM_VEHICLES' : role === 'COMPANY' ? 'COMPANY_SHIFTS' : 'SUPERADMIN_COPILOT',
      advice: "Önce sürücünün telefon GPS'i ile cihaz GPS'i ayrımını netleştir.",
    });
    if (!context?.driver?.id) rows.push({
      problem: "Telefon GPS'i görünmüyor",
      routeKey: role === 'ROOM' ? 'ROOM_DRIVERS' : role === 'COMPANY' ? 'COMPANY_SHIFTS' : 'SUPERADMIN_COPILOT',
      advice: "Önce bu araç için bağlı sürücü var mı kontrol et.",
    });
    return rows.slice(0, 2);
  }
  if (jobType === 'GPS_SIGNAL_DIAGNOSIS_GUIDE') {
    const rows = [];
    rows.push({
      problem: "Konum hiç görünmüyor",
      routeKey: role === 'ROOM' ? 'ROOM_VEHICLES' : role === 'COMPANY' ? 'COMPANY_SHIFTS' : 'SUPERADMIN_COPILOT',
      advice: "Önce son konum zamanı ve aktif cihaz durumunu kontrol et.",
    });
    rows.push({
      problem: "Konum eski görünüyor",
      routeKey: role === 'ROOM' ? 'ROOM_SHIFTS' : role === 'COMPANY' ? 'COMPANY_SHIFTS' : 'SUPERADMIN_COPILOT',
      advice: "Aktif iş varsa konum kaynağını vardiya akışıyla karşılaştır.",
    });
    return rows.slice(0, 2);
  }
  if (jobType === 'VEHICLE_DRIVER_BIND') {
    const rows = [];
    rows.push({
      problem: 'Sürücü listede görünmüyor',
      routeKey: role === 'ROOM' ? 'ROOM_DRIVERS' : 'COMPANY_SHIFTS',
      advice: 'Önce sürücü kaydının ve uygun kapsamın doğru olduğundan emin ol.',
    });
    if ((context?.currentShiftIds || []).length) {
      rows.push({
        problem: 'Aktif iş varken değişiklikten çekiniyorum',
        routeKey: role === 'ROOM' ? 'ROOM_SHIFTS' : 'COMPANY_SHIFTS',
        advice: 'Aktif iş etkisini önce vardiya ekranından kontrol et.',
      });
    }
    return rows.slice(0, 2);
  }

  const defaultShiftRoute = role === 'ROOM' ? 'ROOM_SHIFTS' : role === 'COMPANY' ? 'COMPANY_SHIFTS' : 'SUPERADMIN_COPILOT';
  const rows = [];
  rows.push({
    problem: 'Kayıt beklediğim gibi görünmüyor',
    routeKey: defaultShiftRoute,
    advice: 'Önce kayıt durumunu ve filtreleri kontrol et.',
  });
  if (!context?.vehicleId && role === 'ROOM') {
    rows.push({
      problem: 'Araç seçemiyorum',
      routeKey: 'ROOM_VEHICLES',
      advice: 'Araç listesinde uygun ve aktif kayıt var mı bak.',
    });
  }
  if (!context?.driverId && role === 'ROOM') {
    rows.push({
      problem: 'Sürücü bağlı görünmüyor',
      routeKey: 'ROOM_DRIVERS',
      advice: 'Önce sürücü bağını veya müsait sürücüyü kontrol et.',
    });
  }
  if (context?.agreementId) {
    rows.push({
      problem: 'Sözleşme etkisini anlamadım',
      routeKey: role === 'ROOM' ? 'ROOM_AGREEMENTS' : role === 'COMPANY' ? 'COMPANY_AGREEMENTS' : 'SUPERADMIN_COPILOT',
      advice: 'Sözleşme kaydı bu işi kısıtlıyor olabilir; önce onu aç.',
    });
  }
  return rows.slice(0, 3);
}

// M46.6-B quick action route marker: /room/agreements
