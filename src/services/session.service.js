const { randomUUID } = require('crypto');
const cache = require('./cache.service');

const SESSION_TTL_SECONDS = 60 * 60 * 24;
const HISTORY_LIMIT = 50;

function buildSessionKey(sessionId) {
  return `session:${sessionId}`;
}

function getOrCreateSession(sessionId, userId = 'guest') {
  const resolvedSessionId = sessionId || randomUUID();
  const key = buildSessionKey(resolvedSessionId);
  let session = cache.get(key);

  if (!session) {
    session = {
      userId,
      sessionId: resolvedSessionId,
      lastActivityAt: new Date().toISOString(),
      feedState: {
        index: 0,
        currentVideoId: null,
        progress: 0,
      },
      history: [],
    };
  }

  cache.set(key, session, SESSION_TTL_SECONDS);
  return session;
}

function touchSession(sessionId, payload = {}) {
  const session = getOrCreateSession(sessionId, payload.userId);
  const nextHistory = Array.isArray(payload.historyAppend)
    ? [...session.history, ...payload.historyAppend]
    : session.history;

  const updated = {
    ...session,
    userId: payload.userId || session.userId,
    lastActivityAt: new Date().toISOString(),
    feedState: {
      ...session.feedState,
      ...(payload.feedState || {}),
    },
    history: nextHistory.slice(-HISTORY_LIMIT),
  };

  cache.set(buildSessionKey(sessionId), updated, SESSION_TTL_SECONDS);
  return updated;
}

module.exports = {
  getOrCreateSession,
  touchSession,
};
