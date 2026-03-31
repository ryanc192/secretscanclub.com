const GUEST_TOKEN_KEY = "ssc_guest_token";

export function getGuestToken(): string {
  if (typeof window === "undefined") return "";

  let token = window.localStorage.getItem(GUEST_TOKEN_KEY);

  if (!token) {
    token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    window.localStorage.setItem(GUEST_TOKEN_KEY, token);
  }

  return token;
}
