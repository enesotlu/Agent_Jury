const SESSION_KEY = "agent_jury_session";

export function saveSession(data) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save session:", e);
    }
}

export function getSession() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

export function clearSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_KEY);
}
