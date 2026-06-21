type AnalyticsPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: AnalyticsPayload }) => void;
  }
}

export function trackEvent(eventName: string, props?: AnalyticsPayload) {
  if (typeof window === "undefined") return;

  window.plausible?.(eventName, { props });

  try {
    const key = "thalovo_analytics_events";
    const existing = localStorage.getItem(key);
    const parsed = existing ? (JSON.parse(existing) as unknown[]) : [];
    parsed.push({
      eventName,
      props: props ?? {},
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(parsed.slice(-100)));
  } catch {
    // Ignore analytics storage failures in the browser.
  }
}
