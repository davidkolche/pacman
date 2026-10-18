// A tiny publish/subscribe hub. Modules announce what happened (emit) without
// knowing who reacts, and listeners react (on) without knowing who announced.
// One shared instance for the whole game, so everyone tunes in to the same "station".

const listenersByEvent = new Map();

export function on(eventName, listener) {
  if (!listenersByEvent.has(eventName)) {
    listenersByEvent.set(eventName, new Set());
  }
  listenersByEvent.get(eventName).add(listener);
}

export function off(eventName, listener) {
  listenersByEvent.get(eventName)?.delete(listener);
}

// Tests only: every test starts with no listeners, so one test's game,
// score or sounds never react to another test's events. The modules then
// subscribe again with their setup functions.
export function clearAllListeners() {
  listenersByEvent.clear();
}

export function emit(eventName, data) {
  const listeners = listenersByEvent.get(eventName);
  if (!listeners) {
    return;
  }
  // Iterate over a copy, so a listener that calls off() during the broadcast
  // cannot change the list we are walking through.
  for (const listener of [...listeners]) {
    listener(data);
  }
}
