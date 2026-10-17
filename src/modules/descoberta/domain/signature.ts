import { createHash, createHmac } from "node:crypto";

export function signDiscoveryRequest(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  claims: string,
  body: string,
) {
  return createHmac("sha256", secret)
    .update(
      [
        method,
        path,
        timestamp,
        nonce,
        claims,
        createHash("sha256").update(body).digest("hex"),
      ].join("\n"),
    )
    .digest("hex");
}
