const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function upsertUser(email, password, role, schoolId = null) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { role, schoolId, passwordHash },
    create: { email, role, schoolId, passwordHash },
  });
}

async function main() {
  const demoPass = "Demo123!";

  const school = await prisma.school.upsert({
    where: { id: 1 },
    update: { name: "Demo Okul", lat: 41.0094, lon: 28.9794 },
    create: { id: 1, name: "Demo Okul", lat: 41.0094, lon: 28.9794 },
  });

  const superAdmin = await upsertUser("admin@demo.com", demoPass, "SUPER_ADMIN", null);
  const serviceRoom = await upsertUser("room@demo.com", demoPass, "SERVICE_ROOM", null);
  const schoolAdmin = await upsertUser("school_admin@demo.com", demoPass, "SCHOOL_ADMIN", school.id);
  const driver = await upsertUser("driver_seed@demo.com", demoPass, "DRIVER", school.id);
  const parent = await upsertUser("parent_seed@demo.com", demoPass, "PARENT", school.id);

  const vehicle = await prisma.vehicle.upsert({
    where: { id: 1 },
    update: { plate: "34 DEMO 001", schoolId: school.id, driverUserId: driver.id },
    create: { id: 1, plate: "34 DEMO 001", schoolId: school.id, driverUserId: driver.id },
  });

  const route = await prisma.route.upsert({
    where: { id: 1 },
    update: { name: "Demo Rota", schoolId: school.id, vehicleId: vehicle.id },
    create: { id: 1, name: "Demo Rota", schoolId: school.id, vehicleId: vehicle.id },
  });

  // stops (idempotent)
  const stops = [
    { ord: 1, name: "Durak 1", lat: 41.0100, lon: 28.9800 },
    { ord: 2, name: "Durak 2", lat: 41.0120, lon: 28.9820 },
  ];
  for (const s of stops) {
    await prisma.routeStop.upsert({
      where: { routeId_ord: { routeId: route.id, ord: s.ord } },
      update: { name: s.name, lat: s.lat, lon: s.lon },
      create: { routeId: route.id, ord: s.ord, name: s.name, lat: s.lat, lon: s.lon },
    });
  }

  await prisma.student.upsert({
    where: { id: 1 },
    update: { fullName: "Seed Ogrenci 1", schoolId: school.id, parentUserId: parent.id, routeId: route.id },
    create: { id: 1, fullName: "Seed Ogrenci 1", schoolId: school.id, parentUserId: parent.id, routeId: route.id },
  });

    // Fix sequences (seed uses explicit ids)
  await prisma.$executeRawUnsafe(`SELECT setval('"School_id_seq"'::regclass, COALESCE((SELECT MAX(id) FROM "School"),1), true);`);
  await prisma.$executeRawUnsafe(`SELECT setval('"User_id_seq"'::regclass, COALESCE((SELECT MAX(id) FROM "User"),1), true);`);
  await prisma.$executeRawUnsafe(`SELECT setval('"Vehicle_id_seq"'::regclass, COALESCE((SELECT MAX(id) FROM "Vehicle"),1), true);`);
  await prisma.$executeRawUnsafe(`SELECT setval('"Route_id_seq"'::regclass, COALESCE((SELECT MAX(id) FROM "Route"),1), true);`);
  await prisma.$executeRawUnsafe(`SELECT setval('"RouteStop_id_seq"'::regclass, COALESCE((SELECT MAX(id) FROM "RouteStop"),1), true);`);
  await prisma.$executeRawUnsafe(`SELECT setval('"Student_id_seq"'::regclass, COALESCE((SELECT MAX(id) FROM "Student"),1), true);`);
  console.log("Seed done. Demo password:", demoPass);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

