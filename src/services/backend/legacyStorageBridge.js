import {
  hasRemoteBackend,
  loadRemoteState,
  removeRemoteKey,
  saveRemoteKey,
} from './appState.js';

const LEGACY_PREFIX = 'edusync_';
const PATCH_FLAG = '__aimeasyStorageBridgeInstalled';

let isHydrating = false;
const HYDRATION_TIMEOUT_MS = 1500;

function shouldSyncKey(key) {
  return typeof key === 'string' && key.startsWith(LEGACY_PREFIX);
}

export async function hydrateLegacyState() {
  if (!hasRemoteBackend()) {
    window.__AIMEASY_BACKEND_MODE__ = 'local';
    return;
  }

  isHydrating = true;
  try {
    const remoteState = await Promise.race([
      loadRemoteState(),
      new Promise((resolve) => window.setTimeout(() => resolve({}), HYDRATION_TIMEOUT_MS)),
    ]);

    Object.entries(remoteState).forEach(([key, value]) => {
      if (shouldSyncKey(key) && value != null) {
        localStorage.setItem(key, value);
      }
    });
  } catch (error) {
    console.warn('[AIM EASY backend] Hydration failed:', error.message);
  } finally {
    isHydrating = false;
  }

  window.__AIMEASY_BACKEND_MODE__ = 'supabase';
}

export function installLegacyStorageBridge() {
  if (window[PATCH_FLAG]) return;

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    originalSetItem.call(this, key, value);

    if (this === window.localStorage && shouldSyncKey(key) && !isHydrating) {
      saveRemoteKey(key, String(value));
    }
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    originalRemoveItem.call(this, key);

    if (this === window.localStorage && shouldSyncKey(key) && !isHydrating) {
      removeRemoteKey(key);
    }
  };

  window[PATCH_FLAG] = true;
}
