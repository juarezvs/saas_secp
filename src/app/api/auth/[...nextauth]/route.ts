import { handlers } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";

const { GET: nextAuthGET, POST: nextAuthPOST } = handlers;

export const GET = withHttpMetrics("/api/auth/:nextauth", nextAuthGET);
export const POST = withHttpMetrics("/api/auth/:nextauth", nextAuthPOST);
