// Common legacy helpers used across modules
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const js = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const sb = () => window.__AIMEASY_SUPABASE__;
const todayKeyDb = (date = new Date()) => date.toISOString().slice(0, 10);
const pctFromCgpa = (cgpa) => Math.max(0, Math.min(100, Number(cgpa || 0) * 9.5));

export async function openSubject(id) {
  // Enrich built-in subject with logged-in student profile fields if missing
  const sem = document.getElementById('sem-switcher')?.value || APP.user?.semester || '3-1';
  const uni = APP.user?.university || 'JNTUK';
  const reg = APP.user?.regulation || 'R23';
  const branch = APP.user?.branch || 'CSE';

  const builtinSubjects = SUBJECTS_DB[sem] || SUBJECTS_DB['3-1'];
  let subj = builtinSubjects.find(s => s.id === id);

  // Also search custom subjects created by sub admin
  if (!subj && id.startsWith('custom_')) {
    const rawId = id.replace('custom_', '');
    let dbSubjects = [];
    if (window.aimeasyFetchSubjects) {
      const filters = {
        semester: sem,
        university_name: uni,
        branch: branch,
        regulation_code: reg
      };
      const { data, error } = await window.aimeasyFetchSubjects(filters);
      if (!error && data) dbSubjects = data;
    }
    const cs = dbSubjects.find(s => String(s.id) === rawId);
    if (cs) {
      const colorOptions = ['teal', 'lavender', 'blue', 'green', 'amber'];
      let unitCount = 5;
      if (window.aimeasyFetchUnits) {
        const { data: units } = await window.aimeasyFetchUnits(cs.id);
        if (units) unitCount = units.length;
      }
      subj = {
        id: id,
        rawId: cs.id,
        name: cs.name,
        code: cs.code,
        credits: parseInt(cs.credits) || 3,
        units: unitCount,
        progress: 0,
        color: colorOptions[0],
        icon: '\u{1F4D6}',
        isCustom: true,
        sem: sem,
        uni: uni,
        reg: reg,
        branch: branch
      };
    }
  }

  if (!subj) return;
  APP.currentSubject = subj;
  addToRecentlyOpened(subj.name, subj.code, subj.icon, subj.id);
  recordStudyActivity('subject_opened', { subjectId: subj.id, subjectName: subj.name });
  navigateTo('units');

  const topTitleEl = document.getElementById('topbar-title');
  if (topTitleEl) topTitleEl.textContent = subj.name;
  const breadEl = document.getElementById('topbar-breadcrumb');
  if (breadEl) breadEl.innerHTML = `Subjects / <span>${subj.name}</span>`;

  const tagsEl = document.getElementById('units-tags');
  if (tagsEl) {
    const progress = getSubjectProgress(subj);
    tagsEl.innerHTML = `<span class="badge badge-primary">${subj.code}</span><span class="badge badge-teal">${subj.credits} Credits</span><span class="badge badge-lavender">${progress}% Complete</span>`;
  }

  await renderUnits(subj);
}
