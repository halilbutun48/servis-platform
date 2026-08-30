import { CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256 } from "./prismaSchemaIdentity.js";

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF = [
  {
    path: "backend/src/routes/commercialCore.js",
    sha256: "14D111ADCF9C3005DACF0D7CE246EEA22109B1D2C4EDC4DA9380F2DA0461265F",
  },
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
    sha256: "CA2B42085F02A2DFEB03ED3992FE47583152EE424FF39DDF73C9699B99D6D2FF",
  },
  {
    path: "backend/src/routes/trustQuality.js",
    sha256: "FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD",
  },
  {
    path: "backend/src/routes/shifts/company.js",
    sha256: "19A7C7C96A86438CDE36345274D8EC8E363C889CABF4C440FE8529DBAA1534A0",
  },
  {
    path: "backend/src/routes/auth.js",
    sha256: "A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3",
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
  {
    path: "backend/src/ai/service.js",
    sha256: "30BC3DAF78FA5B114F6F3653E7039AB7DB777EA8D0B22B494034DC2A3F1AF4F5",
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
