import { prisma } from "../src/prisma.js";
import { ensureM18ParentLiveFixture } from "../prisma/m18DemoFixtureFoundation.js";

try {
  const result = await ensureM18ParentLiveFixture(prisma);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
