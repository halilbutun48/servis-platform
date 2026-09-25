// Exact PRE-#18 lifecycle classification. This registry records historical/non-authoritative paths and paths deferred to the final no-surprise repository exit. It does not approve either category as current security authority.

const FINAL_EXIT_OWNER = "FINAL_NO_SURPRISE_REPOSITORY_EXIT";

// Exact active current harness/helper identities recovered from the frozen
// PRE-#18 topology and the current-head reconciliation. These are identity
// approvals only; behavioral gate completion is evaluated by their own gates.
export const ACTIVE_CURRENT_HARNESS_ENTRIES = Object.freeze([
  { path: "backend/scripts/run_m0_latest.js", owner: "PRE_18_M0_STATIC_COMPATIBILITY_HISTORICAL_RECONCILIATION_01", sha256: "1CED0FC50E66ED6284D0C27C3D18A074B6ED1493E7319356A240B68EDAF11FE2" },
  { path: "backend/scripts/lib/pre_18_authenticated_role_context.mjs", owner: "PRE_18_FOUNDATION", sha256: "A456E01013C39585395FB45A521CF3DF6412757319FC24FE26C63BFAC9BE9315" },
  { path: "backend/scripts/lib/pre_18_browser_owner_candidates.mjs", owner: "PRE_18_FOUNDATION", sha256: "B65446C4FE24429E45991B387302262AD27CEA1F3CEE826D44A266DB477B8E38" },
  { path: "backend/scripts/lib/pre_18_browser_realistic_fixture.mjs", owner: "PRE_18_FOUNDATION", sha256: "5847B4D93462989F7CFA1A7226C2DF6DFDBED4FCC241D2DBE3C70CBD346CB613" },
  { path: "backend/scripts/lib/pre_18_browser_semantic_descriptor.mjs", owner: "PRE_18_FOUNDATION", sha256: "57535751A8A9394C00DC7DEFA7A5CCA963486F9E1B2A6AF537BAFE5FF77EA3C9" },
  { path: "backend/scripts/lib/pre_18_durable_coverage_completion_inventory.mjs", owner: "PRE_18_FOUNDATION", sha256: "17A7599C560E8EEB7CE4B831097F0B5A0AB14C7A57C53C0BD52888F30A1A30F4" },
  { path: "backend/scripts/lib/pre_18_first_discovery_coverage_harness_core.mjs", owner: "PRE_18_FOUNDATION", sha256: "4294A74FB2B7C425CCF5D2874F03BE9A1D6AC7583C1DF0726655E6955465441E" },
  { path: "backend/scripts/lib/pre_18_harness_topology_provenance_registry.mjs", owner: "PRE_18_FOUNDATION", sha256: "E638DBA60EF4E2FA0D9AD6A42105A8FE45E8E8737EE8B2B73DF4603CA989585A" },
  { path: "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs", owner: "PRE_18_FOUNDATION", sha256: "4EACC50A627182B127868B9DF3313AF66E48DDF390A3B34EF3CA978CE7FE3F86" },
  { path: "backend/scripts/lib/pre_18_native_disclosure_state.mjs", owner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", historicalOwner: "PRE_18_FOUNDATION", sha256: "8B2F78DD9D5CE29A811AE99919801D03F964328E0F7540B586FCBBA1C85235F9" },
  { path: "backend/scripts/lib/pre_18_room_canonical_replay_selection_profile.mjs", owner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", historicalOwner: "PRE_18_ROOM", sha256: "E4858F1E63AACE8BB56E07CCB4610068C22AB7046521E6A8F465E88D7CC8B01A" },
  { path: "backend/scripts/lib/pre_18_room_prehit_246_migration_v1.mjs", owner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", historicalOwner: "PRE_18_ROOM", sha256: "7707E4132DE1B28A6D0627D0B8417C7750A11E57C66D1E46B5642EB5CDCD88E7" },
  { path: "backend/scripts/lib/pre_18_room_residual195_accounting_v1.mjs", owner: "PRE_18_ROOM", sha256: "8B084DE9BE3AEEBE03BE01E6DC24363241320DFD4BD30D62FC87661CFAE072CA" },
  { path: "backend/scripts/lib/pre_18_room_root_hit190_durable_closure_recovery.mjs", owner: "PRE_18_ROOM", sha256: "A1D2E143F608C4C1B78FC3EF6934FA196CE378A259AC7396D744FEBC1104947E" },
  { path: "backend/scripts/lib/pre_18_room_root_hit190_lineage.mjs", owner: "PRE_18_ROOM", sha256: "471A3FD361C2FAB220C194387E8E7910613CBF857CA0CEE39912671A9DD1892F" },
  { path: "backend/scripts/lib/pre_18_room_route99_canary_contract.mjs", owner: "PRE_18_ROOM", sha256: "75F82D5EC0B2CB16B15FB8CFE9361B9DFF41EC536A2C6E3F88E44DE7EFCEE783" },
  { path: "backend/scripts/lib/pre_18_room_true_open54_replay_contract.mjs", owner: "PRE_18_ROOM", sha256: "40754D64CAEBE835C9D241CBF634D7579D3FC61B2F1FCFF223BD16E090BE45A4" },
  { path: "backend/scripts/lib/pre_18_room_true_open72_selection_reconciliation.mjs", owner: "PRE_18_ROOM", sha256: "04A7561D59C8D2E29EA979679417689DC3F2B125505F63C34DFB15FCB1E684D7" },
  { path: "backend/scripts/lib/pre_18_room_worker_pool.mjs", owner: "PRE_18_ROOM", sha256: "8BEBF499839A23E599423387DD6477884F0D2C7BCF5049066490756382F6D6FA" },
  { path: "backend/scripts/lib/pre_18_shared_browser_lifecycle.mjs", owner: "PRE_18_FOUNDATION", sha256: "8050E4B658F0307D20EBCA5B2C776F8635B7DE3C617924DBFF68A90E9512D457" },
  { path: "backend/scripts/lib/pre_18_superadmin_26_contract_migration_v1.mjs", owner: "PRE_18_SUPERADMIN", sha256: "31CD35D829DACEE35D802B5FA350F87F978BC0D077444C20FA38656FED8E1746" },
  { path: "backend/scripts/pre_18_luna001_clean_lifecycle_oracle.mjs", owner: "PRE_18_FOUNDATION", sha256: "0732B85F91DAA0D3389A10E876545C40D7276352AAAA6AB9D9F44AD727B8C07C" },
  { path: "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs", owner: "PRE_18_ROOM_OTHER423_PENDING_REQUEST_FINAL_RESIDUAL_CLOSURE_01", historicalOwner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", sha256: "9E1D071209BB1488D9CA9473C5FDEB60F34916CE4B64D1D95F8F598C3FF2FCAF" },
  { path: "backend/scripts/pre_18_harness_cal01_state_recipe_scoped_identity_check.mjs", owner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", historicalOwner: "PRE_18_FOUNDATION", sha256: "DC7565F981B420DC95C1CF3CE03E00C977102AC08937D8473562591007C6D71D" },
  { path: "backend/scripts/pre_18_superadmin_c35_native_details_check.mjs", owner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", historicalOwner: "PRE_18_SUPERADMIN", sha256: "FBFB6958076CF2380795D1E26F6F69317F7897F3119881176EE1338794926247" },
  { path: "backend/scripts/pre_18_room_shifts_route_readiness_check.mjs", owner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", historicalOwner: "PRE_18_ROOM", sha256: "A6B270CBF1BE54A6E4A9707C00D3C34E2519891794272FA8B22D1350966A6775" },
  { path: "backend/scripts/m44_telematics_check.js", owner: "PRE_18_ROOM_OTHER423_TELEMATICS_GPS_AND_ROOM_ROLE_CLOSURE_01", historicalOwner: "M44_TELEMATICS", sha256: "65CF242DC40A06759E32EFA985FC9875A9857FCEAF2164FAF17600DD123E9C9A" },
  { path: "backend/scripts/pre_18_room_exact36_acceptance_cli.mjs", owner: "PRE_18_ROOM", sha256: "183B53D1B2C52F59E6B9C85BD48C587581229FF48C487B3C997D49C43F0DF098" },
  { path: "backend/scripts/pre_18_room_root_hit190_durable_closure_recovery.mjs", owner: "PRE_18_ROOM", sha256: "158263E228F7205ED8C934AB8C4918249008803EDF64C8603A6BF0E3E28A899D" },
  { path: "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs", owner: "PRE_18_ROOM", sha256: "8693BE18D9BF8FDE1BE307CCC5EBC7DE8E0CE875308CB48CD05A7A1EE15EA74B" },
  { path: "backend/scripts/pre_18_round_10_conversation_routing_browser.mjs", owner: "PRE_18_FOUNDATION", sha256: "22FB4211A4A534AC6AD9557E07A94C45139F40F043CE1255154DA78F865FDBDE" },
  { path: "backend/scripts/pre_18_round_11_deterministic_conversation_browser.mjs", owner: "PRE_18_FOUNDATION", sha256: "A7CE0CCB8FF5CD1757096486A61A1B6427AF33DEC1FF8B678B2D599F8540D34D" },
  { path: "backend/scripts/pre_18_round_12_canonical_authorization_browser.mjs", owner: "PRE_18_FOUNDATION", sha256: "E6F72E9058CEDF1826A09D5EFA3E0225BF10FF07BA95A6CD828FBF25D234FE37" },
  { path: "backend/scripts/pre_18_round_7_query_plan_browser.mjs", owner: "PRE_18_FOUNDATION", sha256: "F943E290E7E073376B0EAFF6113BD425E345140D3E137220D0FBF0DCB79C1051" },
  { path: "backend/scripts/pre_18_round_9_final_execution_browser.mjs", owner: "PRE_18_FOUNDATION", sha256: "6C7EE2373B7E995828BFCAA008D4CF1F3E94D514606E1ABED19E1E0C5AF74E9B" },
  { path: "backend/scripts/pre_18_sol_owner_architecture_bounded_corrective_check.mjs", owner: "PRE_18_FOUNDATION", sha256: "4058EB7BD7F14A6B4C0CC44350D26CBC35C029BB05218C331926732D0BB3FADF" },
  { path: "backend/scripts/pre_18_topo_01_topo_04_provenance_foundation.mjs", owner: "PRE_18_FOUNDATION", sha256: "6685BB6FF3E9698A553657156AF3BD5FF990C79FABA727687012E1FE246D2C35" },
  { path: "backend/scripts/pre_18_topo_02_shared_browser_lifecycle_check.mjs", owner: "PRE_18_FOUNDATION", sha256: "FCBE03BFCE09AF85CD3324B78AC9779E3A86681C2BD8754E108C6A9E62AF08B1" },
  { path: "backend/scripts/pre_18_agreement_wizard_deterministic_state_acceptance_01.mjs", owner: "PRE_18_FINAL_FIVE_UNOWNED_HARNESS_CHECKER_CLOSURE_01", historicalOwner: "UNKNOWN_NOT_RECOVERABLE", sha256: "E01914D63AF2EE123375A17D9C7C2DDA0973847AEA0E173DCDC41CE04AC81950" },
  { path: "backend/scripts/pre_18_browser_presentation_residual_batch_acceptance_01.mjs", owner: "PRE_18_FINAL_FIVE_UNOWNED_HARNESS_CHECKER_CLOSURE_01", historicalOwner: "UNKNOWN_NOT_RECOVERABLE", sha256: "DBE6D86F777DDDCA8183C0F264A93A490FA7D67DE3686365F94D3945709B3002" },
]);
export const ACTIVE_CURRENT_HARNESS_PATHS = Object.freeze(ACTIVE_CURRENT_HARNESS_ENTRIES.map(({ path }) => path));
const activeHarnessByPath = new Map(ACTIVE_CURRENT_HARNESS_ENTRIES.map((entry) => [entry.path, entry]));

export function getActiveCurrentHarnessEntry(value) {
  const normalized = String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").trim();
  return activeHarnessByPath.get(normalized) || null;
}

// The previously ratified current-head identities retain explicit semantic
// categories so the security gates do not collapse source, harness and
// durable-checker ownership into one label.
export const ACTIVE_CURRENT_SOURCE_PATHS = Object.freeze([
  "web/src/panels/shared/CostScenarioWorkspacePanel.jsx",
  "backend/src/ai/chat/conversationTaskStateDynamicQuestions.js",
  "web/src/components/map/ReadableMiniRouteMap.jsx",
]);
// Product-source identities recovered from exact current documentation and
// checks. These are active source approvals; the behavioral gate remains the
// owning check's responsibility.
export const CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES = Object.freeze([
  {
    path: "backend/src/ai/chat/canonicalConversationState.js",
    owner: "PRE_18_BACKEND_SECURITY_CONTEXT_ACCEPTANCE",
    sha256: "4AA67996BD7A5F956C767C406929E243279A83BAC75DE9B509959E76877A20E2",
  },
  {
    path: "backend/src/ai/chat/conversationTaskStateDynamicQuestions.js",
    owner: "COPILOT_DYNAMIC_QUESTION_ENGINE_01",
    sha256: "1E534ABB11B9D7A31A0293E32A556F86CB3F07BA2785A60A796CD310647E7556",
  },
  {
    path: "backend/src/services/actionableEvents.js",
    owner: "PRE_18_SEFER_ABI_ACTIONABLE_EVENTS_BACKEND_CONTEXT_ACCEPTANCE",
    sha256: "0809B33DA5E3FA2F1F0B7240764F9773AB4E670A02CFAAE86E2E8019A4A79853",
  },
  {
    path: "web/src/components/CollapsibleSection.jsx",
    owner: "UX_COLLAPSIBLE_PANELS_01",
    sha256: "4D8DD2BAC0BF931650C1BD3A093086B8906818607542C6D8F5E4643D5D6490FB",
  },
  {
    path: "web/src/components/map/ReadableMiniRouteMap.jsx",
    owner: "UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01",
    sha256: "4450A81C7A710D558E78D61469745B9CD28789BB4ABC04E6A4E96D3FC6EB0097",
  },
  {
    path: "web/src/utils/displayStatus.js",
    owner: "PROJECT_WIDE_TURKISH_LANGUAGE_TERMINOLOGY_AUDIT_01",
    sha256: "DB0EE1A4D57EC9F7A9F6194C9495B470A65146536335E47A5F9BF9034B39C0AF",
  },
  {
    path: "web/src/utils/roleNavigation.js",
    owner: "ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01",
    sha256: "37E838A9F962F17C768151F8D8D74B2B99556E6AABAF0953C2B99615117C5397",
  },
  {
    path: "web/src/utils/terminology.js",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    sha256: "B34B51C6F2A55BBDEADDF3286C1CCFDFF8138EC5AE519286649B73AB8AFAC069",
  },
  {
    path: "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
    owner: "PRE_18_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE",
    sha256: "AE7599896A005DD25E0B4D8D26ABC75BE1C793612B66BFB815EE20E3C83A603E",
  },
  {
    path: "backend/src/services/queryPlanExecutor.js",
    owner: "PRE_18_RESIDUAL_TERRA_FOCUS",
    sha256: "34F65FD7F3971C60E47A7BF4F9963F9EB40243AE77E045B89CAD0B9B008158AA",
  },
  {
    path: "web/src/components/CommercialReadonlySummary.jsx",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "1221F9611BE0C14CA19AE3D83302BDDC1B5832CEBB9F1FE8AD61CF9D31822BB0",
  },
  {
    path: "web/src/components/OperationsCommandCenter.jsx",
    owner: "ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01",
    sha256: "D5F1181D8414BC49BF700A7688FAFD9FBE74539F78A16FB67BDCBEFA24088961",
  },
  {
    path: "web/src/components/map/MapView.jsx",
    owner: "UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01",
    sha256: "DFD648AC0D68FC40DA11FD1FE60D3969D1DFE05C811B4504B0E48B052D293311",
  },
  {
    path: "web/src/panels/company/PassengerLinksPanel.jsx",
    owner: "M103_PERSONEL_PUBLIC_LINK_FIX",
    sha256: "A80115478963A14CC95AE20821E008E3E158F45D80122408EF20491AEDA3C844",
  },
  {
    path: "web/src/utils/dashboardBulk.js",
    owner: "DASHBOARD-BULK-ENDPOINT-01",
    sha256: "73856CA9042F631909914290F28BEFCFD9538DCFEBFEF2D10987773F3F48E175",
  },
  {
    path: "backend/src/ai/chat/authorizationGate.js",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "8556F409BA3C4835CBB8043396A88BFD14DA905DEBACA2694F94E5D138F0E82B",
  },
  {
    path: "backend/src/ai/chat/fieldPrivacyPolicy.js",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "EF87634FBA829AF4C0CEB84AEE9A338C4B629B3158BF20504F06A403849D68A0",
  },
  {
    path: "backend/src/ai/chat/userFacingLanguageNormalizer.js",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "C9B1161D0EFD2474CDFD3416230826AF0ACEA820D4EA762ADF54029D13CAECB4",
  },
  {
    path: "backend/src/ai/schemas.js",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "D85A8A6DC4BA320AF5D7EE67DFC78A4282C93BE73CB982415AA0F72DB5D49895",
  },
  {
    path: "backend/src/services/authorizedProductAwareness.js",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "154CB640CC7634D04209E77F1392A98350A60A901396041F3C8505C49612E4C7",
  },
  {
    path: "web/src/components/geo/GeoLocationPicker.jsx",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "F009CD05537C062E4151BE4E439BE8CAE501F2C78BD3A963198A699020DFD569",
  },
  {
    path: "web/src/components/geo/HubMapPicker.jsx",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "E5A6E4EEF74785594E8DDCAD2F35C174A106CADABDBCD6164D807033FEEBC310",
  },
  {
    path: "web/src/panels/shared/CommercialShiftCardPresentation.jsx",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "28E28A317E689BF960F99F67561727E35A2E6EA76E851551FD0525668B41034E",
  },
  {
    path: "web/src/panels/shared/QualityPaymentBridgePreviewCard.jsx",
    owner: "PRE_18_FINAL_PRECOMMIT_RUNTIME_AND_TEMP_ARTIFACT_RESIDUAL_CLOSURE_01",
    sha256: "404B091C5A6AAB47CFE4F1AD4AEF5DECCAF0C12C514CD3DC66B30D146AACAFBF",
  },
  {
    path: "web/src/panels/shared/SeferScorePreviewCard.jsx",
    owner: "PRE_18_FINAL_PRECOMMIT_RUNTIME_AND_TEMP_ARTIFACT_RESIDUAL_CLOSURE_01",
    sha256: "970F0896A33F7440F73E5B4E9A1FF2866D10C2E28C61F0D51CD60C5FE1B1D37A",
  },
  {
    path: "web/src/utils/copilotSelection.js",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "0F40C84BA2210176488BF475D6073C3D5E4713556ADFE12A2FB5BB54ABFDA38B",
  },
  {
    path: "web/vite.config.js",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    sha256: "D6525E52EB61C4034A9C17F82537E2D127C95B017DDCB4ACE46B4E6029695A73",
  },
  {
    path: "backend/src/ai/chat/helpComposer.js",
    owner: "PRE_18_FINAL_VERIFY_FOUNDATION_TRIPLE_RESIDUAL_CLOSURE_01",
    sha256: "7B031F1F19FE4A652A614113720E2D80F6AE1B3784AE619C213854596988B401",
  },
  {
    path: "backend/src/ai/chat/qualityScorer.js",
    owner: "PRE_18_M79_COPILOT_FOUNDATION_RESIDUAL_BOUNDED_CLOSURE_01",
    sha256: "66FB8093028BF514A77DDA5BFF96FA25630BF44DC12669E56741D501422FED25",
  },
  {
    path: "backend/src/ai/chat/answerQualityPolicy.js",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "36D52ED29D7852A43304B2EDF2F3C39FD52B853BFB399E45870E786AB51E5978",
  },
  {
    path: "backend/src/ai/chat/helpComposerSafeReplies.js",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "70ACFCBA3274BBC9EBEC051D031A8E4EB12E1E3BDF26DA6941C07F6D2FBF162D",
  },
  {
    path: "backend/src/ops/paymentPreview.js",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "8D322E63283DB77938509614FA2A9FA5CC872C5923E025FB6915511C3C6DA895",
  },
  {
    path: "backend/src/ops/qualityDraftScore.js",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "53B1E562C522DCCA8C717694AC33F95D4746A19DE48260E3028507BCD3BD936C",
  },
  {
    path: "backend/src/ops/qualityReviewDecision.js",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "40B2FB9EE9A01C0FDEEC471B05D71096453FFCD463F225428CF7B33E7FB63474",
  },
  {
    path: "web/src/components/QualityDraftScoreCard.jsx",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "844FA4BA2429479F1AE6A1A77DF5C12F8D39BC27DC8B9190ED172E2AAFF26B11",
  },
  {
    path: "web/src/components/QualityReviewDecisionCard.jsx",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "7FD353152FA420B26DE7AAA2A4303B2BC511512C46EB512D6161BD11D5CC0AFF",
  },
  {
    path: "web/src/components/QualityReviewHistoryCard.jsx",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "823D0BCC7961857F4C05D8C6C2D07FA6B6B84BEEA622D4F761D8B35E969789C0",
  },
  {
    path: "web/src/components/SystemModeSummaryBand.jsx",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    sha256: "2303937B4284A9BE7C87A11092D2AE3875A92256AB0D11DE1BD8588062DD7A94",
  },
  {
    path: "backend/src/services/agreementSourceLineageService.js",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    sha256: "6B411A750AF66EC684D42D33D2771371840DEEC09F931500341D33F8A361C511",
  },
  {
    path: "web/src/panels/company/AgreementsPanel.jsx",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    sha256: "E81DA02562A4D983A8506005F7E77EA81B8579F84FE1088A77954C2ABF2EEC5B",
  },
  {
    path: "web/src/panels/shared/PlatformFeePreviewCard.jsx",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    sha256: "D0C49F429699B76777B9E73C73842155EDAA6F3E108FCD9E3976D3EEA88D48C6",
  },
  {
    path: "web/src/utils/agreementCopilotFacts.js",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    sha256: "FBC8EB3C31DAA29BF5546C6F3D6F6C2FFF8BC497C9E7B76DB8F31FE1BE4918B3",
  },
  {
    path: "web/src/panels/room/roomShiftsPanelSections.jsx",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    sha256: "F91EE19E52853798D49400E7EFCE9061992C6DA4CD7F6C01DD9ED2ED1C859547",
  },
]);
const currentClosureProductSourceByPath = new Map(CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES.map((entry) => [entry.path, entry]));
export const RATIFIED_CURRENT_HARNESS_PATHS = Object.freeze([
  "backend/scripts/pre_18_premium_ui_polish_01_browser.mjs",
  "backend/scripts/pre_18_premium_ui_polish_01_check.js",
]);
export const DURABLE_CURRENT_CHECKER_PATHS = Object.freeze([
  "backend/scripts/lib/canonicalProvenanceRegistry.js",
  "backend/scripts/lib/presentationProvenanceAuthority.js",
  "backend/scripts/pre_18_presentation_provenance_authority_01_check.mjs",
  "backend/scripts/pre_18_agreement_wizard_unreachable_defensive_branch_check.mjs",
  "backend/scripts/pre_18_final_two_presentation_residual_reachability_01.mjs",
  "backend/scripts/pre_18_backend_security_context_acceptance_check.mjs",
  "backend/scripts/pre_18_semantic_reasoning_source_identity_acceptance_check.mjs",
  "backend/scripts/pre_18_semantic_priority_acceptance_check.mjs",
  "backend/scripts/pre_18_operation_health_profile_precedence_acceptance_check.mjs",
  "backend/scripts/pre_18_harness_gate_policy_projection_check.mjs",
  "backend/scripts/pre_18_screen_context_authority_acceptance_check.mjs",
  "backend/scripts/pre_18_semantic_gate_scope_calibration_check.mjs",
  "backend/scripts/pre_18_panelchrome_source_identity_acceptance_check.mjs",
  "backend/scripts/pre_18_generic_product_help_safety_acceptance_check.mjs",
  "backend/scripts/pre_18_package_b_v2_semantic_ownership_acceptance_check.mjs",
  "backend/scripts/pre_18_package_c1_v3_start_readiness_remap_acceptance_check.mjs",
  "backend/scripts/pre_18_package_c2_semantic_contract_acceptance_check.mjs",
  "backend/scripts/pre_18_package_c3_v2_plan_review_acceptance_check.mjs",
]);

// These three checker identities were recovered from exact PRE-#18 package
// provenance plus their current self-checks. They are active checker
// identities only; their behavioral results remain governed by their own
// acceptance gates.
export const RECOVERED_DURABLE_CHECKER_ENTRIES = Object.freeze([
  {
    path: "backend/scripts/lib/pre_18_matrix_root_cluster_report.mjs",
    owner: "PRE_18_PRESENTATION_RESIDUAL_CLUSTER_AND_BATCH_RATIFICATION_01",
    sha256: "DCFFFACD60CBF21DDE101E4E150AFEA7A9913FC7631DFCCC0C7650815F6AC90C",
  },
  {
    path: "backend/scripts/pre_18_matrix_root_cluster_reporting_check.mjs",
    owner: "PRE_18_PRESENTATION_RESIDUAL_CLUSTER_AND_BATCH_RATIFICATION_01",
    sha256: "D0AE4922750235CDA667E8AA5FE1E2E4F3C8DED839F55874E50A1A3D3B63AF5E",
  },
  {
    path: "backend/scripts/pre_18_deterministic_presentation_residual_batch_closure_01.mjs",
    owner: "PRE_18_DETERMINISTIC_PRESENTATION_RESIDUAL_BATCH_CLOSURE_01",
    sha256: "B73CCA55AC2A15CD291C20F03EC3AA9E7804B2C8029D3E5EA5ACDD1419DAE600",
  },
]);
export const RECOVERED_DURABLE_CHECKER_PATHS = Object.freeze(RECOVERED_DURABLE_CHECKER_ENTRIES.map(({ path }) => path));
const recoveredDurableCheckerByPath = new Map(RECOVERED_DURABLE_CHECKER_ENTRIES.map((entry) => [entry.path, entry]));

// Current-state checker adoption. Historical ownership was not recoverable;
// this package records only the validated current acceptance owner.
export const CURRENT_CLOSURE_DURABLE_CHECKER_ENTRIES = Object.freeze([
  {
    path: "backend/scripts/pre_18_final_category_b_product_acceptance_closure_02.mjs",
    owner: "PRE_18_FINAL_CATEGORY_B_PRODUCT_ACCEPTANCE_CLOSURE_02",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "E83C81569116D09A4ABA9D7BEBBD48301768F2A7E3BC8506C81CB223313B9962",
  },
  {
    path: "backend/scripts/m82_11_payment_readonly_surface_check.js",
    owner: "PRE_18_FINAL_CATEGORY_B_PRODUCT_ACCEPTANCE_CLOSURE_02",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "1A534E8B3FB5414FDF08AAC664765E2F7BC8710895A4D51ECB33BBD3B8C80526",
  },
  {
    path: "backend/scripts/m79_a2_copilot_intent_quality_check.js",
    owner: "PRE_18_FINAL_FIVE_UNOWNED_HARNESS_CHECKER_CLOSURE_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "38C7ADDAF74FA1B3FED682B9393C78FB3EEED11BFD7F0E6FBA5220B0D8D8E147",
  },
  {
    path: "backend/scripts/m79_c3_copilot_real_user_phrasing_check.js",
    owner: "PRE_18_FINAL_FIVE_UNOWNED_HARNESS_CHECKER_CLOSURE_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "8897B1EEA5DC6F295D0D5F919980916838D4996EFE4E5A96BCA5A35123AA2D00",
  },
  {
    path: "backend/scripts/semantic_intent_adversarial_check.js",
    owner: "PRE_18_FINAL_FIVE_UNOWNED_HARNESS_CHECKER_CLOSURE_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "BAD8B39053FA8127A0170612C12912CE10785262423C4240080A3E19DE3559FC",
  },
  {
    path: "backend/scripts/pre_18_final_category_c_product_source_acceptance_closure_01.mjs",
    owner: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "38F43D36BB75B7ABF6D6C632D72710F023548C5005C9409AE196DA175A7F4CAD",
  },
  {
    path: "backend/scripts/ux_company_panels_final_polish_01_check.js",
    owner: "PRE_18_COMPANY_ROLE_FINAL_ACCEPTANCE_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "9CCEAA71F1AC2F62A8C386CB593B015EE4CF0EBF76683A9E758FE9EDA04D83AA",
  },
  {
    path: "backend/scripts/m79_d1_copilot_acceptance_pack.js",
    owner: "PRE_18_M79_COPILOT_FOUNDATION_RESIDUAL_BOUNDED_CLOSURE_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "B25C78B06BBE42DA6F0F336CB857AF0F4E627897A5C9308C18E582A355401E5B",
  },
  {
    path: "backend/scripts/qlt_04_quality_review_history_check.js",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "72811B0A3B25073109627B880FF9A8D8F637BC85144FE42DC4E045DFB1B0F2AB",
  },
  {
    path: "backend/scripts/qlt_04b_compact_signal_list_check.js",
    owner: "PRE_18_LEGACY_COMMISSION_AND_COMMERCIAL_RESIDUE_ZERO_CHECK_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "7B9F3210D27A0B975A7DDF01FA064ED113A126A7161372F1B27BAF3D5FEB6C25",
  },
  {
    path: "backend/scripts/project_wide_turkish_language_terminology_audit_01_check.js",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "9A01791F3E5D92CC1AB84157DA24993FB603815D0BA3841D3F00A949A384E094",
  },
  {
    path: "backend/scripts/project_wide_turkish_language_terminology_audit_01_browser.mjs",
    owner: "PRE_18_POST_TERMINOLOGY_PRODUCT_FLOW_EVIDENCE_REGEN_01",
    historicalOwner: "UNKNOWN_NOT_RECOVERABLE",
    sha256: "F088256D7F3D61301DD5FC432596E8B6541B7FDD9A373AAC58B4C5184713E0C8",
  },
]);
export const CURRENT_CLOSURE_DURABLE_CHECKER_PATHS = Object.freeze(CURRENT_CLOSURE_DURABLE_CHECKER_ENTRIES.map(({ path }) => path));
const currentClosureDurableCheckerByPath = new Map(CURRENT_CLOSURE_DURABLE_CHECKER_ENTRIES.map((entry) => [entry.path, entry]));

// The package-delta gate and its machine-readable contract are current
// durable checker infrastructure owned by the package that installed them.
export const CURRENT_PACKAGE_DURABLE_CHECKER_ENTRIES = Object.freeze([
  {
    path: "backend/scripts/package_ownership_delta_01_check.js",
    owner: "PRE_18_VERIFY_CHAIN_PACKAGE_OWNERSHIP_DELTA_GATE_01",
    sha256: "C9B2EC18C9E1EAE2C55EB710B11E8154A7C732A21C17DD54A7C38EE2850BB752",
  },
  {
    path: "backend/scripts/lib/packageOwnershipDeltaManifest.json",
    owner: "PRE_18_VERIFY_CHAIN_PACKAGE_OWNERSHIP_DELTA_GATE_01",
    sha256: "CONTRACT_SELF",
    identityMode: "CONTRACT_SELF",
  },
]);
export const CURRENT_PACKAGE_DURABLE_CHECKER_PATHS = Object.freeze(CURRENT_PACKAGE_DURABLE_CHECKER_ENTRIES.map(({ path }) => path));
const currentPackageDurableCheckerByPath = new Map(CURRENT_PACKAGE_DURABLE_CHECKER_ENTRIES.map((entry) => [entry.path, entry]));

// Exact residual current changes for which no owner/acceptance combination
// was recovered. Keeping this list explicit preserves the blocker instead of
// turning unknown status into a blanket allowance.
export const ACTIVE_UNOWNED_CURRENT_CHANGE_PATHS = Object.freeze([]);
const unownedSet = new Set(ACTIVE_UNOWNED_CURRENT_CHANGE_PATHS);

export const HISTORICAL_NONAUTHORITATIVE_RECORDS = Object.freeze([
  {
    "path": "backend/scripts/pre_18_bounded_clean_audit_terra_final_path_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_durable_coverage_completion_inventory_canary.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_durable_coverage_completion_inventory_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_final_attention_assessment_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_final_frozen_reasoning_corrective_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_final_scope_precedence_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_final_three_context_scope_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_final_two_regressions_micro_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_first_discovery_coverage_harness_canary.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_first_discovery_coverage_harness_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_fve001_mobile_launcher_contract_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_general_creative_required_term_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_harness_cal01_no_global_ambient_tab_authority_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_harness_cal01_tab_identity_suffix_boundary_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_harness_cal02_single_descriptor_binding_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_harness_cal03_machine_normalization_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_harness_cal04_browser_realistic_fixture_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_human_review_round_1_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_human_review_round_2_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_hybrid_owner_context_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_hybrid_surface_state_executor_canary.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_hybrid_surface_state_executor_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_luna_completion_partial_report.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_luna_coverage_ia_addendum_matrix.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_luna_first_discovery_coverage_completion.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_luna_visual_contact_sheets.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_luna002_003_service_path_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_luna003_adjacent_final_path_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_blocker_harness_diagnostic_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_consolidated_corrective_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_explicit_task_precedence_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_final_freshness_targeted_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_final_ledger_targeted_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_micro_closure_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_remaining_two_targeted_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_render_assertion_diagnostic_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_security_adjacent_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_security_scope_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package1_targeted_intent_corrective_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package2_consolidated_corrective_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_package3_semantic_invariance_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_premium_ux_live_defect_corrective_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_premium_ux_suggestions_accordion_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_residual_terra_focus_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_room_auth_route_layer_separation_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_authenticated_context_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_exact36_auth_readiness_origin_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_exact36_canonical_executable_entrypoint_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_exact36_reset_network_lifecycle_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_exact36_reset_operation_lifecycle_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_exact36_two_root_lifecycle_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_other423_batch01_profile_materialization_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_prehit_246_migration_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_replay_parity_diagnostic_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_residual195_dry_run_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_residual195_dual_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_residual195_four_root_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_canonical_replay_prep_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_durable_closure_recovery_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_final_financial_structural_token_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_final_financial_telemetry_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_lineage_readiness_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_lineage_readiness.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_remaining10_state_recipe_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_remaining4_architectural_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_remaining4_bounded_entrypoint_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_remaining4_final_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_remaining4_proven3_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_remaining7_canary_entrypoint_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_root_hit190_remaining7_proven6_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_route99_residual_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_terminal_summary_binding_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_true_open54_canonical_replay_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_true_open54_preaction_geometry_classification_corrective_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_true_open54_replay_cli.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_true_open72_selection_reconciliation_check.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_room_true_open72_selection_reconciliation.mjs",
    "originalOwner": "PRE_18_ROOM"
  },
  {
    "path": "backend/scripts/pre_18_round_12_acceptance_completion_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_12_final_recheck_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_12_patch_recheck_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_13_current_state_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_13_root_cause_probe.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_13_semantic_probe.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_14_auth_session_diagnostic_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_14_health_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_14_next_action_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_14_responsive_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_14_room_lifecycle_matrix_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_14_room_selected_offer_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_round_14_short_clean_confirmation_browser.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  },
  {
    "path": "backend/scripts/pre_18_superadmin_26_contract_migration_check.mjs",
    "originalOwner": "PRE_18_SUPERADMIN"
  },
  {
    "path": "backend/scripts/pre_18_superadmin_checkpoint_evidence_recovery.mjs",
    "originalOwner": "PRE_18_SUPERADMIN"
  },
  {
    "path": "backend/scripts/pre_18_superadmin_checkpoint_root_owner_canary.mjs",
    "originalOwner": "PRE_18_SUPERADMIN"
  },
  {
    "path": "backend/scripts/pre_18_superadmin_checkpoint_root_owner_check.mjs",
    "originalOwner": "PRE_18_SUPERADMIN"
  },
  {
    "path": "backend/scripts/pre_18_superadmin_dynamic_state_relocation_canary.mjs",
    "originalOwner": "PRE_18_SUPERADMIN"
  },
  {
    "path": "backend/scripts/pre_18_superadmin_final_17_dry_run_check.mjs",
    "originalOwner": "PRE_18_SUPERADMIN"
  },
  {
    "path": "backend/scripts/pre_18_superadmin_owner_context_canary.mjs",
    "originalOwner": "PRE_18_SUPERADMIN"
  },
  {
    "path": "backend/scripts/pre_18_topo_01_topo_04_provenance_foundation_check.mjs",
    "originalOwner": "PRE_18_FOUNDATION"
  }
]);
export const HISTORICAL_NONAUTHORITATIVE_PATHS = Object.freeze(HISTORICAL_NONAUTHORITATIVE_RECORDS.map(({ path }) => path));
export const LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_PATHS = Object.freeze([
  "backend/artifacts/harness-topology/",
  "consolidated-security-targeted-report.json",
  "docs/PRE_18_ROUND_12_FINAL_LEDGER.md",
  "docs/PRE_18_ROUND_13_FINAL_LEDGER.md",
  "explicit-task-precedence-report-detail.json",
  "explicit-task-precedence-report-final.json",
  "explicit-task-precedence-report.json",
  "package1-blocker-harness-diagnostic-report.json",
  "package1-consolidated-corrective-report.json",
  "package1-final-freshness-targeted-report.json",
  "package1-final-ledger-targeted-report.json",
  "package1-independent-defect-harvest-report.json",
  "package1-priority-with-reason-targeted-report.json",
  "package1-remaining-two-targeted-report.json",
  "package1-render-assertion-company-report.json",
  "package1-render-assertion-diagnostic-report.json",
  "package1-render-assertion-personel-report.json",
  "package1-targeted-intent-corrective-report.json",
  "package2-consolidated-corrective-report-rerun.json",
  "package2-consolidated-corrective-report.json",
  "package2-pkg2-003-selected-record-evidence.json",
  "package2-run.err.log",
  "package2-run.out.log",
  "security-adjacent-report-final.json",
  "security-adjacent-report-rerun.json",
  "security-adjacent-report.json",
  "security-scope-report-clean.json"
]);
export const LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_OWNER = FINAL_EXIT_OWNER;
export const FINAL_REPO_EXIT_COVERAGE_PRESERVED = true;

const historicalSet = new Set(HISTORICAL_NONAUTHORITATIVE_PATHS);
const deferredSet = new Set(LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_PATHS);

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

export function classifyLifecyclePath(value) {
  const path = normalizePath(value);
  const currentClosureSource = currentClosureProductSourceByPath.get(path);
  if (currentClosureSource) {
    return {
      category: "ACTIVE_CURRENT_SOURCE",
      path,
      owner: currentClosureSource.owner,
      sha256: currentClosureSource.sha256,
      currentAuthority: "ACTIVE_CURRENT_SOURCE",
    };
  }
  const recoveredChecker = recoveredDurableCheckerByPath.get(path);
  if (recoveredChecker) {
    return {
      category: "DURABLE_CURRENT_CHECKER",
      path,
      owner: recoveredChecker.owner,
      sha256: recoveredChecker.sha256,
      currentAuthority: "ACTIVE_CURRENT_CHECKER",
    };
  }
  const currentClosureChecker = currentClosureDurableCheckerByPath.get(path);
  if (currentClosureChecker) {
    return {
      category: "DURABLE_CURRENT_CHECKER",
      path,
      owner: currentClosureChecker.owner,
      sha256: currentClosureChecker.sha256,
      currentAuthority: "ACTIVE_CURRENT_CHECKER",
    };
  }
  const currentPackageChecker = currentPackageDurableCheckerByPath.get(path);
  if (currentPackageChecker) {
    return {
      category: "DURABLE_CURRENT_CHECKER",
      path,
      owner: currentPackageChecker.owner,
      sha256: currentPackageChecker.sha256,
      identityMode: currentPackageChecker.identityMode || "NORMALIZED_TEXT_SHA256",
      currentAuthority: "ACTIVE_CURRENT_CHECKER",
    };
  }
  const currentHarness = activeHarnessByPath.get(path);
  if (currentHarness) {
    return {
      category: "ACTIVE_CURRENT_HARNESS",
      path,
      owner: currentHarness.owner,
      sha256: currentHarness.sha256,
      currentAuthority: "ACTIVE_CURRENT_HARNESS",
    };
  }
  if (unownedSet.has(path)) {
    return { category: "UNOWNED_CURRENT_CHANGE", path, futureOwner: null, currentAuthority: "UNRESOLVED" };
  }
  if (historicalSet.has(path)) {
    const record = HISTORICAL_NONAUTHORITATIVE_RECORDS.find((entry) => entry.path === path);
    return { category: "HISTORICAL_NONAUTHORITATIVE", path, originalOwner: record?.originalOwner || "UNKNOWN", futureOwner: FINAL_EXIT_OWNER, currentAuthority: "NONE" };
  }
  if (deferredSet.has(path)) {
    return { category: "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT", path, futureOwner: FINAL_EXIT_OWNER, currentAuthority: "NONE" };
  }
  return null;
}

export function assertLifecycleClassificationIntegrity(activePaths = []) {
  const lifecyclePaths = [
    ...ACTIVE_UNOWNED_CURRENT_CHANGE_PATHS,
    ...HISTORICAL_NONAUTHORITATIVE_PATHS,
    ...LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_PATHS,
  ];
  const all = [
    ...ACTIVE_CURRENT_SOURCE_PATHS,
    ...RATIFIED_CURRENT_HARNESS_PATHS,
    ...DURABLE_CURRENT_CHECKER_PATHS,
    ...RECOVERED_DURABLE_CHECKER_PATHS,
    ...CURRENT_CLOSURE_DURABLE_CHECKER_PATHS,
    ...CURRENT_PACKAGE_DURABLE_CHECKER_PATHS,
    ...ACTIVE_CURRENT_HARNESS_PATHS,
    ...lifecyclePaths,
  ];
  if (new Set(all).size !== all.length) throw new Error("LIFECYCLE_CLASSIFICATION_OVERLAP");
  if (all.some((path) => !path || path.includes("*") || path.includes(".."))) throw new Error("LIFECYCLE_CLASSIFICATION_WILDCARD_OR_TRAVERSAL");
  const active = new Set(activePaths.map(normalizePath));
  const overlaps = lifecyclePaths.filter((path) => active.has(path));
  if (overlaps.length) throw new Error("LIFECYCLE_CLASSIFICATION_ACTIVE_OVERLAP:" + overlaps.join(","));
  if (!FINAL_REPO_EXIT_COVERAGE_PRESERVED) throw new Error("FINAL_REPO_EXIT_COVERAGE_NOT_PRESERVED");
  return { historicalCount: HISTORICAL_NONAUTHORITATIVE_PATHS.length, deferredCount: LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_PATHS.length, futureOwnerCount: 1 };
}

assertLifecycleClassificationIntegrity();
