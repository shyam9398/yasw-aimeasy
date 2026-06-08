import { supabase } from '../supabase/client.js';
import { getCurrentBranch, isSameBranch } from '../auth/branchContext.js';

function normalizeSubject(subject) {
  return {
    name: subject?.name || 'Untitled Subject',
    code: subject?.code || null,
    branch: subject?.branch || null,
    regulation_code: subject?.reg || subject?.regulation_code || null,
    semester: subject?.sem || subject?.semester || null,
    university_name: subject?.uni || subject?.university_name || null,
    created_by: subject?.createdBy || 'subadmin',
  };
}

function logRoadmap(message, payload) {
  try {
    if (payload === undefined) console.log(`[ROADMAP] ${message}`);
    else console.log(`[ROADMAP] ${message}`, payload);
  } catch {
    /* ignore logging failures */
  }
}

function logDb(message, payload) {
  try {
    if (payload === undefined) console.log(`[DB] ${message}`);
    else console.log(`[DB] ${message}`, payload);
  } catch {
    /* ignore logging failures */
  }
}

async function findSubject(row) {
  let query = supabase.from('subjects').select('*').eq('name', row.name).maybeSingle();
  if (row.code) query = query.eq('code', row.code);
  if (row.branch) query = query.eq('branch', row.branch);
  if (row.semester) query = query.eq('semester', row.semester);
  const exact = await query;
  if (exact.error || exact.data) return exact;
  if (row.branch) return { data: null, error: null };

  // Student-side subjects can be lighter than SubAdmin-created subjects.
  // Fall back to the stable curriculum identity instead of creating an empty twin.
  const loose = await supabase
    .from('subjects')
    .select('*')
    .eq('name', row.name)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return loose;
}

export async function ensureSubject(subject, { createIfMissing = true } = {}) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  if (subject?.dbSubjectId) return { data: { id: subject.dbSubjectId }, error: null };
  const row = normalizeSubject(subject);
  const found = await findSubject(row);
  if (found.error) return { data: null, error: found.error };
  if (found.data) return { data: found.data, error: null };
  if (!createIfMissing) return { data: null, error: new Error(`Subject not found: ${row.name}`) };
  return supabase.from('subjects').insert(row).select().single();
}

export async function ensureUnit(subjectId, unit) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  if (unit?.dbUnitId) return { data: { id: unit.dbUnitId }, error: null };
  const sortOrder = Number(unit?.id || unit?.sort_order || 0);
  const found = await supabase
    .from('units')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('sort_order', sortOrder)
    .maybeSingle();
  if (found.error) return { data: null, error: found.error };
  if (found.data) return { data: found.data, error: null };
  return supabase
    .from('units')
    .insert({
      subject_id: subjectId,
      title: unit?.name || unit?.title || `Unit ${sortOrder || ''}`.trim(),
      sort_order: sortOrder,
    })
    .select()
    .single();
}

async function deleteExistingRoadmapRows(subjectId, unitId) {
  return supabase
    .from('topics')
    .delete()
    .eq('subject_id', subjectId)
    .eq('unit_id', unitId);
}

export async function saveUnitRoadmap({ subject, unit, topics }) {
  logRoadmap('SAVE START', { subject: subject?.name, unit: unit?.id || unit?.sort_order, topicCount: topics?.length || 0 });
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const subjectResult = await ensureSubject(subject);
  if (subjectResult.error) return subjectResult;
  const unitResult = await ensureUnit(subjectResult.data.id, unit);
  if (unitResult.error) return unitResult;

  const subjectId = subjectResult.data.id;
  const unitId = unitResult.data.id;
  const removed = await deleteExistingRoadmapRows(subjectId, unitId);
  if (removed.error) return { data: null, error: removed.error };

  const savedTopics = [];
  for (const [topicIndex, topic] of (topics || []).entries()) {
    const legacyTopicId = topic.id || `${unitId}-${topicIndex + 1}`;
    const videos = Array.isArray(topic.videos)
      ? topic.videos
      : (topic.youtubeUrls || topic.urls || []).map((url) => ({ url, description: '' }));
    const cleanVideos = videos
      .map((video, videoIndex) => ({
        url: (video.url || video.youtubeUrl || '').trim(),
        subTopicName: (video.subTopicName || video.sub_topic_name || video.title || '').trim(),
        description: video.description || video.title || '',
        displayOrder: videoIndex + 1,
      }))
      .filter((video) => video.url || video.description);

    const topicInsert = await supabase
      .from('topics')
      .insert({
        subject_id: subjectId,
        unit_id: unitId,
        topic_name: topic.name || topic.topicName || `Topic ${topicIndex + 1}`,
        display_order: topicIndex + 1,
      })
      .select()
      .single();
    if (topicInsert.error) return { data: null, error: topicInsert.error };
    logRoadmap('Topic Saved', { subjectId, unitId, topicId: topicInsert.data.id, topicName: topicInsert.data.topic_name, table: 'topics', databaseResponse: topicInsert.data });
    logDb('Topic Saved', { subjectId, unitId, topicId: topicInsert.data.id, topicName: topicInsert.data.topic_name });

    const savedVideos = [];
    for (const [videoIndex, video] of cleanVideos.entries()) {
      if (!video.url) continue;
      const videoInsert = await supabase
        .from('topic_videos')
        .insert({
          topic_id: topicInsert.data.id,
          sub_topic_name: video.subTopicName || `Video ${videoIndex + 1}`,
          video_url: video.url,
          description: video.description || '',
          display_order: videoIndex + 1,
        })
        .select()
        .single();
      if (videoInsert.error) return { data: null, error: videoInsert.error };
      logRoadmap('Video Saved', { subjectId, unitId, topicId: topicInsert.data.id, videoId: videoInsert.data.id, url: video.url, table: 'topic_videos', databaseResponse: videoInsert.data });
      logDb('Video Saved', { subjectId, unitId, topicId: topicInsert.data.id, videoId: videoInsert.data.id, videoUrl: video.url });
      savedVideos.push({
        subTopicName: videoInsert.data.sub_topic_name || video.subTopicName || `Video ${videoIndex + 1}`,
        url: videoInsert.data.video_url || '',
        description: videoInsert.data.description || '',
        dbContentId: videoInsert.data.id,
      });
    }

    savedTopics.push({
      id: topicInsert.data.id || legacyTopicId,
      dbContentId: topicInsert.data.id,
      topicName: topicInsert.data.topic_name,
      name: topicInsert.data.topic_name,
      description: savedVideos[0]?.description || cleanVideos[0]?.description || '',
      videos: savedVideos.length ? savedVideos : cleanVideos,
      youtubeUrl: cleanVideos[0]?.url || '',
      youtubeUrls: cleanVideos.map((video) => video.url).filter(Boolean),
      url: cleanVideos[0]?.url || '',
      urls: cleanVideos.map((video) => video.url).filter(Boolean),
      displayOrder: topicIndex + 1,
    });
  }

  logRoadmap('FETCH START', { subjectId, unitId });
  const reloaded = await fetchUnitRoadmap({ subject: { ...subject, dbSubjectId: subjectId }, unit: { ...unit, dbUnitId: unitId } });
  if (reloaded.error) return reloaded;
  logRoadmap('Save Success', { subjectId, unitId, topicCount: reloaded.data?.topics?.length || 0, databaseResponse: reloaded.data });
  return { data: { subjectId, unitId, topics: reloaded.data?.topics || savedTopics }, error: null };
}

export async function fetchUnitRoadmap({ subject, unit }) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const subjectResult = await ensureSubject(subject, { createIfMissing: false });
  if (subjectResult.error) {
    logRoadmap('FETCH FAILED', subjectResult.error);
    return subjectResult;
  }
  const unitResult = await ensureUnit(subjectResult.data.id, unit);
  if (unitResult.error) {
    logRoadmap('FETCH FAILED', unitResult.error);
    return unitResult;
  }

  const topicResult = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectResult.data.id)
    .eq('unit_id', unitResult.data.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (topicResult.error) {
    logRoadmap('FETCH FAILED', topicResult.error);
    return { data: null, error: topicResult.error };
  }
  logDb('Topics Loaded', { subjectId: subjectResult.data.id, unitId: unitResult.data.id, count: topicResult.data?.length || 0 });

  const topicIds = (topicResult.data || []).map((topic) => topic.id).filter(Boolean);
  const videoResult = topicIds.length
    ? await supabase
      .from('topic_videos')
      .select('*')
      .in('topic_id', topicIds)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
    : { data: [], error: null };
  if (videoResult.error) {
    logRoadmap('FETCH FAILED', videoResult.error);
    return { data: null, error: videoResult.error };
  }

  const videos = videoResult.data || [];
  const topics = (topicResult.data || [])
    .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0))
    .map((topic, index) => {
      const legacyTopicId = topic.id;
      const topicVideos = videos
        .filter((video) => video.topic_id === topic.id)
        .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0))
        .map((video) => ({
          subTopicName: video.sub_topic_name || video.title || '',
          url: video.video_url || video.url || '',
          description: video.description || '',
          dbContentId: video.id,
        }));
      const finalVideos = topicVideos;
      return {
        id: legacyTopicId,
        dbContentId: topic.id,
        topicName: topic.topic_name || topic.title,
        name: topic.topic_name || topic.title,
        description: finalVideos[0]?.description || '',
        videos: finalVideos,
        youtubeUrl: finalVideos[0]?.url || '',
        youtubeUrls: finalVideos.map((video) => video.url).filter(Boolean),
        url: finalVideos[0]?.url || '',
        urls: finalVideos.map((video) => video.url).filter(Boolean),
        displayOrder: topic.display_order || index + 1,
      };
    });

  const data = {
    subjectId: subjectResult.data.id,
    unitId: unitResult.data.id,
    topics,
  };
  logRoadmap('Fetch Success', { subjectId: data.subjectId, unitId: data.unitId, topicCount: topics.length, databaseResponse: data });
  return {
    data,
    error: null,
  };
}

export async function saveLinkedContentItem(payload) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const activeBranch = getCurrentBranch(payload.branch || payload.subject?.branch);
  if (activeBranch && payload.subject?.branch && !isSameBranch(payload.subject.branch, activeBranch)) {
    return { data: null, error: new Error('Subject does not belong to the active branch.') };
  }
  const subjectResult = await ensureSubject(payload.subject);
  if (subjectResult.error) return subjectResult;
  const unitResult = await ensureUnit(subjectResult.data.id, payload.unit);
  if (unitResult.error) return unitResult;

  const result = await supabase
    .from('content_items')
    .insert({
      subject_id: subjectResult.data.id,
      unit_id: unitResult.data.id,
      content_type: payload.contentType,
      title: payload.title || payload.question || '',
      body: payload.body || payload.question || '',
      url: payload.url || '',
      metadata: {
        ...(payload.metadata || {}),
        branch: activeBranch || payload.metadata?.branch || null,
        topicTitle: payload.topicTitle || null,
        topicLegacyId: payload.topicLegacyId || null,
      },
      created_by: payload.createdBy || 'subadmin',
    })
    .select()
    .single();
  if (result.error) {
    logRoadmap('CONTENT SAVE FAILED', result.error);
  } else {
    logRoadmap('CONTENT SAVE SUCCESS', {
      subjectId: subjectResult.data.id,
      unitId: unitResult.data.id,
      contentId: result.data?.id,
      contentType: payload.contentType,
      databaseResponse: result.data,
    });
  }
  return result;
}

export async function fetchCurriculumStats() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const [subjects, units, roadmapTopics, roadmapVideos, notes, pyqs, iqs] = await Promise.all([
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
    supabase.from('units').select('*', { count: 'exact', head: true }),
    supabase.from('topics').select('*', { count: 'exact', head: true }),
    supabase.from('topic_videos').select('*', { count: 'exact', head: true }),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('content_type', 'note'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('content_type', 'pyq'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('content_type', 'iq'),
  ]);
  const error = [subjects, units, roadmapTopics, roadmapVideos, notes, pyqs, iqs].find((item) => item.error)?.error;
  if (error) return { data: null, error };
  return {
    data: {
      subjects: subjects.count || 0,
      units: units.count || 0,
      topics: roadmapTopics.count || 0,
      notes: notes.count || 0,
      pyqs: pyqs.count || 0,
      iqs: iqs.count || 0,
      videos: roadmapVideos.count || 0,
      roadmapTopics: roadmapTopics.count || 0,
      roadmapVideos: roadmapVideos.count || 0,
    },
    error: null,
  };
}
