import { supabase } from '../supabase/client.js';
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

const EXCLUDED_KEYS = [
  'edusync_custom_subjects',
  'edusync_roadmaps',
  'edusync_universities',
  'edusync_regulations',
  'edusync_deleted_universities',
  'edusync_features',
  'edusync_disabled_features',
  'edusync_users',
  'edusync_subadmins',
  'edusync_url_requests',
  'edusync_session_user',
];

function shouldSyncKey(key) {
  if (typeof key !== 'string' || !key.startsWith(LEGACY_PREFIX)) {
    return false;
  }
  if (
    EXCLUDED_KEYS.includes(key) ||
    key.startsWith('edusync_units_') ||
    key.startsWith('edusync_admin_')
  ) {
    return false;
  }
  return true;
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

    // Sync sub-admins globally from remote state
    if (supabase) {
      const { data, error } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', 'edusync_subadmins')
        .single();
      if (!error && data?.value) {
        localStorage.setItem('edusync_subadmins', data.value);
        console.log('[AUTH] Loaded global subadmins from database');
      }
    }
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

    if (this === window.localStorage && !isHydrating) {
      if (shouldSyncKey(key)) {
        saveRemoteKey(key, String(value));
      } else if (key === 'edusync_subadmins' && supabase) {
        supabase
          .from('app_state')
          .upsert({ key: 'edusync_subadmins', value: String(value), updated_at: new Date().toISOString() })
          .then(({ error }) => {
            if (error) console.error('[AUTH] Failed to sync subadmins to DB:', error.message);
            else console.log('[AUTH] Synced subadmins to DB successfully');
          });
      }
    }
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    originalRemoveItem.call(this, key);

    if (this === window.localStorage && !isHydrating) {
      if (shouldSyncKey(key)) {
        removeRemoteKey(key);
      } else if (key === 'edusync_subadmins' && supabase) {
        supabase
          .from('app_state')
          .delete()
          .eq('key', 'edusync_subadmins')
          .then(({ error }) => {
            if (error) console.error('[AUTH] Failed to remove subadmins from DB:', error.message);
          });
      }
    }
  };

  window[PATCH_FLAG] = true;
}

