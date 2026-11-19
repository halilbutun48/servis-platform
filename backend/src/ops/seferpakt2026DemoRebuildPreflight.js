const REBUILD_SCOPE = "SEFERPAKT_LOCAL_DEMO_REBUILD_2026_V1";

function blocked(code) {
  throw new Error(`SEFERPAKT_DEMO_REBUILD_TARGET_${code}_BLOCKED`);
}

function assertSeferpakt2026DemoTarget(identity = {}) {
  if (identity.containerName !== "personel_db") blocked("WRONGCONTAINER");
  if (identity.composeProject !== "infra") blocked("WRONGCOMPOSEPROJECT");
  if (identity.databaseName !== "servisdb") blocked("WRONGDATABASE");
  if (Number(identity.postgresMajor) !== 16) blocked("POSTGRESVERSION");
  if (identity.production === true) blocked("PRODUCTION");
  if (identity.migrationStatus !== "up-to-date") blocked("MIGRATIONDRIFT");

  return {
    ok: true,
    scope: REBUILD_SCOPE,
    target: {
      containerName: identity.containerName,
      composeProject: identity.composeProject,
      databaseName: identity.databaseName,
      postgresMajor: Number(identity.postgresMajor),
    },
  };
}

export { REBUILD_SCOPE, assertSeferpakt2026DemoTarget };
