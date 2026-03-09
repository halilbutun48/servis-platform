import jwt from "jsonwebtoken";
import { ENV } from "../env.js";

export function signToken(payload, opts = {}) {
  const expiresIn = opts?.expiresIn ?? ENV.ACCESS_TOKEN_EXPIRES_IN ?? "7d";
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, ENV.JWT_SECRET);
}
