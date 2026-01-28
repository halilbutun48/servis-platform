const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const m = p._dmmf.datamodel.models.find(x => x.name === "Shift");
console.log("Shift offer fields:", m.fields.map(f => f.name).filter(n => n.toLowerCase().includes("offer")));
p.$disconnect();
