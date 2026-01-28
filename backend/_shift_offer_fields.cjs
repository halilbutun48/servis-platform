const { Prisma } = require("@prisma/client");

const models = Prisma?.dmmf?.datamodel?.models;
if (!models) {
  console.log("NO_DMMF_ON_PrismA", Object.keys(Prisma || {}));
  process.exit(0);
}

const m = models.find(x => x.name === "Shift");
if (!m) {
  console.log("SHIFT_MODEL_NOT_FOUND", models.map(x => x.name));
  process.exit(0);
}

const offerFields = m.fields.map(f => f.name).filter(n => n.toLowerCase().includes("offer"));
console.log("Shift offer fields:", offerFields);
