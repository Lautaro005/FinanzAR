import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser, handleError, methodNotAllowed } from "../_lib/security";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await getSessionUser(req);
    res.status(200).json({ user });
  } catch (e) {
    handleError(res, e);
  }
}
