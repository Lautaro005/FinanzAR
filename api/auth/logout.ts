import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertSameOrigin, deleteCurrentSession, handleError, methodNotAllowed, setSessionCookie } from "../_lib/security";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertSameOrigin(req, res)) return;
  try {
    await deleteCurrentSession(req);
  } catch (e) {
    return handleError(res, e);
  }
  setSessionCookie(res, null);
  res.status(200).json({ ok: true });
}
