const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function userMessageFor(error) {
  if (error?.code === "GLOBAL_WRITE_FROZEN" || error?.code === "GLOBAL_WRITE_FENCING") {
    return {
      status: 423,
      message: "Sistem geçiş nedeniyle geçici olarak yazmaya kapalı.",
    };
  }
  if (error?.code === "WRITE_FREEZE_STATE_UNAVAILABLE") {
    return {
      status: 503,
      message: "Yazma güvenlik durumu doğrulanamadığı için işlem gerçekleştirilemedi.",
    };
  }
  if (error?.code === "GLOBAL_WRITE_FENCE_STALE" || error?.code === "WRITE_FREEZE_STATE_CONFLICT") {
    return {
      status: 409,
      message: "İşlem güvenlik durumu değişti; lütfen kaydı yenileyip tekrar deneyin.",
    };
  }
  return null;
}

export function createWriteFreezeMiddleware({ controller, readOnlyPostPaths: configuredReadOnlyPostPaths = [] } = {}) {
  if (!controller?.assertWritable) throw new Error("WRITE_FREEZE_CONTROLLER_REQUIRED");

  const readOnlyPostPaths = new Set(
    configuredReadOnlyPostPaths
      .map((path) => String(path || "").trim().split("?")[0])
      .filter(Boolean),
  );

  return async function globalWriteFreezeMiddleware(req, res, next) {
    const method = String(req?.method || "GET").toUpperCase();
    if (SAFE_METHODS.has(method)) return next();
    const requestPath = String(req?.path || req?.originalUrl || req?.url || "").split("?")[0];
    if (method === "POST" && readOnlyPostPaths.has(requestPath)) return next();

    try {
      await controller.assertWritable({
        operation: `${method} ${String(req?.originalUrl || req?.path || req?.url || "")}`,
      });
      return next();
    } catch (error) {
      const response = userMessageFor(error);
      if (!response) return next(error);
      return res.status(response.status).json({ ok: false, message: response.message });
    }
  };
}

export function writeFreezeUserMessage(error) {
  return userMessageFor(error);
}

export { SAFE_METHODS };
