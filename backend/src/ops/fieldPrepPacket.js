import { prisma } from "../prisma.js";
import { ENV } from "../env.js";

export const FIELD_PREP_OPERATOR_SEQUENCE = [
  {
    id: "step_superadmin_preflight",
    title: "1. Super Admin preflight",
    detail: "Sahaya Çıkış Kontrolü, Ticari Akış, Canlı İzleme ve Kabul Merkezi tek tur gözden geçirilir.",
    owner: "SUPER_ADMIN",
  },
  {
    id: "step_room_assignment",
    title: "2. Oda atama ve ekip doğrulaması",
    detail: "Araç, sürücü ve vardiya zinciri eksiksiz doğrulanır; boş araç/sürücü ile sahaya çıkılmaz.",
    owner: "ROOM",
  },
  {
    id: "step_company_confirmation",
    title: "3. Company görev teyidi",
    detail: "Company tarafı talep, sözleşme ve operasyon durumunu aynı kayıt üzerinde tekrar okur.",
    owner: "COMPANY",
  },
  {
    id: "step_driver_mobile",
    title: "4. Sürücü mobil turu",
    detail: "Giriş, PIN değişimi, Bugün, Rota ve Canlı ekranları gerçek cihaz üzerinde yürütülür.",
    owner: "DRIVER",
  },
  {
    id: "step_live_signal",
    title: "5. Canlı sinyal ve GPS teyidi",
    detail: "Sürücünün telefon GPS'i yayını ve backend araç GPS kaynağı birlikte okunur; stale sinyal varsa sahaya çıkılmaz.",
    owner: "ROOM + SUPER_ADMIN",
  },
  {
    id: "step_go_decision",
    title: "6. GO / LIMITED GO / NO-GO",
    detail: "Açık riskler, eksik roller ve env uyarıları tek kararda toplanır; plansız saha çıkışı yapılmaz.",
    owner: "SUPER_ADMIN",
  },
];

export const FIELD_PREP_TEST_SCENARIOS = [
  {
    id: "scenario_driver_login_pin",
    title: "Sürücü giriş + PIN değişimi",
    surface: "Mobil",
    success: "Sürücü giriş yapar, gerekirse PIN değiştirir ve Bugün ekranına düşer.",
  },
  {
    id: "scenario_live_gps",
    title: "Canlı konum yayını",
    surface: "Mobil + Canlı İzleme",
    success: "Sürücünün telefon GPS'i yayını alınır ve resmi canlı kaynak backend tarafında okunur.",
  },
  {
    id: "scenario_route_ops",
    title: "Rota operasyon turu",
    surface: "Mobil Rota",
    success: "Vardiya başlatılır, bir durak reached/skip edilir ve operasyon devam eder.",
  },
  {
    id: "scenario_offline_recovery",
    title: "Offline / retry toparlama",
    surface: "Mobil",
    success: "Bağlantı kesildiğinde oturum düşmez; geri gelince tekrar sync olur.",
  },
  {
    id: "scenario_company_room_read",
    title: "Company + Room operasyon okuması",
    surface: "Web",
    success: "Company ve Room aynı işi durum, atama ve ticari özetle birlikte okuyabilir.",
  },
  {
    id: "scenario_superadmin_gate",
    title: "Super Admin son kapı turu",
    surface: "Web Super Admin",
    success: "Sahaya Çıkış Kontrolü, Ticari Akış ve Kabul Merkezi ortak karara hizmet eder.",
  },
];

export const FIELD_PREP_ROLE_DEVICE_CHECKLIST = [
  {
    id: "role_super_admin",
    title: "Super Admin hesabı hazır",
    area: "rol",
    detail: "En az bir SUPER_ADMIN hesabı giriş yapabiliyor ve step-up kurulumunu tamamlayabiliyor olmalı.",
  },
  {
    id: "role_room",
    title: "Oda operasyon hesabı hazır",
    area: "rol",
    detail: "ROOM kullanıcıları vardiya, araç ve sürücü atama akışlarını okuyabilmeli.",
  },
  {
    id: "role_company",
    title: "Company hesabı hazır",
    area: "rol",
    detail: "COMPANY kullanıcıları talep, sözleşme ve ödeme readonly özetini görebilmeli.",
  },
  {
    id: "role_driver",
    title: "Sürücü hesabı + cihaz eşleşmesi hazır",
    area: "rol",
    detail: "En az bir DRIVER kullanıcısı gerçek cihazda giriş yapıp cihaz eşleşmesini taşımalı.",
  },
  {
    id: "device_android",
    title: "Android saha cihazı hazır",
    area: "cihaz",
    detail: "Gerçek cihazda izinler, GPS, ağ geçişi ve release env doğrulaması tamam olmalı.",
  },
  {
    id: "device_support",
    title: "Destek cihazı / gözlem ekranı hazır",
    area: "cihaz",
    detail: "Canlı İzleme ve Kabul Merkezi için ikinci ekran veya destek cihazı hazır olmalı.",
  },
];

function makeStatus(code, label, detail) {
  return { code, label, detail };
}

function statusFromBoolean(ok, readyDetail, failDetail, failCode = "BLOCK") {
  return ok ? makeStatus("READY", "Hazır", readyDetail) : makeStatus(failCode, failCode === "WARN" ? "Uyarı" : failCode === "CHECK" ? "Kontrol gerekli" : "Blok", failDetail);
}

function buildEnvChecks() {
  const requireHttps = String(process.env.REQUIRE_HTTPS || "0") === "1";
  const isProd = String(process.env.NODE_ENV || "development").trim() === "production";
  return [
    {
      id: "env_database_url",
      title: "DATABASE_URL tanımlı",
      status: statusFromBoolean(Boolean(String(ENV.DATABASE_URL || "").trim()), "Backend veritabanı adresi dolu.", "DATABASE_URL boş. Saha paketine çıkmadan veritabanı adresi gerekli."),
    },
    {
      id: "env_jwt_secret",
      title: "JWT secret varsayılan değil",
      status: statusFromBoolean(String(ENV.JWT_SECRET || "").trim() && String(ENV.JWT_SECRET || "") !== "dev-secret", "JWT secret özel değer taşıyor.", "JWT secret hâlâ varsayılan/dev görünüyor.", "WARN"),
    },
    {
      id: "env_cors_origin",
      title: "CORS_ORIGIN wildcard değil",
      status: statusFromBoolean(String(ENV.CORS_ORIGIN || "").trim() && String(ENV.CORS_ORIGIN || "").trim() !== "*", "CORS origin sınırlandırılmış.", "CORS_ORIGIN '*' görünüyor; saha öncesi daraltılması önerilir.", "WARN"),
    },
    {
      id: "env_https_guard",
      title: "Prod HTTPS guard",
      status: isProd
        ? statusFromBoolean(requireHttps, "Production modunda HTTPS guard açık.", "Production modunda REQUIRE_HTTPS kapalı.", "WARN")
        : makeStatus("CHECK", "Kontrol gerekli", "Production build öncesi REQUIRE_HTTPS ve proxy ayarı tekrar doğrulanmalı."),
    },
    {
      id: "env_mobile_release",
      title: "Mobil release env gerçek cihaz için hazır",
      status: makeStatus("CHECK", "Kontrol gerekli", "EXPO_PUBLIC_API_BASE_URL, release stage ve HTTPS host gerçek build üstünde ayrıca doğrulanmalı."),
    },
  ];
}

function summarizeScenarioBase(scenario) {
  return {
    id: scenario.id,
    title: scenario.title,
    surface: scenario.surface,
    success: scenario.success,
    status: makeStatus("CHECK", "Kontrol gerekli", "Bu senaryo gerçek saha günü öncesi operatör tarafından manuel yürütülmelidir."),
  };
}

export async function buildFieldPrepPacket() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [
    superAdminUsers,
    roomUsers,
    companyUsers,
    driverUsers,
    totalRooms,
    activeRooms,
    totalCompanies,
    activeCompanies,
    totalDrivers,
    driversWithUser,
    totalVehicles,
    activeVehicles,
    readyShifts,
    activeShifts,
    activeAgreements,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
    prisma.user.count({ where: { role: "ROOM" } }),
    prisma.user.count({ where: { role: "COMPANY" } }),
    prisma.user.count({ where: { role: "DRIVER" } }),
    prisma.room.count(),
    prisma.room.count({ where: { status: "ACTIVE" } }),
    prisma.company.count(),
    prisma.company.count({ where: { status: "ACTIVE" } }),
    prisma.driver.count(),
    prisma.driver.count({ where: { userId: { not: null } } }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "ACTIVE", archivedAt: null } }),
    prisma.shift.count({ where: { status: { in: ["APPROVED", "ACTIVE"] }, startAt: { gte: windowStart, lte: windowEnd } } }),
    prisma.shift.count({ where: { status: "ACTIVE" } }),
    prisma.agreement.count({ where: { status: { in: ["APPROVED", "ACTIVE"] } } }),
  ]);

  const envChecks = buildEnvChecks();
  const envBlockers = envChecks.filter((item) => item.status.code === "BLOCK");
  const envWarnings = envChecks.filter((item) => item.status.code === "WARN");
  const envChecksNeeded = envChecks.filter((item) => item.status.code === "CHECK");

  const roleChecks = [
    {
      id: "role_super_admin_ready",
      title: "Super Admin hesabı",
      status: statusFromBoolean(superAdminUsers > 0, `${superAdminUsers} SUPER_ADMIN hesabı bulundu.`, "SUPER_ADMIN hesabı bulunamadı."),
      count: superAdminUsers,
    },
    {
      id: "role_room_ready",
      title: "ROOM kullanıcıları",
      status: statusFromBoolean(roomUsers > 0 && activeRooms > 0, `${roomUsers} ROOM kullanıcısı ve ${activeRooms} aktif oda var.`, "ROOM kullanıcı/aktif oda eksik görünüyor."),
      count: roomUsers,
    },
    {
      id: "role_company_ready",
      title: "COMPANY kullanıcıları",
      status: statusFromBoolean(companyUsers > 0 && activeCompanies > 0, `${companyUsers} COMPANY kullanıcısı ve ${activeCompanies} aktif şirket var.`, "COMPANY kullanıcı/aktif şirket eksik görünüyor."),
      count: companyUsers,
    },
    {
      id: "role_driver_ready",
      title: "DRIVER kullanıcıları",
      status: statusFromBoolean(driverUsers > 0 && driversWithUser > 0, `${driverUsers} DRIVER kullanıcısı, ${driversWithUser} bağlı sürücü hesabı var.`, "DRIVER kullanıcı veya user bağlı sürücü hesabı eksik."),
      count: driverUsers,
    },
    {
      id: "vehicle_ready",
      title: "Aktif araç stoğu",
      status: statusFromBoolean(activeVehicles > 0, `${activeVehicles} aktif araç hazır.`, "Aktif araç bulunamadı."),
      count: activeVehicles,
    },
    {
      id: "shift_ready",
      title: "Yakın vardiya hazır",
      status: statusFromBoolean(readyShifts > 0, `${readyShifts} adet APPROVED/ACTIVE vardiya yakın pencerede görünüyor.`, "Yakın pencere için APPROVED/ACTIVE vardiya görünmüyor."),
      count: readyShifts,
    },
  ];

  const blockers = [
    ...envBlockers.map((item) => item.title),
    ...roleChecks.filter((item) => item.status.code === "BLOCK").map((item) => item.title),
  ];
  const warnings = [
    ...envWarnings.map((item) => item.title),
    ...envChecksNeeded.map((item) => item.title),
  ];

  const scenarios = FIELD_PREP_TEST_SCENARIOS.map((scenario) => summarizeScenarioBase(scenario)).map((item) => {
    if (item.id === "scenario_driver_login_pin") {
      return {
        ...item,
        status: driverUsers > 0 ? makeStatus("READY", "Hazır", "Driver hesabı mevcut; gerçek cihaz turu yapılabilir.") : makeStatus("BLOCK", "Blok", "Driver hesabı olmadan bu senaryo yürütülemez."),
      };
    }
    if (item.id === "scenario_live_gps") {
      return {
        ...item,
        status: activeVehicles > 0 ? makeStatus("READY", "Hazır", "Aktif araç var; canlı GPS senaryosu koşulabilir.") : makeStatus("BLOCK", "Blok", "Aktif araç olmadan canlı GPS senaryosu doğrulanamaz."),
      };
    }
    if (item.id === "scenario_company_room_read") {
      return {
        ...item,
        status: roomUsers > 0 && companyUsers > 0 ? makeStatus("READY", "Hazır", "ROOM ve COMPANY yüzeyleri için kullanıcı var.") : makeStatus("WARN", "Uyarı", "ROOM/COMPANY kullanıcılarından biri eksik olabilir."),
      };
    }
    if (item.id === "scenario_superadmin_gate") {
      return {
        ...item,
        status: superAdminUsers > 0 ? makeStatus("READY", "Hazır", "Super Admin son kapı turu koşulabilir.") : makeStatus("BLOCK", "Blok", "Super Admin hesabı olmadan son kapı turu koşulamaz."),
      };
    }
    return item;
  });

  const roleDeviceChecklist = FIELD_PREP_ROLE_DEVICE_CHECKLIST.map((item) => {
    if (item.id === "role_super_admin") return { ...item, status: roleChecks.find((x) => x.id === "role_super_admin_ready")?.status || makeStatus("CHECK", "Kontrol gerekli", item.detail) };
    if (item.id === "role_room") return { ...item, status: roleChecks.find((x) => x.id === "role_room_ready")?.status || makeStatus("CHECK", "Kontrol gerekli", item.detail) };
    if (item.id === "role_company") return { ...item, status: roleChecks.find((x) => x.id === "role_company_ready")?.status || makeStatus("CHECK", "Kontrol gerekli", item.detail) };
    if (item.id === "role_driver") return { ...item, status: roleChecks.find((x) => x.id === "role_driver_ready")?.status || makeStatus("CHECK", "Kontrol gerekli", item.detail) };
    if (item.id === "device_android") return { ...item, status: makeStatus("CHECK", "Kontrol gerekli", "Gerçek cihaz üzerinde izin, GPS, ağ geçişi ve release env ayrı yürütülmelidir.") };
    if (item.id === "device_support") return { ...item, status: makeStatus("WARN", "Uyarı", "İkinci gözlem ekranı yoksa canlı teşhis yavaşlayabilir.") };
    return item;
  });

  return {
    generatedAt: now.toISOString(),
    stage: blockers.length ? "LIMITED_GO" : warnings.length ? "GO_WITH_CHECKS" : "READY_FOR_FIELD",
    summary: {
      blockerCount: blockers.length,
      warningCount: warnings.length,
      operatorStepCount: FIELD_PREP_OPERATOR_SEQUENCE.length,
      scenarioCount: scenarios.length,
      checklistCount: roleDeviceChecklist.length + envChecks.length,
    },
    counters: {
      superAdminUsers,
      roomUsers,
      companyUsers,
      driverUsers,
      totalRooms,
      activeRooms,
      totalCompanies,
      activeCompanies,
      totalDrivers,
      driversWithUser,
      totalVehicles,
      activeVehicles,
      readyShifts,
      activeShifts,
      activeAgreements,
    },
    blockers,
    warnings,
    envChecks,
    operatorSequence: FIELD_PREP_OPERATOR_SEQUENCE,
    scenarios,
    roleDeviceChecklist,
    notes: [
      "Bu paket gerçek saha gününde kim neyi hangi sırayla yapacak sorusunu sadeleştirir.",
      "Backend tek kaynak gerçekliktir; mobil ve web karar üretmez, backend sonucunu okur.",
      "Sürücünün telefon GPS'i ve resmi canlı kaynak birlikte okunmadan sahaya çıkılmaz.",
    ],
  };
}
