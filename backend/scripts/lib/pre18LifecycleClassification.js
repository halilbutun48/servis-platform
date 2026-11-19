// Exact PRE-#18 lifecycle classification. This registry records historical/non-authoritative paths and paths deferred to the final no-surprise repository exit. It does not approve either category as current security authority.

const FINAL_EXIT_OWNER = "FINAL_NO_SURPRISE_REPOSITORY_EXIT";

// Exact active current harness/helper identities recovered from the frozen
// PRE-#18 topology and the current-head reconciliation. These are identity
// approvals only; behavioral gate completion is evaluated by their own gates.
export const ACTIVE_CURRENT_HARNESS_ENTRIES = Object.freeze([
  { path: "backend/scripts/run_m0_latest.js", owner: "PRE_18_M0_STATIC_COMPATIBILITY_HISTORICAL_RECONCILIATION_01", sha256: "1CED0FC50E66ED6284D0C27C3D18A074B6ED1493E7319356A240B68EDAF11FE2" },
  // Current M18 browser provenance uses the read-only runtime-proof extension;
  // the PRE-18 A456... identity remains preserved in the M18 supersession
  // record rather than being silently treated as the current source.
  { path: "backend/scripts/lib/pre_18_authenticated_role_context.mjs", owner: "PRE_18_FOUNDATION", sha256: "4410F6A5EBB61EC16DF9B367FE5911F09DA1C023A8DDDCCF16129D481A3024B0" },
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
    sha256: "741072692701761C2A513175444DE433D9D6BCE8329015B326538DCEBF96EAB4",
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
    sha256: "2AD400627A2ABE99AD52FE867C19D6FD406AF6D35214255C08813759860622F6",
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
// Exact artifacts retained outside the Git source set during canonical source recovery.
// Each path is individually classified; no directory or wildcard exemption is used.
  ".agents/skills/seferpakt-finance-dispatch-pricing-e2e/SKILL.md",
  ".dlevel-cont282-company-home.yml",
  ".dlevel-cont282-company-plan.yml",
  ".frontend-config-cont183.json",
  ".frontend-host-cont183.json",
  ".frontend-net-cont183.json",
  ".m18-panel-current.txt",
  ".part1b-midibus-result.txt",
  ".public-company-payment-snapshot.yml",
  ".public-room-payment-snapshot.yml",
  ".r9-local-bundle.js",
  ".r9-local.html",
  ".r9-public-bundle.js",
  ".r9-public.html",
  ".tmp-old-package.json",
  ".tmp-old-schema.prisma",
  "acceptance-current.err",
  "acceptance-current.out",
  "backend/cont233-public-debug.png",
  "cont200-room-state.json",
  "cont202-admin-audit-question.yml",
  "cont202-admin-audit.yml",
  "cont202-admin-auth2.yml",
  "cont202-admin-current.yml",
  "cont202-admin-logout.yml",
  "cont202-admin-regions-auth.yml",
  "cont202-admin-regions-auth2.yml",
  "cont202-admin-regions-copilot.yml",
  "cont202-admin-regions-login.yml",
  "cont202-admin-regions-question.yml",
  "cont202-admin-regions.yml",
  "cont202-org-auth2.yml",
  "cont202-org-commercial-auth.yml",
  "cont202-org-commercial-auth2.yml",
  "cont202-org-commercial-copilot.yml",
  "cont202-org-commercial-login.yml",
  "cont202-org-commercial-question.yml",
  "cont202-org-commercial.yml",
  "cont202-org-current.yml",
  "cont202-org-logout.yml",
  "cont202-org-superadmin-negative.yml",
  "cont202-room-home.yml",
  "cont202-room-hub-copilot.yml",
  "cont202-room-hub-question.yml",
  "cont202-room-hub.yml",
  "cont202-room-login.yml",
  "cont202-room-org-negative.yml",
  "cont203-company-login.yml",
  "cont203-company-shifts.yml",
  "cont203-org-shifts.yml",
  "cont203-room-offers.yml",
  "cont203-school-login.yml",
  "cont203-school-shifts.yml",
  "cont233-room-finance-public-fixed-v2.png",
  "cont233-room-finance-public-fixed.png",
  "cont50-driver-active-window.yml",
  "cont50-driver-after-pin.yml",
  "cont50-driver-current.yml",
  "cont50-driver-login.yml",
  "cont50-driver-login2.yml",
  "cont50-driver-pin-saved.yml",
  "cont50-driver-route29-auth.yml",
  "cont50-driver-route29.yml",
  "cont50-driver-today-expanded-prep.yml",
  "cont50-driver-today-expanded.yml",
  "cont50-driver-today.yml",
  "cont50-driver-today2.yml",
  "cont50-driver-today3.yml",
  "cont50-driver-vardiya-git.yml",
  "cont50-parent-auth.yml",
  "cont50-parent-current.yml",
  "cont50-parent-live-expanded.yml",
  "cont50-parent-live-open.yml",
  "cont50-parent-login.yml",
  "cont50-room-29-approved.yml",
  "cont50-room-after-login.yml",
  "cont50-room-before-second-reset.yml",
  "cont50-room-current.yml",
  "cont50-room-drivers-auth.yml",
  "cont50-room-drivers-fresh.yml",
  "cont50-room-management-stage1.yml",
  "cont50-room-management.yml",
  "cont50-room-pin-issued.yml",
  "cont50-room-pin2.yml",
  "cont50-room-reset-done.yml",
  "cont50-room-reset-stable.yml",
  "cont50-room-second-reset-stable.yml",
  "cont50-room-second-reset.yml",
  "cont50-room-selected-29.yml",
  "cont50-room-shifts.yml",
  "cont50-school-current.yml",
  "cont50-school-custom-time.yml",
  "cont50-school-market.yml",
  "cont50-school-offer-selected.yml",
  "cont50-school-offer-sent.yml",
  "cont50-school-people-added.yml",
  "cont50-school-plan-finished.yml",
  "cont50-school-plan-ready.yml",
  "cont50-school-route-ordered.yml",
  "cont50-school-step2.yml",
  "cont50-school-step3.yml",
  "cont50-school-step4.yml",
  "cont50-school-stops-ready.yml",
  "cost-scenario-browser-current.err",
  "cost-scenario-browser-current.out",
  "infra/docker-compose.continuation04-isolated.yml",
  "o.text).slice(0",
  "output/canonical-cutover-20261106-2047/seferpakt-canonical-66-cutover-20261106.dump",
  "output/cc-5273-live-backup-20261102/bkp_cc5273_20261102_163300.dump",
  "output/cont18-public-school-320.png",
  "output/stage-a-canonical-backup-20261107/stage-a-canonical-69-20261107-031004.dump",
  "tmp-company-room-backend-lint.log",
  "tmp-company-room-web-build.log",
  "tmp-company-room-web-lint.log",
  "backend/artifacts/harness-topology/",
  // The following families are discovered by the bounded repository status
  // reader but are not application source. Their producers are the existing
  // browser-smoke/checker scripts and their consumers are evidence/review
  // workflows. They remain on disk until the existing final-exit owner makes
  // a retention decision; they are never silently omitted from discovery.
  "backend/artifacts/",
  "backend/backend/",
  "backend/output/",
  ".playwright/",
  ".playwright-cli/",
  "output/playwright/",
  "output/playwright/wp09/.playwright-cli/",
  // Exact backup/fixture/acceptance output families with producer and
  // retention references in CONT-323/324 evidence. These are bounded
  // lifecycle roots, not a blanket output/ exemption.
  "output/a4-canonical-safe-deployment-20261103-101715/",
  "output/backup-restore-rehearsal-20261102/",
  "output/cc-5273-corrective-live-backup-20261102/",
  "output/company-finance-final-acceptance/",
  "output/global-write-freeze-fixture-20261102/",
  "output/p9-pre-schema-backup-20261108/",
  "output/part3a-school-organization-fixture/",
  "output/part3a-school-organization-fixture-02/",
  "output/part3b-live-preflight-backup-20261102/",
  "output/postgres-role-hardening-fixture-20261102/",
  "output/worker-database-role-separation-fixture-20261102/",
  "web/.playwright-cli/",
  "_runtime-evidence/",
  "work/",
  "docs/evidence/",
  "docs/superpowers/",
  "docs/prototypes/",
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
  "security-scope-report-clean.json",
  "web/public/vite.svg",
  "web/output/playwright/",
  ".m18-part1-eight-public-acceptance.js",
  ".m18-part1-inspect-vehicles.js",
  ".m18-part1-probe-commercial.js",
  ".m18-part1-probe-vehicle.js",
  ".m18-part1-vehicle-context-recheck.js",
  ".m18-part2-first-23-public-acceptance.js",
  ".m18-part3-dom-inventory.js",
  ".m18-part3-first-23-public-acceptance.js",
  ".m18-part3-settlement-inspect.js",
  ".m18-part4-browser-inspect.js",
  ".m18-part4-context-group1-run.js",
  ".m18-part4-context-group1.js",
  ".m18-part4-local-probe.mjs",
  ".m18-part4-payload-inspect.js",
  ".m18-part4-public-reverify.js",
  ".m18-part4-record-inventory.js",
  ".m18-part4-recovery-pair-run.js",
  ".m18-part4-recovery-pair.js",
  ".m18-part4-semantic-direct.mjs",
  ".m18-part4-semantic-summary.js",
  ".m18-part4-single-probe.mjs",
  ".m18-runtime-fixture-envelope-20261009-02.json",
  ".m18-runtime-fixture-envelope-20261009.json",
  ".m18-runtime-fixture-receipt-20261009-02.json",
  ".m18-runtime-fixture-receipt-20261009.json",
  ".m18-runtime-receipt-20261009-02.json",
  ".m18-runtime-receipt-20261009.json",
  ".room-current-response-14.json",
  ".room-current-response-latest.json",
  ".room-finance-company-after-fix-settled.txt",
  ".room-finance-company-after-fix.txt",
  ".room-finance-company-preview-after-fix.json",
  ".room-finance-local-home.txt",
  ".room-finance-local-login.txt",
  ".room-finance-org-preview-after-fix.json",
  ".room-finance-org-quote-after-fix.txt",
  ".room-finance-overview-after-api.yml",
  ".room-finance-overview-all-after-period.txt",
  ".room-finance-overview-before-all.txt",
  ".room-finance-overview-custom-after-api.yml",
  ".room-finance-overview-october-after-api.yml",
  ".room-finance-overview-september.txt",
  ".room-finance-public-login.txt",
  ".room-finance-public-school-1440.txt",
  ".room-finance-school-after-fix.txt",
  ".room-finance-school-draft-after-fix.json",
  ".room-finance-school-preview-after-fix.json",
  ".room-finance-school-quote-after-fix.txt",
  ".room-offer-natural-after.snapshot.txt",
  ".room-step-after.snapshot.txt",
  ".room-vehicle-comparison-after-planning-evidence.yml",
  ".room-vehicle-comparison-final.txt",
  "android-m18-public-login-after-wait.png",
  "android-m18-public-login.png",
  "android-m18-public-page.png",
  "backend/.room20-full-period-final.out",
  // M0 legacy backend probe writes an empty stderr capture in the worktree.
  // It is a generated transient artifact, not a repository source file.
  "backend/m18-j02-backend-3321.err.log",
  "cloudflare-recovery-20261019-105014.err.log",
  "cloudflare-recovery-20261019-105014.out.log",
  "cloudflare-recovery-http2-20261019-110553.err.log",
  "cloudflare-recovery-http2-20261019-110553.out.log",
  "company-after-loop.yml",
  "company-local-261-suggestions.yml",
  "company-local-261.yml",
  "company-local-after-cause317.yml",
  "company-local-postfix-selected.yml",
  "company-local-postfix-shifts.yml",
  "company-local-postfix-suggestions.yml",
  "company-local-shifts-before-chip.yml",
  "company-local-shifts-current.yml",
  "company-local-shifts-expanded2.yml",
  "local-part4-320-service.txt",
  "local-part4-390-route-dialog.txt",
  "local-part4-390-route.txt",
  "local-part4-390-route2.txt",
  "local-part4-current.txt",
  "output/room-settlement-candidates-local.json",
  "public-part4-quote-after-select.txt",
  "public-part4-quote-before-select.txt",
  "public-part4-quote-reload.txt",
  "public-part4-quote.txt",
  "public-part4-route-dialog.txt",
  "public-part4-route.txt",
  "public-part4-service.txt",
  "room-finance-local-1024.png",
  "room-finance-local-1440.png",
  "room-finance-local-320.png",
  "room-finance-local-390.png",
  "room-finance-public-1024.png",
  "room-finance-public-1440.png",
  "room-finance-public-320.png",
  "room-finance-public-390.png",
  "stage2b-local-final-safe-pending-current.txt",
  "stage2b-local-final-safe-pending.txt",
  "stage2b-public-final-safe-pending-after.txt",
  "stage2b-public-final-safe-pending-current.txt",
  "stage2b-public-final-safe-pending.txt",
  "vehicle-preview-response.txt",
  // Exact acceptance/checker paths discovered by the bounded status reader.
  // They are retained as historical/evidence producers; no directory prefix
  // is used so active source identities remain visible to security gates.
  "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
  "backend/scripts/accounting_export_and_integration_contract_01_acceptance.mjs",
  "backend/scripts/accounting_export_and_integration_contract_01_browser.mjs",
  "backend/scripts/accounting_export_and_integration_contract_01_check.js",
  "backend/scripts/change_impact_registry_v1_check.js",
  "backend/scripts/cost_scenario_forecast_and_savings_01_check.js",
  "backend/scripts/hakedis_invoice_reconciliation_preview_01_browser.mjs",
  "backend/scripts/lib/changeImpactRegistryV1.js",
  "backend/scripts/lib/documentationRegistryV1.js",
  "backend/scripts/m46_6_c_ai_screen_help_check.js",
  "backend/scripts/room_profitability_and_quote_floor_01_check.js",
  "backend/scripts/room_profitability_and_quote_floor_01_expansion.js",
  "backend/scripts/financial_operations_surface_and_rbac_01_check.js",
  "backend/scripts/sefer_abi_cost_analysis_assistant_01_acceptance.mjs",
  "backend/scripts/ux_room_shifts_tabs_01_check.js",
  "backend/scripts/ux_room_vehicles_telematics_counts_fix_check.js",
  "backend/scripts/canonical_conversation_core_01_audit.mjs",
  "backend/scripts/company_budget_commitment_02_check.js",
  "backend/scripts/company_budget_part1_browser.mjs",
  "backend/scripts/company_budget_part2a_browser.mjs",
  "backend/scripts/company_budget_part2d2_reconciliation_browser.mjs",
  "backend/scripts/company_budget_scope_01_check.js",
  "backend/scripts/company_budget_ux_final_browser.mjs",
  "backend/scripts/company_checkpoint_06_personel_identity_test.mjs",
  "backend/scripts/company_checkpoint_07_commercial_flow_regression.mjs",
  "backend/scripts/company_checkpoint_08_operations_gps_regression.mjs",
  "backend/scripts/company_checkpoint_09_reporting_notifications_regression.mjs",
  "backend/scripts/company_dlevel_guided_target_visibility_01_check.mjs",
  "backend/scripts/company_final_monthly_price_reference_browser.mjs",
  "backend/scripts/company_price_budget_advisory_v1_browser.mjs",
  "backend/scripts/invoice_collection_isolated_acceptance.mjs",
  "backend/scripts/invoice_collection_live_readonly_acceptance.mjs",
  "backend/scripts/m18_cap39_issue_classification_01_check.mjs",
  "backend/scripts/m18_cap39_operation_problems_goster_01_check.mjs",
  "backend/scripts/m18_cap39_operation_problems_live_evidence_01_check.mjs",
  "backend/scripts/m18_cap41_agreement_list_ui_surface_01_browser.mjs",
  "backend/scripts/m18_cap41_collection_status_distribution_semantic_01_check.mjs",
  "backend/scripts/m18_cap41_combined_agreement_acceptance_01_browser.mjs",
  "backend/scripts/m18_cap41_query_executor_collection_scope_01_check.mjs",
  "backend/scripts/m18_demo_telemetry_fixture_01.mjs",
  "backend/scripts/m18_fixture_provenance_20261009_produce.mjs",
  "backend/scripts/m18_gov001_continuation_request_mode_01_check.mjs",
  "backend/scripts/m18_gov001_holdout_harness_readiness_01_check.mjs",
  "backend/scripts/m18_hakedis_coverage_fixture_01_check.mjs",
  "backend/scripts/m18_hakedis_coverage_fixture_01_run.mjs",
  "backend/scripts/m18_room_agreement_inventory_01_browser.mjs",
  "backend/scripts/m18_room_batch_product_corrective_01_check.mjs",
  "backend/scripts/m18_room_batch_public_failure_corrective_01_check.mjs",
  "backend/scripts/m18_room_f01_foreign_tenant_relation_regression_01_check.mjs",
  "backend/scripts/m18_room_final_defect_corrective_regression.mjs",
  "backend/scripts/m18_room_home_first_batch_corrective_01_check.mjs",
  "backend/scripts/m18_room_map_zoom_intent_regression_01_check.mjs",
  "backend/scripts/m18_room_part1_suggestion_gate_regression_01_check.mjs",
  "backend/scripts/m18_room_part4_context_record_recovery_01_check.mjs",
  "backend/scripts/m18_room_part4_screen_recovery_01_check.mjs",
  "backend/scripts/m18_room_part5_cross_surface_navigation_regression.mjs",
  "backend/scripts/m18_room_part5_empty_result_recovery_regression.mjs",
  "backend/scripts/m18_room_remaining_product_corrective_a_01_check.mjs",
  "backend/scripts/m18_room_remaining_product_corrective_b_01_check.mjs",
  "backend/scripts/m18_semantic_evidence_composer_security_01_check.mjs",
  "backend/scripts/m18_wp07_financial_context_continuity_01_check.mjs",
  "backend/scripts/m18_wp07_financial_followup_evidence_01_check.mjs",
  "backend/scripts/m18_wp10_copilot_mobile_touch_target_check.mjs",
  "backend/scripts/market_reference_room_ui_check.js",
  "backend/scripts/room1_finance_demo_completion_01.mjs",
  "backend/scripts/room_cost_all_expenses_demo_acceptance.mjs",
  "backend/scripts/room_cost_all_expenses_demo_acceptance_check.js",
  "backend/scripts/room_cost_allocation_01_acceptance.mjs",
  "backend/scripts/room_cost_allocation_01_check.js",
  "backend/scripts/room_cost_allocation_01_demo_fixture.mjs",
  "backend/scripts/room_cost_batch_draft_01_check.js",
  "backend/scripts/room_cost_categories_demo_fixture_01.mjs",
  "backend/scripts/room_cost_category_catalog_part2.mjs",
  "backend/scripts/room_cost_ledger_foundation_01_acceptance.mjs",
  "backend/scripts/room_cost_ledger_foundation_01_check.js",
  "backend/scripts/room_cost_ledger_foundation_01_multiturn_acceptance.mjs",
  "backend/scripts/room_cost_ledger_integrity_01_browser.mjs",
  "backend/scripts/room_cost_ledger_integrity_01_check.mjs",
  "backend/scripts/room_cost_planning_01_check.js",
  "backend/scripts/room_cost_planning_01_ui_check.js",
  "backend/scripts/room_cost_source_ref_idempotency_check.js",
  "backend/scripts/room_cost_ux_seferabi_01_audit.mjs",
  "backend/scripts/room_cost_ux_seferabi_01_browser.mjs",
  "backend/scripts/room_cost_ux_seferabi_01_check.js",
  "backend/scripts/room_finance_actionable_warnings_01_check.js",
  "backend/scripts/room_finance_all_rooms_demo_completion_01.mjs",
  "backend/scripts/room_finance_all_rooms_final_acceptance_01.mjs",
  "backend/scripts/room_finance_confirmed_correction_01_check.js",
  "backend/scripts/room_finance_confirmed_correction_route_01_check.js",
  "backend/scripts/room_finance_correction_history_ux_01_check.js",
  "backend/scripts/room_finance_correction_ui_contract_01_check.js",
  "backend/scripts/room_finance_demo_cost_completion_01.mjs",
  "backend/scripts/room_finance_demo_operational_completion_01.mjs",
  "backend/scripts/room_finance_economic_ownership_01_check.mjs",
  "backend/scripts/room_finance_exhaustive_ui_acceptance_01_browser.mjs",
  "backend/scripts/room_finance_expense_ownership_01_check.mjs",
  "backend/scripts/room_finance_full_readonly_acceptance_01.mjs",
  "backend/scripts/room_finance_full_readonly_acceptance_02_sefer_abi.mjs",
  "backend/scripts/room_finance_income_chain_acceptance_01_browser.mjs",
  "backend/scripts/room_finance_income_overview_01_check.js",
  "backend/scripts/room_finance_local_public_parity_01_browser.mjs",
  "backend/scripts/room_finance_overview_v21_contract_check.js",
  "backend/scripts/room_finance_owner_scope_correction_01_check.js",
  "backend/scripts/room_finance_owner_scope_repair_20261023.mjs",
  "backend/scripts/room_finance_platform_reference_api_acceptance_01.mjs",
  "backend/scripts/room_finance_platform_reference_demo_fixture_01.mjs",
  "backend/scripts/room_finance_platform_reference_ux_acceptance_01_browser.mjs",
  "backend/scripts/room_finance_platform_reference_visibility_01_browser.mjs",
  "backend/scripts/room_finance_premium_structure_01_browser.mjs",
  "backend/scripts/room_finance_premium_ux_01_check.js",
  "backend/scripts/room_finance_provisional_result_01_check.js",
  "backend/scripts/room_finance_quote_profitability_01_browser.mjs",
  "backend/scripts/room_finance_realized_income_scope_01_check.js",
  "backend/scripts/room_finance_salary_room_policy_01_acceptance.mjs",
  "backend/scripts/room_finance_salary_room_policy_01_check.js",
  "backend/scripts/room_finance_service_cost_context_01_check.js",
  "backend/scripts/room_finance_service_cost_real_acceptance_01_browser.mjs",
  "backend/scripts/room_finance_service_cost_scope_01_check.js",
  "backend/scripts/room_finance_service_cost_scope_02_api_check.mjs",
  "backend/scripts/room_finance_service_cost_v22_check.js",
  "backend/scripts/room_finance_targeted_regression_01_browser.mjs",
  "backend/scripts/room_finance_vehicle_comparison_01_browser.mjs",
  "backend/scripts/room_finance_vehicle_comparison_02_browser.mjs",
  "backend/scripts/room_finance_vehicle_comparison_03_economic_acceptance.mjs",
  "backend/scripts/room_finance_vehicle_comparison_context_01_check.mjs",
  "backend/scripts/room_finance_vehicle_quote_separation_01_check.js",
  "backend/scripts/room_financial_cost_intelligence_browser_01.mjs",
  "backend/scripts/room_financial_cost_intelligence_checkpoint2_check.js",
  "backend/scripts/room_financial_cost_intelligence_checkpoint3_ui_focus_check.js",
  "backend/scripts/room_financial_operations_tabs_regression_01_check.js",
  "backend/scripts/room_financial_scenario_ledger_coverage_01_check.js",
  "backend/scripts/room_operation_evidence_completion_01_check.js",
  "backend/scripts/room_service_cost_shift151_allocation_01_browser.mjs",
  "backend/scripts/room_service_cost_shift151_allocation_01_check.mjs",
  "backend/scripts/room_service_cost_shift151_allocation_02_browser.mjs",
  "backend/scripts/room_service_cost_usage_allocation_01_acceptance.mjs",
  "backend/scripts/room_service_cost_usage_allocation_01_browser.mjs",
  "backend/scripts/room_service_cost_usage_allocation_01_check.js",
  "backend/scripts/room_service_cost_usage_allocation_ui_contract_01_check.js",
  "backend/scripts/sefer_abi_price_advisory_v1_browser.mjs",
  "backend/scripts/seferpakt_2026_canonical_demo_seed_check.js",
  "backend/scripts/seferpakt_2026_demo_canonical_contract_check.js",
  "backend/scripts/seferpakt_2026_demo_db_acceptance_check.mjs",
  "backend/scripts/seferpakt_2026_demo_operations_reset.mjs",
  "backend/scripts/seferpakt_2026_demo_rebuild.mjs",
  "backend/scripts/seferpakt_2026_demo_rebuild_check.mjs",
  "backend/scripts/seferpakt_2026_demo_rebuild_preflight_check.js",
  "backend/scripts/seferpakt_docker_runtime_contract_check.mjs",
  "backend/scripts/shift_route_evidence_contract_01_check.js",
  "backend/scripts/shift_usage_completion_fixture.mjs",
  "backend/scripts/ux_room_agreements_p1_browser.mjs",
  "backend/scripts/ux_room_agreements_p1_check.js",
  "backend/scripts/ux_room_agreements_two_controls_browser.mjs",
  "web/scripts/company_checkpoint_06_excel_parser_test.mjs",
  "web/scripts/m18_room_hakedis_scope_regression.mjs",
  "web/scripts/m18_room_live_transport_regression.mjs",
  "web/scripts/route_preview_snapshot_regression.js",
  "web/scripts/service_cost_allocation_input_contract.test.mjs",
  "web/scripts/service_cost_context_mismatch_ui_contract.test.mjs",
  "web/scripts/service_cost_empty_context_ui_contract.test.mjs",
  "web/scripts/service_cost_simple_presentation_ui_contract.test.mjs",
  "web/scripts/service_cost_summary_cards_layout.test.mjs"
]);
export const LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_OWNER = FINAL_EXIT_OWNER;
export const FINAL_REPO_EXIT_COVERAGE_PRESERVED = true;

const historicalSet = new Set(HISTORICAL_NONAUTHORITATIVE_PATHS);
function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

export function matchesLifecyclePathRule(value, rule) {
  const candidate = normalizePath(value);
  const normalizedRule = normalizePath(rule);
  if (!candidate || !normalizedRule) return false;
  if (!normalizedRule.endsWith("/")) return candidate === normalizedRule;
  const directory = normalizedRule.replace(/\/+$/u, "");
  return candidate === directory || candidate.startsWith(`${directory}/`);
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
  const deferredRule = LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_PATHS.find((rule) => matchesLifecyclePathRule(path, rule));
  if (deferredRule) {
    return {
      category: "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT",
      path,
      lifecycleRule: deferredRule,
      futureOwner: FINAL_EXIT_OWNER,
      currentAuthority: "NONE",
    };
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
  const overlaps = lifecyclePaths.filter((path) => activePaths.some((activePath) => matchesLifecyclePathRule(activePath, path)));
  if (overlaps.length) throw new Error("LIFECYCLE_CLASSIFICATION_ACTIVE_OVERLAP:" + overlaps.join(","));
  if (!FINAL_REPO_EXIT_COVERAGE_PRESERVED) throw new Error("FINAL_REPO_EXIT_COVERAGE_NOT_PRESERVED");
  return { historicalCount: HISTORICAL_NONAUTHORITATIVE_PATHS.length, deferredCount: LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT_PATHS.length, futureOwnerCount: 1 };
}

assertLifecycleClassificationIntegrity();
