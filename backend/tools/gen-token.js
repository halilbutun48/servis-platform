const path = require("path");
try { require("dotenv").config({ path: path.join(__dirname, "..", ".env") }); } catch {}

const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const email = process.argv[2] || "parent_seed@demo.com";

  // user tablosu yoksa/isim farklıysa burada patlar; görürüz.
  const u = await prisma.user.findFirst({ where: { email } });
  if (!u) {
    console.error("NO_USER", email);
    process.exit(2);
  }

  // Backend'in kullandığı secret env ismini burada geniş tuttum.
  const secret =
    process.env.JWT_SECRET ||
    process.env.JWT ||
    process.env.SECRET ||
    process.env.APP_SECRET ||
    "dev_secret";

  const token = jwt.sign(
    { id: u.id, role: u.role, schoolId: u.schoolId, email: u.email },
    secret,
    { expiresIn: "30d" }
  );

  console.log(token);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERR", e?.message || e);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
