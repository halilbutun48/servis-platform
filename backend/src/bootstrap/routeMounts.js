// backend/src/bootstrap/routeMounts.js

export function mountCoreRoutes(app, routes, io) {
  const {
    authStep2Router,
    authRouter,
    publicPassengerLiveRouter,
    authRequired,
    requireStepUp,
    requireStepUpWrite,
    meRouter,
    notificationsRouter,
    kvkkRouter,
    logsRouter,
    reportsRouter,
    penaltiesRouter,
    etaRouter,
    geocodeRouter,
    companyHubRouter,
    companyOverviewRouter,
    planBuilderRouter,
    liveRouter,
    observabilityRouter,
    fieldAcceptanceRouter,
    ssotAlignmentRouter,
    commercialCoreRouter,
    trustQualityRouter,
    naturalCopilotRouter,
    pilotLaunchGateRouter,
    operationVerificationRouter,
    dashboardBulkRouter,
    operationProofRouter,
    parentRouter,
    schoolParentInvitesRouter,
    personelAccessRouter,
    publicPersonelInviteRouter,
    publicLeadsRouter,
    publicLeadReviewRouter,
    companiesRouter,
    roomsRouter,
    routeTemplatesRouter,
    availabilityRoutes,
    adminLogsRouter,
    adminRouter,
  } = routes;

  function resolveRouterMount(routeExport) {
    if (typeof routeExport === "function") {
      return routeExport();
    }
    return routeExport;
  }

  // Public routes
  app.use("/api/auth", authStep2Router);
  app.use("/api/auth", authRouter);
  app.use("/api/public/leads", resolveRouterMount(publicLeadsRouter));
  app.use("/api/public/passenger-live", resolveRouterMount(publicPassengerLiveRouter));
  app.use("/api/public/personel-live", resolveRouterMount(publicPassengerLiveRouter));

  // Step 1.5: TOTP step-up guard (ROOM + SUPER_ADMIN on sensitive paths)
  app.use("/api/admin/logs", authRequired(), requireStepUp("SUPER_ADMIN"));
  app.use("/api/admin", authRequired(), requireStepUp("SUPER_ADMIN"));
  app.use("/api/logs/export", authRequired(), requireStepUp("ROOM", "SUPER_ADMIN"));
  app.use("/api/vehicles", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));
  app.use("/api/drivers", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));
  app.use("/api/availability", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));
  app.use("/api/shifts", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"));

  app.use("/api/me", meRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/kvkk", kvkkRouter());
  app.use("/api/logs", logsRouter());
  app.use("/api/reports", reportsRouter());
  app.use("/api/penalties", penaltiesRouter(io));
  app.use("/api/eta", etaRouter);
  app.use("/api/geocode", geocodeRouter());
  app.use("/api/company/hub", companyHubRouter());
  app.use("/api/company/overview", companyOverviewRouter());
  app.use("/api/plan-builder", planBuilderRouter());
  app.use("/api/live", liveRouter());
  app.use("/api/observability", observabilityRouter());
  app.use("/api/dashboard", dashboardBulkRouter());
  app.use("/api/field-acceptance", fieldAcceptanceRouter());
  app.use("/api/ssot-alignment", ssotAlignmentRouter());
  app.use("/api/commercial-core", commercialCoreRouter());
  app.use("/api/trust-quality", trustQualityRouter());
  app.use("/api/natural-copilot", naturalCopilotRouter());
  app.use("/api/pilot-launch-gate", pilotLaunchGateRouter);
  app.use("/api/operation-verification", operationVerificationRouter());
  app.use("/api/operation-proof", operationProofRouter());
  app.use("/api/parent", parentRouter());
  app.use("/api/school/parent-invites", schoolParentInvitesRouter());
  app.use("/api/auth/personel-invite", resolveRouterMount(publicPersonelInviteRouter));
  app.use("/api/company/personel-invites", personelAccessRouter());
  app.use("/api/companies", companiesRouter());
  app.use("/api/rooms", roomsRouter());
  app.use("/api/route-templates", routeTemplatesRouter());
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/admin/logs", adminLogsRouter());
  app.use("/api/admin/public-leads", resolveRouterMount(publicLeadReviewRouter));
  app.use("/api/admin", adminRouter(io));
}

export function mountIoRoutes(app, io, routes) {
  const {
    vehiclesRouter,
    driversRouter,
    shiftsRouter,
    gpsRouter,
    telematicsRouter,
    requestsRouter,
    driverRouter,
    personelsRouter,
    companyPersonelsRouter,
    passengerLinksRouter,
    personelShiftsRouter,
    agreementsRouter,
    offersRouter,
    checkinRouter,
    organizationRouter,
    aiRouter,
  } = routes;

  app.use("/api/vehicles", vehiclesRouter(io));
  app.use("/api/drivers", driversRouter(io));
  app.use("/api/shifts", shiftsRouter(io));
  app.use("/api/gps", gpsRouter(io));
  app.use("/api/telematics", telematicsRouter(io));
  app.use("/api/requests", requestsRouter(io));
  app.use("/api/driver", driverRouter(io));
  app.use("/api/personels", personelsRouter(io));
  app.use("/api/company/personels", companyPersonelsRouter());
  app.use("/api/company/passenger-links", passengerLinksRouter());
  app.use("/api/personel/shifts", personelShiftsRouter());
  app.use("/api/agreements", agreementsRouter(io));
  app.use("/api/offers", offersRouter(io));
  app.use("/api/checkin", checkinRouter(io));
  app.use("/api/organization", organizationRouter(io));
  app.use("/api/ai", aiRouter());
}
