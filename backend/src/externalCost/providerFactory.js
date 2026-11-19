import { ENV } from "../env.js";
import { createProviderRegistry } from "./providerRegistry.js";
import { createEpdkLpgProvider, createEpdkPetrolProvider } from "./epdkProvider.js";
import { createEpdkPetrolBulletinProvider } from "./epdkBulletinProvider.js";
import { createKgmTollProvider } from "./kgmTollProvider.js";
import { createOtoyolTollProvider } from "./otoyolTollProvider.js";

function normalizedProvider(value) {
  return String(value || "NONE").trim().toUpperCase();
}

export function createConfiguredExternalReferenceRegistry({ providerKey = ENV.EXTERNAL_REFERENCE_PROVIDER, fetchImpl = fetch } = {}) {
  const selected = normalizedProvider(providerKey);
  const providers = [];
  if (["EPDK", "EPDK_PETROL", "EPDK_LPG"].includes(selected)) {
    providers.push(createEpdkPetrolProvider({ fetchImpl }));
    providers.push(createEpdkLpgProvider({ fetchImpl }));
  }
  if (["EPDK", "EPDK_PETROL"].includes(selected)) {
    providers.push(createEpdkPetrolBulletinProvider());
  }
  if (selected === "KGM_TOLL") providers.push(createKgmTollProvider({ fetchImpl }));
  if (selected === "OTOYOL_A5") providers.push(createOtoyolTollProvider({ fetchImpl }));
  return createProviderRegistry(providers);
}

export function providerKeyForFamily(family, configuredProvider = ENV.EXTERNAL_REFERENCE_PROVIDER) {
  const selected = normalizedProvider(configuredProvider);
  if (["EPDK", "EPDK_PETROL"].includes(selected) && ["FUEL_DIESEL", "FUEL_GASOLINE_95"].includes(String(family || "").toUpperCase())) return "EPDK_PETROL";
  if (["EPDK", "EPDK_LPG"].includes(selected) && String(family || "").toUpperCase() === "FUEL_LPG") return "EPDK_LPG";
  if (selected === "KGM_TOLL" && ["TOLL", "BRIDGE", "TUNNEL"].includes(String(family || "").toUpperCase())) return "KGM_TOLL";
  if (selected === "OTOYOL_A5" && ["TOLL", "BRIDGE"].includes(String(family || "").toUpperCase())) return "OTOYOL_A5";
  return selected === "NONE" ? null : selected;
}
