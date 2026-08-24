import express from "express";
import { attachCommercialCoreRoutes } from "./commercialCoreRoutes.js";

export function commercialCoreRouter() {
  const r = express.Router();
  attachCommercialCoreRoutes(r);
  return r;
}
