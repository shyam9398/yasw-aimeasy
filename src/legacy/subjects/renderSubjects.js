// Common legacy helpers used across modules
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const js = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const sb = () => window.__AIMEASY_SUPABASE__;
const todayKeyDb = (date = new Date()) => date.toISOString().slice(0, 10);
const pctFromCgpa = (cgpa) => Math.max(0, Math.min(100, Number(cgpa || 0) * 9.5));

export async function renderSubjects(sem) {
  const grid = document.getElementById('subject-grid');
  if (grid) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text3);"><div style="font-size:3rem;margin-bottom:1rem;">⏳</div><div style="font-weight:700;font-size:1rem;">Loading subjects...</div></div>';
  }

  // ── 1. Wait for Supabase client ─────────────────────────────────────────
  let sc = window.__AIMEASY_SUPABASE__;
  let wc = 0;
  while (!sc && wc < 5000) { await new Promise(r => setTimeout(r, 100)); wc += 100; sc = window.__AIMEASY_SUPABASE__; }
  if (!sc) {
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;">⚠️ Connection error. Please refresh.</div>';
    return;
  }

  // ── 2. Wait for authenticated session ──────────────────────────────────
  let session = null;
  let wa = 0;
  while (!session && wa < 8000) {
    try { const { data } = await sc.auth.getSession(); session = data?.session; } catch (e) { }
    if (!session) { await new Promise(r => setTimeout(r, 250)); wa += 250; }
  }
  console.log('[Student] Session', session?.user?.id ?? 'none (anonymous)');

  // ── 3. Load profile from Supabase ──────────────────────────────────────
  let profile = null;
  if (session?.user?.id) {
    try {
      const { data: p } = await sc.from('profiles')
        .select('university_name,regulation_code,branch_name,branch,semester')
        .eq('id', session.user.id)
        .maybeSingle();
      profile = p;
      console.log('[Student] Profile from Supabase', profile);
    } catch (e) { console.warn('[Student] Profile load failed', e); }
  }

  // ── 4. Resolve filter values ─────────────────────────────────────────────
  const appUser = APP.user || {};
  const university_name = profile?.university_name || appUser.university_name || appUser.university || null;
  const branch = profile?.branch_name || profile?.branch || appUser.branch || appUser.branch_name || null;
  const regulation_code = profile?.regulation_code || appUser.regulation_code || appUser.regulation || null;

  // ── 5. Semester: dropdown takes priority over profile ───────────────────
  const semester = sem
    || document.getElementById('sem-switcher')?.value
    || appUser.semester
    || profile?.semester
    || '1-1';

  console.log('[Student] Subject filters', { university_name, branch, regulation_code, semester });

  // ── 6. Wait for aimeasyFetchSubjects ────────────────────────────────────
  let wf = 0;
  while (!window.aimeasyFetchSubjects && wf < 3000) { await new Promise(r => setTimeout(r, 100)); wf += 100; }

  // ── 7. Fetch subjects ────────────────────────────────────────────────────
  let dbSubjects = [];
  if (window.aimeasyFetchSubjects) {
    const filters = { semester, university_name, branch, regulation_code };
    const { data, error } = await window.aimeasyFetchSubjects(filters);
    if (!error && data) dbSubjects = data;
    else if (error) console.error('[Student] fetchSubjects error', error);
  } else {
    // Direct fallback
    console.warn('[Student] Falling back to direct Supabase query');
    try {
      let q = sc.from('subjects').select('*').order('name', { ascending: true });
      if (semester) q = q.eq('semester', semester);
      if (branch) q = q.eq('branch', branch);
      if (regulation_code) q = q.eq('regulation_code', regulation_code);
      if (university_name) q = q.eq('university_name', university_name);
      const { data, error } = await q;
      if (!error && data) dbSubjects = data;
      else if (error) console.error('[Student] Direct query error', error);
    } catch (e) { console.error('[Student] Direct query failed', e); }
  }
  console.log('[Student] Subjects returned', dbSubjects.length);

  // ── 8. Render ────────────────────────────────────────────────────────────
  if (!grid) return;
  const colorOptions = ['teal', 'lavender', 'blue', 'green', 'amber'];
  const iconOptions = ['📖', '🔬', '💡', '🖥️', '⚡', '🧮', '🔧', '📡'];
  const colorMap = { teal: 'var(--teal-light)', lavender: 'var(--lavender-light)', blue: 'var(--primary-light)', green: 'var(--green-light)', amber: 'var(--amber-light)' };
  const textMap = { teal: 'var(--teal)', lavender: 'var(--lavender)', blue: 'var(--primary)', green: 'var(--green)', amber: 'var(--amber)' };

  const meta = document.getElementById('subjects-meta');
  if (meta) meta.textContent = `Sem ${semester} · ${branch || 'Branch'} · ${university_name || 'University'} ${regulation_code || ''}`;

  if (!dbSubjects.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text3);"><div style="font-size:3rem;margin-bottom:1rem;">📚</div><div style="font-weight:700;font-size:1rem;margin-bottom:4px;">No subjects available yet</div><div style="font-size:0.83rem;">Sub Admin hasn't published subjects for Sem ${semester} yet.</div></div>`;
    return;
  }

  grid.innerHTML = dbSubjects.map((s, i) => {
    const subj = { id: 'custom_' + s.id, rawId: s.id, name: s.name, code: s.code || '', credits: parseInt(s.credits) || 3, units: 5, color: colorOptions[i % colorOptions.length], icon: iconOptions[i % iconOptions.length] };
    const progress = getSubjectProgress(subj);
    const bg = colorMap[subj.color] || colorMap.blue;
    const tx = textMap[subj.color] || textMap.blue;
    return `<div class="subject-card" onclick="openSubject('${subj.id}')" style="animation-delay:${i * 0.06}s">
      <div class="subject-card-header" style="background:linear-gradient(135deg,${bg},rgba(255,255,255,0.5));">
        <span style="position:absolute;top:8px;right:8px;font-size:0.65rem;background:var(--teal);color:#fff;padding:2px 7px;border-radius:50px;font-weight:700;">NEW</span>
        <div class="subject-icon">${subj.icon}</div>
        <div class="subject-name">${subj.name}</div>
        <div class="subject-code">${subj.code} · ${subj.credits} Credits</div>
      </div>
      <div class="subject-card-body">
        <div class="subject-meta">
          <span class="badge" style="background:${bg};color:${tx}">${subj.units} Units</span>
          <span class="badge badge-primary">${subj.credits} Cr</span>
        </div>
        <div class="subject-progress-row">
          <span class="subject-progress-label">Progress</span>
          <span class="subject-progress-val" style="color:${tx}">${progress}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%;background:linear-gradient(90deg,${tx},${bg});"></div></div>
      </div>
    </div>`;
  }).join('');
}
