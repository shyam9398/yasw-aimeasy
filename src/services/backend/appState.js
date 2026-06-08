import { supabase } from '../supabase/client.js';

const TABLE_NAME = 'app_state';

export function hasRemoteBackend() {
  return Boolean(supabase);
}

export async function loadRemoteState() {
  if (!supabase) return {};

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.log('[AIM EASY backend] No authenticated user session found during loadRemoteState');
      return {};
    }

    console.log('Loading student profile', userId);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('key,value')
      .like('key', `%:${userId}`);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn(
          `[AIM EASY backend] Remote Supabase table "${TABLE_NAME}" is missing. Run supabase/schema.sql in your Supabase SQL editor.`
        );
      } else {
        console.warn('[AIM EASY backend] Could not load remote state:', error.message);
      }
      return {};
    }

    const remoteState = {};
    (data || []).forEach((row) => {
      if (row.key.endsWith(`:${userId}`)) {
        const originalKey = row.key.slice(0, -(userId.length + 1));
        remoteState[originalKey] = row.value;
      }
    });

    console.log('Profile data received', remoteState);
    if (remoteState['edusync_cgpa_data']) {
      try {
        const parsed = JSON.parse(remoteState['edusync_cgpa_data']);
        console.log('CGPA loaded', parsed);
      } catch (e) {
        console.warn('Failed to parse CGPA in log:', e);
      }
    }
    return remoteState;
  } catch (err) {
    console.error('[AIM EASY backend] loadRemoteState error:', err);
    return {};
  }
}

export async function saveRemoteKey(key, value) {
  if (!supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn('[AIM EASY backend] No authenticated user session found during saveRemoteKey');
      return;
    }

    const scopedKey = `${key}:${userId}`;
    if (key === 'edusync_cgpa_data') {
      console.log('Saving CGPA', value);
    }
    
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({ key: scopedKey, value, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Database save error', error);
      console.warn(`[AIM EASY backend] Could not save "${scopedKey}":`, error.message);
    } else {
      console.log('Database update success');
    }
  } catch (err) {
    console.error('[AIM EASY backend] saveRemoteKey error:', err);
  }
}

export async function removeRemoteKey(key) {
  if (!supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn('[AIM EASY backend] No authenticated user session found during removeRemoteKey');
      return;
    }

    const scopedKey = `${key}:${userId}`;
    const { error } = await supabase.from(TABLE_NAME).delete().eq('key', scopedKey);

    if (error) {
      console.warn(`[AIM EASY backend] Could not remove "${scopedKey}":`, error.message);
    } else {
      console.log('[AIM EASY backend] Database remove success for key:', scopedKey);
    }
  } catch (err) {
    console.error('[AIM EASY backend] removeRemoteKey error:', err);
  }
}
