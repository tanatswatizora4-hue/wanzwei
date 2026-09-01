import { AsyncLocalStorage } from "node:async_hooks";

type RequestLogContext = {
  requestId: string;
  route?: string;
};

const storage = new AsyncLocalStorage<RequestLogContext>();

export function getRequestLogContext(): RequestLogContext | undefined {
  return storage.getStore();
}

export function requestIdFromRequest(req: Request): string {
  const incoming = req.headers.get("x-request-id")?.trim();
  if (incoming && incoming.length <= 128) return incoming;
  return crypto.randomUUID();
}

export function runWithRequestLog<T>(
  context: RequestLogContext,
  handler: () => T | Promise<T>,
): T | Promise<T> {
  return storage.run(context, handler);
}

export function applyRequestIdHeader(response: Response, requestId: string) {
  response.headers.set("x-request-id", requestId);
}
