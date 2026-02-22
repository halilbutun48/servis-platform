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
    update: { role, fullName, phone, companyId: companyId ?? null, roomId: roomId ?? null },
    create: { email, role, fullName, phone, companyId: companyId ?? null, roomId: roomId ?? null, passwordHash },
  });
}

async function main() {
  // Demo Company (kiralayan) + Demo Room (servis sağlayan)
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: { name: "DemoCompany", status: "ACTIVE" },
    create: { name: "DemoCompany", status: "ACTIVE" },
  });

  const room = await prisma.room.upsert({
    where: { id: 1 },
    update: { name: "DemoRoom", status: "ACTIVE" },
    create: { name: "DemoRoom", status: "ACTIVE" },
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
    },
    create: {
      roomId: room.id,
      fullName: "Driver One",
      phone: "+90 555 000 00 04",
      deviceInfo: "Android GPS Phone (demo)",
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

  // Stops
  await prisma.stop.deleteMany({ where: { shiftId: shift.id } });
  await prisma.stop.createMany({
    data: [
      { shiftId: shift.id, name: "Durak A", lat: 41.017, lng: 28.98, order: 1, type: "COMMON" },
      { shiftId: shift.id, name: "Durak B", lat: 41.022, lng: 28.985, order: 2, type: "COMMON" },
      { shiftId: shift.id, name: "Durak C", lat: 41.028, lng: 28.992, order: 3, type: "MANUAL" },
    ],
  });

  // Progress (no stop reached yet)
  await prisma.shiftProgress.upsert({
    where: { shiftId: shift.id },
    update: { lastReachedOrder: 0, completedAt: null },
    create: { shiftId: shift.id, lastReachedOrder: 0 },
  });

  // Pickup request demo
  await prisma.pickupRequest.deleteMany({ where: { shiftId: shift.id, personelId: personel.id } });
  await prisma.pickupRequest.create({
    data: { shiftId: shift.id, personelId: personel.id, lat: personel.homeLat, lng: personel.homeLng, status: "OPEN" },
  });

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
