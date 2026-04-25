import express from "express";

import { attachShiftSharedRoutes } from "./shared.js";
import { attachShiftCompanyRoutes } from "./company.js";
import { attachShiftRoomRoutes } from "./room.js";
import { attachShiftDriverRoutes } from "./driver.js";

import { attachShiftPeopleRoutes } from "./people.js";


// NOTE: This file intentionally stays small.
// Role-specific endpoints live in shifts.*.js modules.
export function shiftsRouter(io) {
  const r = express.Router();

  // Order is not critical for these endpoints, but we keep it stable.
  attachShiftSharedRoutes(r);
  attachShiftDriverRoutes(r, io);
  attachShiftCompanyRoutes(r, io);
  attachShiftRoomRoutes(r, io);
attachShiftPeopleRoutes(r, io);

  return r;
}
