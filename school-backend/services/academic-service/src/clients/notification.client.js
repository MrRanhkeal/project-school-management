'use strict';

/**
 * HTTP client for notification-service internal endpoints.
 *
 * Notifications are best-effort side effects of a business action (register,
 * enrollment, payment, attendance...), so this client is fire-and-forget:
 * failures are logged and swallowed — a down notification-service must never
 * break or slow down the main flow that triggered the event.
 */

const { config, logger } = require('@school/shared');

const BASE_URL = config.services.notificationUrl;
const HEADERS = {
    'content-type': 'application/json',
    'x-internal-token': config.services.internalToken,
};
const TIMEOUT_MS = 5000;

/**
 * Enqueue one event (or an array of events) on notification-service.
 * Each event: { type, to?, userId?, studentId?, subject?, text?, data? } —
 * `source` is stamped with this service's name automatically.
 */
async function notify(events) {
    const list = (Array.isArray(events) ? events : [events]).map((e) => ({
        source: config.serviceName,
        ...e,
    }));
    if (!list.length) return;
    try {
        const res = await fetch(`${BASE_URL}/api/notifications/internal/dispatch`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ events: list }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.message || `notification-service ${res.status}`);
        }
    } catch (err) {
        logger.warn('Notification dispatch skipped (notification-service unreachable)', {
            types: list.map((e) => e.type),
            error: err.message,
        });
    }
}

module.exports = { notify };
