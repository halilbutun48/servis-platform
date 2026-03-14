import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "demo123";

function dtPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function upsertUser({ email, role, fullName, phone, companyId, roomId }) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      role,
      fullName,
      phone,
      companyId: companyId ?? null,
      roomId: roomId ?? null,
      passwordHash,
    },
    create: { email, role, fullName, phone, companyId: companyId ?? null, roomId: roomId ?? null, passwordHash },
  });
}

async function main() {
  // Regions (İl)
  const region = await prisma.region.upsert({
    where: { id: 1 },
    update: { name: "İstanbul" },
    create: { name: "İstanbul" },
  });

  // Demo Company (kiralayan) + Demo Room (servis sağlayan)
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: { name: "DemoCompany", status: "ACTIVE", region: { connect: { id: region.id } } },
    create: { name: "DemoCompany", status: "ACTIVE", region: { connect: { id: region.id } } },
  });

  const room = await prisma.room.upsert({
    where: { id: 1 },
    update: { name: "DemoRoom", status: "ACTIVE", region: { connect: { id: region.id } } },
    create: { name: "DemoRoom", status: "ACTIVE", region: { connect: { id: region.id } } },
  });

  // Seed users (login)
  const superAdmin = await upsertUser({
    email: "superadmin@demo.com",
    role: Role.SUPER_ADMIN,
    fullName: "Super Admin",
    phone: "+90 555 000 00 01",
  });

  const companyUser = await upsertUser({
    email: "company@demo.com",
    role: Role.COMPANY,
    fullName: "Company Operator",
    phone: "+90 555 000 00 02",
    companyId: company.id,
  });

  const roomUser = await upsertUser({
    email: "room@demo.com",
    role: Role.ROOM,
    fullName: "Room Operator",
    phone: "+90 555 000 00 03",
    roomId: room.id,
  });

  // Driver entity + driver login
  const driver = await prisma.driver.upsert({
    where: { id: 1 },
    update: {
      roomId: room.id,
      fullName: "Driver One",
      phone: "+90 555 000 00 04",
      deviceInfo: "Android GPS Phone (demo)",
      driverCode: "SRC-000001",
      pinTemporary: false,
      pinUpdatedAt: new Date(),
    },
    create: {
      roomId: room.id,
      fullName: "Driver One",
      phone: "+90 555 000 00 04",
      deviceInfo: "Android GPS Phone (demo)",
      driverCode: "SRC-000001",
      pinTemporary: false,
      pinUpdatedAt: new Date(),
    },
  });

  const driverUser = await upsertUser({
    email: "driver@demo.com",
    role: Role.DRIVER,
    fullName: driver.fullName,
    phone: driver.phone,
    roomId: room.id,
  });

  // link driver <-> user
  await prisma.driver.update({ where: { id: driver.id }, data: { userId: driverUser.id } });

  // Personel entity + personel login
  const personel = await prisma.personel.upsert({
    where: { id: 1 },
    update: {
      companyId: company.id,
      fullName: "Personel One",
      homeLat: 41.015,
      homeLng: 28.979,
    },
    create: {
      companyId: company.id,
      fullName: "Personel One",
      homeLat: 41.015,
      homeLng: 28.979,
    },
  });

  const personelUser = await upsertUser({
    email: "personel@demo.com",
    role: Role.PERSONEL,
    fullName: personel.fullName,
    phone: "+90 555 000 00 05",
    companyId: company.id,
  });

  await prisma.personel.update({ where: { id: personel.id }, data: { userId: personelUser.id } });

  // --- M80/M81 demo accounts (School + Parent) ---
  // Demo School (Company.kind=SCHOOL) + School login (role=COMPANY, scope=school companyId)
  // NOTE: Requires schema that includes Company.kind and Role.PARENT / Personel.kind.
  const school = await prisma.company.upsert({
    where: { id: 2 },
    update: { name: "DemoOkul", status: "ACTIVE", region: { connect: { id: region.id } }, kind: "SCHOOL" },
    create: { name: "DemoOkul", status: "ACTIVE", region: { connect: { id: region.id } }, kind: "SCHOOL" },
  });

  const schoolUser = await upsertUser({
    email: "school@demo.com",
    role: Role.COMPANY,
    fullName: "School Operator",
    phone: "+90 555 000 00 06",
    companyId: school.id,
  });

  const organization = await prisma.company.upsert({
    where: { id: 3 },
    update: { name: "DemoOrganizasyon", status: "ACTIVE", region: { connect: { id: region.id } }, kind: "ORGANIZATION" },
    create: { name: "DemoOrganizasyon", status: "ACTIVE", region: { connect: { id: region.id } }, kind: "ORGANIZATION" },
  });

  const organizationUser = await upsertUser({
    email: "organization@demo.com",
    role: Role.COMPANY,
    fullName: "Organization Planner",
    phone: "+90 555 000 00 08",
    companyId: organization.id,
  });

  // Parent login (no scope)
  const parentUser = await upsertUser({
    email: "parent@demo.com",
    role: "PARENT",
    fullName: "DemoParent",
    phone: "+90 555 000 00 07",
  });

  // Demo Student (Personel.kind=STUDENT) under school
  const student = await prisma.personel.upsert({
    where: { id: 2 },
    update: {
      companyId: school.id,
      fullName: "Student One",
      homeLat: 41.021,
      homeLng: 28.986,
      kind: "STUDENT",
      geoStatus: "OK",
      geoManualOverride: true,
    },
    create: {
      companyId: school.id,
      fullName: "Student One",
      homeLat: 41.021,
      homeLng: 28.986,
      kind: "STUDENT",
      geoStatus: "OK",
      geoManualOverride: true,
    },
  });

  // ParentChild link (parentUserId <-> personelId)
  if (prisma.parentChild) {
    await prisma.parentChild.createMany({
      data: [{ parentUserId: parentUser.id, personelId: student.id }],
      skipDuplicates: true,
    });
  }

  // Vehicle (Room owns)
  const vehicle = await prisma.vehicle.upsert({
    where: { plate: "34ABC123" },
    update: {
      roomId: room.id,
      capacity: 16,
      status: "ACTIVE",
      speedLimitKmh: 80,
      nextMaintenanceAt: dtPlusDays(6), // 7 gün kala senaryosu
    },
    create: {
      roomId: room.id,
      plate: "34ABC123",
      capacity: 16,
      status: "ACTIVE",
      speedLimitKmh: 80,
      nextMaintenanceAt: dtPlusDays(6),
    },
  });

  // Seed last gps
  await prisma.gpsLast.upsert({
    where: { vehicleId: vehicle.id },
    update: { lat: 41.017, lng: 28.98, speed: 0, at: new Date(), status: "OK" },
    create: { vehicleId: vehicle.id, lat: 41.017, lng: 28.98, speed: 0, at: new Date(), status: "OK" },
  });

  // Shift (Company creates -> requested; Room approves assigns vehicle+driver)
  const startAt = new Date();
  startAt.setHours(8, 0, 0, 0);
  const endAt = new Date();
  endAt.setHours(18, 0, 0, 0);

  const shift = await prisma.shift.upsert({
    where: { id: 1 },
    update: {
      companyId: company.id,
      roomId: room.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      startAt,
      endAt,
      status: "APPROVED",
    },
    create: {
      companyId: company.id,
      roomId: room.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      startAt,
      endAt,
      status: "APPROVED",
    },
  });

  const orgPlan = await prisma.organizationPlan.upsert({
    where: { id: 1 },
    update: {
      companyId: organization.id,
      title: "Fuar Giriş Dağıtım",
      planDate: startAt,
      startMin: 8 * 60,
      endMin: 18 * 60,
      roomId: room.id,
      notes: "Demo organization route plan",
      status: "DRAFT",
    },
    create: {
      companyId: organization.id,
      title: "Fuar Giriş Dağıtım",
      planDate: startAt,
      startMin: 8 * 60,
      endMin: 18 * 60,
      roomId: room.id,
      notes: "Demo organization route plan",
      status: "DRAFT",
    },
  });
  await prisma.organizationStop.deleteMany({ where: { planId: orgPlan.id } });
  await prisma.organizationStop.createMany({
    data: [
      { planId: orgPlan.id, name: "Fuar Giriş Kapısı", address: "İstanbul Fuar Merkezi", lat: 41.048, lng: 28.82, order: 1, passengerCount: 12 },
      { planId: orgPlan.id, name: "Otel Transfer", address: "Yeşilköy Oteller Bölgesi", lat: 40.976, lng: 28.824, order: 2, passengerCount: 8 },
      { planId: orgPlan.id, name: "Kongre Merkezi", address: "Büyükçekmece", lat: 41.02, lng: 28.58, order: 3, passengerCount: 20 },
    ],
  });

  // Shift-2 (School demo) — lets Parent/School screens show a live shift for the student
  const schoolShift = await prisma.shift.upsert({
    where: { id: 2 },
    update: {
      companyId: school.id,
      roomId: room.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      startAt,
      endAt,
      status: "APPROVED",
    },
    create: {
      companyId: school.id,
      roomId: room.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      startAt,
      endAt,
      status: "APPROVED",
    },
  });

  // Stops
  await prisma.stop.deleteMany({ where: { shiftId: shift.id } });
  await prisma.stop.createMany({
    data: [
      { shiftId: shift.id, name: "Durak A", lat: 41.017, lng: 28.98, order: 1, type: "COMMON" },
      { shiftId: shift.id, name: "Durak B", lat: 41.022, lng: 28.985, order: 2, type: "COMMON" },
      { shiftId: shift.id, name: "Durak C", lat: 41.028, lng: 28.992, order: 3, type: "MANUAL" },
    ],
  });

  await prisma.stop.deleteMany({ where: { shiftId: schoolShift.id } });
  await prisma.stop.createMany({
    data: [
      { shiftId: schoolShift.id, name: "Okul Durak 1", lat: 41.018, lng: 28.982, order: 1, type: "COMMON" },
      { shiftId: schoolShift.id, name: "Okul Durak 2", lat: 41.022, lng: 28.985, order: 2, type: "COMMON" },
      { shiftId: schoolShift.id, name: "Okul Durak 3", lat: 41.026, lng: 28.989, order: 3, type: "MANUAL" },
    ],
  });

  // Progress (no stop reached yet)
  await prisma.shiftProgress.upsert({
    where: { shiftId: shift.id },
    update: { lastReachedOrder: 0, completedAt: null },
    create: { shiftId: shift.id, lastReachedOrder: 0 },
  });

  await prisma.shiftProgress.upsert({
    where: { shiftId: schoolShift.id },
    update: { lastReachedOrder: 0, completedAt: null },
    create: { shiftId: schoolShift.id, lastReachedOrder: 0 },
  });

  // Pickup request demo
  await prisma.pickupRequest.deleteMany({ where: { shiftId: shift.id, personelId: personel.id } });
  await prisma.pickupRequest.create({
    data: { shiftId: shift.id, personelId: personel.id, lat: personel.homeLat, lng: personel.homeLng, status: "OPEN" },
  });

  // Stop assignment demo (for Parent ETA / remaining stops)
  const stopB = await prisma.stop.findFirst({ where: { shiftId: schoolShift.id, order: 2 } });
  if (stopB) {
    // student assigned to stop-2 (school shift)
    await prisma.shiftPersonel.upsert({
      where: { shiftId_personelId: { shiftId: schoolShift.id, personelId: student.id } },
      update: { note: "demo-student" },
      create: { shiftId: schoolShift.id, personelId: student.id, note: "demo-student" },
    });
    await prisma.stopAssignment.upsert({
      where: { shiftId_personelId: { shiftId: schoolShift.id, personelId: student.id } },
      update: { stopId: stopB.id, walkM: 120 },
      create: { shiftId: schoolShift.id, personelId: student.id, stopId: stopB.id, walkM: 120 },
    });
  }

  // Notification demo (maintenance 7d)
  const dueIso = vehicle.nextMaintenanceAt ? vehicle.nextMaintenanceAt.toISOString().slice(0, 10) : "-";
  const payload = { title: "Bakım Yaklaşıyor", message: `Araç ${vehicle.plate} bakım tarihi yaklaştı (${dueIso}).`, vehicleId: vehicle.id };

  await prisma.notification.createMany({
    data: [
      { type: "MAINT_7D", scope: "ROOM", payloadJson: payload, roomId: room.id, vehicleId: vehicle.id, shiftId: shift.id },
      { type: "MAINT_7D", scope: "DRIVER", payloadJson: payload, driverId: driver.id, vehicleId: vehicle.id, shiftId: shift.id },
      { type: "MAINT_7D", scope: "COMPANY", payloadJson: payload, companyId: company.id, vehicleId: vehicle.id, shiftId: shift.id },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed tamamlandı. Şifre (hepsi): demo123");
  console.log("Users:", {
    superAdmin: superAdmin.email,
    company: companyUser.email,
    room: roomUser.email,
    driver: driverUser.email,
    personel: personelUser.email,
    parent: parentUser.email,
    school: schoolUser.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
