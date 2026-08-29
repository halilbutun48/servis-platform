import { CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256 } from "./prismaSchemaIdentity.js";

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF = [
  {
    path: "backend/src/routes/commercialCoreRoutes.js",
    sha256: "11A5136CDA54B1467757BF9422EB6B63B0B00F9633CD1A8AF3303A5BA2A06E41",
  },
  {
    path: "backend/src/routes/commercialCorePaymentRoutes.js",
    sha256: "9BB53FE97B17F28892AF3B8C8E91373D7276183873E0258E694AD694F5E1B552",
  },
  {
    path: "backend/src/routes/commercialCorePaymentReportsRoutes.js",
    sha256: "02A327CB70645AA8652E542F5825B271B143AE7A741FC8FBD1CB0C157093FD36",
  },
  {
    path: "backend/src/routes/commercialCoreRoomRoutes.js",
    sha256: "AF4576A429E1B7026974DFC18DB5F9EB034580818A7D32159644878A4E7C94C7",
  },
  {
    path: "backend/src/routes/commercialCoreRouteData.js",
    sha256: "5EB28DD6ABEC1AD63CA236AB567BB14B0CEEF35D54DF75343D5EC746F5A6FCD2",
  },
  {
    path: "backend/src/routes/companyOverview.js",
    sha256: "EB2E7956FD7C02891687815D389AB9E9C5374CAB2FD684E2ADE7CE42C83F8528",
  },
  {
    path: "backend/src/routes/companyBudgetLifecycleRoutes.js",
    sha256: "3D29611FD1D4DE54FA7DE87D6C98D6D7CB034D13776512A792EBD4C139D049EE",
  },
  {
    path: "backend/src/routes/costScenario.js",
    sha256: "C4AB588B2CD9B403F89215FD27700B180340808ACF02054ADC81120C3C48D5CD",
  },
  {
    path: "backend/src/services/financialOperationsLifecycle.js",
    sha256: "0767FB5A163CCB19B06F111FE8B00B2340913E29C613A9DEDA93B2CCAA711FF2",
  },
  {
    path: "backend/Dockerfile",
    sha256: "BC81A199698A5758B51B0EA35A4C9B1C6640E22684E09FC4CD19BC977D21113D",
  },
  {
    path: "backend/scripts/smoke.js",
    sha256: "A6FC4C039803A5A8FFA61BC733FA2B13C51707F1C1B00EF6007EF0326F328C12",
  },
];

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS =
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map(({ path }) => path);

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF_WITHOUT_COMMERCIAL_CORE_CHILDREN =
  Object.freeze(
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(
      ({ path }) => !path.startsWith("backend/src/routes/commercialCore") || path === "backend/src/routes/commercialCore.js"
    )
  );

export const CURRENT_HEAD_APPROVED_SCHEMA = CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256;
