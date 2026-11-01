/**
 * Frontend API Service Layer.
 * Interacts with FastAPI backend endpoints and handles Server-Sent Events (SSE) streaming.
 */

const API_BASE = '/api';

export async function fetchSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch chat sessions');
  return res.json();
}

export async function createSession(title = 'New Conversation', provider = 'gemini', model = 'gemini-1.5-flash') {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify({ title, provider, model }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function fetchSessionDetails(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to load session ${sessionId}`);
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete session');
  return res.json();
}

export async function updateSession(sessionId, updates) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to load model configuration');
  return res.json();
}

export async function updateConfig(payload) {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save configuration');
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/tokens`);
  if (!res.ok) throw new Error('Failed to load token analytics');
  return res.json();
}

export async function fetchCacheStats() {
  const res = await fetch(`${API_BASE}/cache/stats`);
  if (!res.ok) throw new Error('Failed to load cache statistics');
  return res.json();
}

export async function invalidateCache(pattern = '*') {
  const res = await fetch(`${API_BASE}/cache/invalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify({ pattern }),
  });
  if (!res.ok) throw new Error('Failed to invalidate cache');
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to load uploaded documents');
  return res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function deleteDocument(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function searchDocuments(query, docName = null) {
  const res = await fetch(`${API_BASE}/documents/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStringify({ query, doc_name: docName, top_k: 3 }),
  });
  if (!res.ok) throw new Error('Document search failed');
  return res.json();
}

function jsonStringify(data) {
  return JSON.stringify(data);
}

/**
 * Streams chat responses from the backend via Server-Sent Events (SSE).
 *
 * @param {Object} payload - { session_id, message, provider, model, temperature, max_tokens, system_prompt }
 * @param {Function} onEvent - callback(eventType, data)
 * @param {Function} onError - callback(error)
 * @param {Function} onComplete - callback()
 * @returns {AbortController} controller to cancel stream if needed
 */
export function streamChat(payload, onEvent, onError, onComplete) {
  const controller = new AbortController();

  fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server responded with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep last incomplete chunk

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let eventData = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              eventData = line.replace('data:', '').trim();
            }
          }

          if (eventData) {
            try {
              const parsed = JSON.parse(eventData);
              onEvent(eventType, parsed);
            } catch (e) {
              onEvent(eventType, eventData);
            }
          }
        }
      }

      onComplete();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

  return controller;
}

