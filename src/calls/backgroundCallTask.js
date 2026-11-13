// src/calls/backgroundCallTask.js
// Loaded from index.js so it is defined when Android wakes the JS bundle headlessly for a data-only push.
import { AppState } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import Notifications from '../utils/notificationsSafe';
import { CallUi } from '../../modules/call-ui';

export const CALL_PUSH_TASK = 'samadhan-call-push';

const API_URL = Constants.expoConfig?.extra?.apiUrl || '';
export const DECLINE_URL = API_URL ? `${API_URL}/calls/decline` : null;
export const INCOMING_TIMEOUT_MS = 45000;

function parse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function extractCallPush(payload) {
  const layers = [
    payload?.data,
    payload?.notification?.data,
    payload?.notification?.request?.content?.data,
    payload,
  ];
  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') continue;
    if (typeof layer.type === 'string') return layer;
    for (const key of ['dataString', 'body', 'data']) {
      const inner = parse(layer[key]);
      if (inner && typeof inner.type === 'string') return inner;
    }
  }
  return null;
}

export function callSubtitle(ticketNumber) {
  return ticketNumber ? `Voice call · Ticket #${ticketNumber}` : 'Voice call';
}

if (!TaskManager.isTaskDefined(CALL_PUSH_TASK)) {
  TaskManager.defineTask(CALL_PUSH_TASK, async ({ data, error }) => {
    if (error) return;
    const msg = extractCallPush(data);
    if (!msg?.callId) return;

    if (msg.type === 'call_invite') {
      if (AppState.currentState === 'active') return;
      CallUi.showIncomingCall({
        callId: msg.callId,
        callerName: msg.callerName,
        subtitle: callSubtitle(msg.ticketNumber),
        declineUrl: DECLINE_URL,
        declineToken: msg.declineToken ?? null,
        timeoutMs: INCOMING_TIMEOUT_MS,
      });
      return;
    }

    if (msg.type === 'call_cancel') {
      CallUi.dismissIncomingCall(msg.callId);
    }
  });
}

Notifications.registerTaskAsync?.(CALL_PUSH_TASK).catch(() => {});
