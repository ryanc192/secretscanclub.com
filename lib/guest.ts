export function getGuestToken(): string {
  if (typeof window === "undefined") return "";

  const key = "ssc_guest_token";
  let token = localStorage.getItem(key);

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }

  return token;
}
