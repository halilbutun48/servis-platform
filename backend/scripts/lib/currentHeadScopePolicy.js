export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF = [
  {
    path: "backend/src/routes/commercialCoreRoomRoutes.js",
    sha256: "11A0C1B1CDE82470871EBBBD90CEE37F4CAA5C2AD6C25AB7B39586F11CBFDD1F",
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
];

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS =
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map(({ path }) => path);

export const CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF_WITHOUT_COMMERCIAL_CORE_CHILDREN =
  Object.freeze(
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(
      ({ path }) => !path.startsWith("backend/src/routes/commercialCore") || path === "backend/src/routes/commercialCore.js"
    )
  );

export const CURRENT_HEAD_APPROVED_SCHEMA =
  "7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748";
