const ASYNC_HANDLER_WRAPPED = Symbol.for("servis-platform.async-handler-wrapped");
const ROUTER_METHODS_WRAPPED = Symbol.for("servis-platform.router-methods-wrapped");

export function asyncHandler(fn) {
  if (typeof fn !== "function") {
    return fn;
  }

  if (fn[ASYNC_HANDLER_WRAPPED]) {
    return fn;
  }

  function wrappedAsyncHandler(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  }

  Object.defineProperty(wrappedAsyncHandler, ASYNC_HANDLER_WRAPPED, {
    value: true,
  });

  return wrappedAsyncHandler;
}

function wrapRouterMethodArgs(args) {
  return args.map((arg) => {
    if (Array.isArray(arg)) {
      return wrapRouterMethodArgs(arg);
    }

    if (typeof arg === "function" && arg.length <= 3) {
      return asyncHandler(arg);
    }

    return arg;
  });
}

function wrapRouterMethod(router, method) {
  const original = router?.[method];
  if (typeof original !== "function") return;

  router[method] = function wrappedRouterMethod(...args) {
    return original.apply(this, wrapRouterMethodArgs(args));
  };
}

export function wrapAsyncRouterMethods(router) {
  if (!router || typeof router !== "object") {
    return router;
  }

  if (router[ROUTER_METHODS_WRAPPED]) {
    return router;
  }

  Object.defineProperty(router, ROUTER_METHODS_WRAPPED, {
    value: true,
  });

  for (const method of ["use", "all", "get", "post", "put", "patch", "delete", "options", "head"]) {
    wrapRouterMethod(router, method);
  }

  return router;
}
