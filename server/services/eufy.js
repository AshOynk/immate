/**
 * Eufy integration: notifies management what's been done and triggers checks.
 * Set EUFY_WEBHOOK_URL (or CUFY_WEBHOOK_URL) and optional EUFY_API_KEY in env to enable.
 */

const EUFY_WEBHOOK_URL = process.env.EUFY_WEBHOOK_URL || process.env.EUFY_API_URL || process.env.CUFY_WEBHOOK_URL || process.env.CUFY_API_URL;
const EUFY_API_KEY = process.env.EUFY_API_KEY || process.env.CUFY_API_KEY;

export async function notifyEufy(event, payload) {
  if (!EUFY_WEBHOOK_URL) {
    console.log('[Eufy] No webhook URL set; skipping notify:', event, payload?.submissionId || payload?.taskId);
    return { sent: false, reason: 'no_url' };
  }
  const body = {
    event,
    source: 'compliance-app',
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const headers = {
    'Content-Type': 'application/json',
    ...(EUFY_API_KEY && { Authorization: `Bearer ${EUFY_API_KEY}`, 'X-API-Key': EUFY_API_KEY }),
  };
  try {
    const res = await fetch(EUFY_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn('[Eufy] Webhook responded', res.status, await res.text());
      return { sent: false, status: res.status };
    }
    return { sent: true, status: res.status };
  } catch (err) {
    console.error('[Eufy] Webhook error:', err.message);
    return { sent: false, error: err.message };
  }
}

/** Call when a resident submits proof (management sees what's been done). */
export function notifySubmissionReceived({ taskId, taskName, residentId, submissionId, recordedAt }) {
  return notifyEufy('submission_received', {
    taskId: String(taskId),
    taskName,
    residentId,
    submissionId: String(submissionId),
    recordedAt: recordedAt?.toISOString?.(),
    message: 'Resident submitted proof; ready for validation.',
  });
}

/** Call when a task is validated (pass) – triggers check in Eufy and awards stars. */
export function notifyCheckTriggered({ taskId, taskName, residentId, submissionId, status, starsAwarded }) {
  return notifyEufy('check_triggered', {
    taskId: String(taskId),
    taskName,
    residentId,
    submissionId: String(submissionId),
    status,
    starsAwarded,
    message: status === 'pass' ? 'Task validated; check complete. Stars awarded.' : 'Task marked fail.',
  });
}
