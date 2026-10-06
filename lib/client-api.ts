export type ApiErrorMessages = Record<string, string>;

export async function ensureApiSuccess(
  response: Response,
  messages: ApiErrorMessages,
  fallbackMessage: string,
) {
  if (response.ok) return;

  let errorCode = "";
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      errorCode = body.error;
    }
  } catch {
    errorCode = "";
  }

  throw new Error(messages[errorCode] ?? fallbackMessage);
}
