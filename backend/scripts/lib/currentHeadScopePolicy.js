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
    sha256: "CE6B509004F1BCF5F23DFC4754858BB82361B8528C6174FFD9036A648A73258D",
  },
  {
    path: "backend/src/routes/commercialCoreRouteData.js",
    sha256: "5EB28DD6ABEC1AD63CA236AB567BB14B0CEEF35D54DF75343D5EC746F5A6FCD2",
  },
  {
    path: "backend/src/routes/admin.js",
    sha256: "61A3D7CF98653E6E413E787BCBFD9D8DD9AECE77A7663DCA78E9CE446D2C5DA4",
  },
  {
    path: "backend/src/routes/agreements.js",
    sha256: "90CED5678F26B47AE69CE985D6D436B70DF8886B523ECA8988E51BE53ECD2B9A",
  },
  {
    path: "backend/src/routes/auth.js",
    sha256: "A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3",
  },
  {
    path: "backend/src/routes/companyOverview.js",
    sha256: "A06E604912CF323307E4257A4AC8FD116ADF04C1476201EB8C55F44C4C9356BB",
  },
  {
    path: "backend/src/routes/dashboardBulk.js",
    sha256: "C1FA734271C1B3FF73CA3393B781EAF966710A66AD57BC31290B829CFFF5754F",
  },
  {
    path: "backend/src/routes/operationProof.js",
    sha256: "E5F3539A3660E70AF31DAA93203C1F4018ED4FDDF469BB74CDC3D8B73DBCA6E0",
  },
  {
    path: "backend/src/routes/offers.js",
    sha256: "40C553F43D0709D3146D6DA48893B2FDAF9DA3B3814961ECA9C0FD8FA15FF649",
  },
  {
    path: "backend/src/routes/public.js",
    sha256: "5196203AC501B365D52D79D29FA355DF23421180C9337D58EEE3B19707AFFF23",
  },
  {
    path: "backend/src/routes/trustQuality.js",
    sha256: "FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD",
  },
  {
    path: "backend/src/services/dashboardBulk.js",
    sha256: "E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E",
  },
  {
    path: "backend/src/routes/shifts/company.js",
    sha256: "19A7C7C96A86438CDE36345274D8EC8E363C889CABF4C440FE8529DBAA1534A0",
  },
  {
    path: "backend/src/services/companyShiftMutationTail.js",
    sha256: "FE0F1F30AD2F5BC893FF631F26D19EDDDE2060246ED129087104BFDD69D88C78",
  },
  {
    path: "backend/src/services/qualityPaymentBridgeService.js",
    sha256: "935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83",
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
