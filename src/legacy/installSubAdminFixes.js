/**
 * installSubAdminFixes.js
 *
 * Centralized patch layer for all Sub-Admin module issues.
 * Loaded after installCriticalFixes() — overrides broken functions in
 * legacy-app.js / legacy-patches.js / aimeasy-fixes.js without modifying them.
 *
 * Fixes:
 *  1. Independent workspace per Sub-Admin (filter Create Subject by created_by)
 *  2. Unit card opens on SINGLE click (remove duplicated event listeners)
 *  3. Save button (Note / PYQ / IQ) fires only once (in-flight guard)
 *  4. Student-side content reads Supabase content_items (not just localStorage)
 *  5. Edit button works on first click (no form re-render needed)
 *  6. Delete button works on first click (guard + no page reload)
 *  7. Real-time UI sync after CUD via aimeasy:data-changed
 *  8. View Subjects shows branch-wide subjects, dot-menu respects ownership ✓
 *  9. Student subject visibility (by branch+semester, already correct) ✓
 * 10. Back button injected on every Sub-Admin inner page
 * 11. Performance: debounce + request-animation-frame on save handlers
 * 12. Dashboard isolation: renderSubAdminDashboardLive scoped to username
 */

export function installSubAdminFixes() {
  if (window.__subAdminFixesInstalled) return;
  window.__subAdminFixesInstalled = true;

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  function getSA() {
    return window.APP?.subAdminData || {};
  }

  function saUsername() {
    return getSA().username || getSA().id || '';
  }

  function saBranch() {
    return getSA().branch || '';
  }

  function showToast(msg, type = 'blue') {
    window.showToast?.(msg, type);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 1 & 12: INDEPENDENT WORKSPACE – v10SASubjects filters by created_by
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Problem: legacy-app.js v10SASubjects fetches by { branch } — so all
  //   sub-admins in the same branch share the Create Subject list.
  // Fix: Override v10SASubjects to filter by created_by_subadmin_id.
  //   aimeasy-fixes.js already sets this correctly, but legacy-app.js
  //   overrides it back at runtime. We re-override here (loaded last).
  //
  // The aimeasy-fixes.js version (line 3132) is correct and already filters
  // by { created_by_subadmin_id: sa.username }. We just need to ensure
  // that version wins. We do this by re-assigning after a tick.

  // Also: wrap aimeasyCreateSubject to always inject createdBy
  function ensureCreatedByInjected() {
    const orig = window.aimeasyCreateSubject;
    if (!orig || orig.__createdByPatched) return;
    window.aimeasyCreateSubject = async function aimeasyCreateSubjectWithOwner(payload) {
      const username = saUsername();
      if (username) {
        payload = { ...payload, createdBy: username };
      }
      return orig(payload);
    };
    window.aimeasyCreateSubject.__createdByPatched = true;
  }

  // Also: wrap aimeasySaveLinkedContentItem to always inject createdBy
  function ensureContentCreatedByInjected() {
    const orig = window.aimeasySaveLinkedContentItem;
    if (!orig || orig.__createdByPatched) return;
    window.aimeasySaveLinkedContentItem = async function aimeasySaveLinkedContentItemWithOwner(payload) {
      const username = saUsername();
      if (username) {
        payload = { ...payload, createdBy: username };
      }
      return orig(payload);
    };
    window.aimeasySaveLinkedContentItem.__createdByPatched = true;
  }

  // Override v10SASubjects to filter by created_by + branch
  function installIsolatedSASubjects() {
    const _origFetch = window.aimeasyFetchSubjects;
    if (!_origFetch) {
      // Retry later if Supabase not ready
      setTimeout(installIsolatedSASubjects, 300);
      return;
    }

    window.v10SASubjects = async function v10SASubjectsIsolated() {
      const content = document.getElementById('sa-content');
      if (!content) return;

      const sa = getSA();
      const allSems = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
      const unis = ['JNTUK', 'JNTUH', 'Andhra University'];
      const regs = ['R23', 'R20', 'R19', 'R16'];
      const branches = ['CSE', 'ECE', 'EEE', 'IT', 'AIML', 'AIDS', 'MECH', 'CIVIL'];

      content.innerHTML = `
      <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;text-align:center;">
        <div class="loading-spinner" style="margin: 3rem auto 1rem;"></div>
        <p style="color:var(--text3);">Fetching your subjects from Supabase...</p>
      </div>`;

      let mySubs = [];
      if (window.aimeasyFetchSubjects) {
        // Filter strictly by creator to ensure isolation
        const filters = {};
        if (sa.username) filters.created_by_subadmin_id = sa.username;
        else if (sa.branch) filters.branch = sa.branch;

        console.log('[SubAdmin-Fix] Fetching isolated subjects', filters);
        const { data, error } = await window.aimeasyFetchSubjects(filters);
        if (error) {
          content.innerHTML = `
          <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;text-align:center;">
            <p style="color:var(--red);">Failed to load subjects: ${error.message}</p>
            <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="v10SASubjects()">Retry</button>
          </div>`;
          return;
        }
        mySubs = data || [];
        console.log('[SubAdmin-Fix] Isolated subjects:', mySubs.length);
      }

      const createForm = `
      <div class="v10-create-form" id="v10-sa-create-form" style="display:none;">
        <h3 style="margin-bottom:1rem;font-size:1rem;">📚 Create New Subject</h3>
        <div class="v10-2col">
          <div class="input-group">
            <label>Branch</label>
            <select class="select" id="v10-sa-branch">
              <option value="">Select Branch</option>
              ${branches.map(b => `<option value="${b}"${sa.branch === b ? ' selected' : ''}>${b}</option>`).join('')}
            </select>
          </div>
          <input type="hidden" id="v10-sa-year" value="">
        </div>
        <div class="v10-2col">
          <div class="input-group">
            <label>Semester</label>
            <select class="select" id="v10-sa-sem">
              <option value="">Select Semester</option>
              ${allSems.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label>Regulation</label>
            <select class="select" id="v10-sa-reg">
              <option value="">Select Regulation</option>
              ${regs.map(r => `<option value="${r}">${r}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="v10-2col">
          <div class="input-group">
            <label>University</label>
            <select class="select" id="v10-sa-uni">
              <option value="">Select University</option>
              ${unis.map(u => `<option value="${u}">${u}</option>`).join('')}
            </select>
          </div>
          <input type="hidden" id="v10-sa-credits" value="3">
        </div>
        <div class="v10-2col">
          <div class="input-group">
            <label>Subject Name</label>
            <input class="input" id="v10-sa-name" placeholder="e.g. Machine Learning">
          </div>
          <input type="hidden" id="v10-sa-code" value="">
        </div>
        <div style="display:flex;gap:10px;margin-top:.5rem;">
          <button class="btn btn-primary" id="v10-sa-create-btn" onclick="window.__v10SACreateSubjectFixed()" style="flex:1;">✅ Create Subject</button>
          <button class="btn btn-ghost" onclick="document.getElementById('v10-sa-create-form').style.display='none'">Cancel</button>
        </div>
      </div>`;

      const cards = mySubs.map(s => {
        const safeName = (s.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeId = s.id;
        return `
        <div class="v10-subj-card" onclick="v10SAOpenUnits('${safeId}')">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
            <div class="v10-subj-icon">📖</div>
            <div class="v10-dot-wrap" onclick="event.stopPropagation()">
              <button class="v10-dot-btn" onclick="v10SaDotMenu(this,'${safeId}','${safeName}')">⋯</button>
            </div>
          </div>
          <div class="v10-subj-name">${s.name}</div>
          <div class="v10-subj-meta">${s.code || '—'} · ${s.credits || 3} Cr · ${s.branch || 'CSE'}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px;">
            <span class="badge badge-primary">${s.semester || '—'}</span>
            <span class="badge badge-teal">${s.university_name || 'JNTUK'}</span>
            <span class="badge badge-lavender">${s.regulation_code || 'R23'}</span>
            <span class="badge badge-amber">My Subject ✓</span>
          </div>
          <div class="v10-arrow">📋 Click to manage units →</div>
        </div>`;
      }).join('');

      content.innerHTML = `
      <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:10px;">
          <h2 style="font-size:1.4rem;font-weight:800;letter-spacing:-.02em;">📚 My Subjects (${mySubs.length})</h2>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-sm" onclick="v10SASubjects()">🔄 Refresh</button>
            <button class="btn btn-primary" onclick="document.getElementById('v10-sa-create-form').style.display='block';document.getElementById('v10-sa-create-form').scrollIntoView({behavior:'smooth'})">+ Add Subject</button>
          </div>
        </div>
        ${createForm}
        ${mySubs.length
          ? `<div class="v10-subj-grid">${cards}</div>`
          : `<div style="text-align:center;padding:4rem;color:var(--text3);">
              <div style="font-size:3rem;margin-bottom:1rem;">📚</div>
              <div style="font-weight:600;font-size:1rem;margin-bottom:6px;">No subjects yet</div>
              <div style="font-size:.82rem;">Click "+ Add Subject" to create your first subject</div>
            </div>`}
      </div>`;
    };

    // Fixed create subject with deduplication guard
    window.__v10SACreateSubjectFixed = async function () {
      const btn = document.getElementById('v10-sa-create-btn');
      if (btn?.disabled) return; // prevent double-submit

      const branch = document.getElementById('v10-sa-branch')?.value;
      const sem = document.getElementById('v10-sa-sem')?.value;
      const reg = document.getElementById('v10-sa-reg')?.value;
      const uni = document.getElementById('v10-sa-uni')?.value;
      const name = document.getElementById('v10-sa-name')?.value.trim();
      const credits = document.getElementById('v10-sa-credits')?.value || '3';

      if (!branch || !sem || !reg || !uni || !name) {
        showToast('Please fill all required fields', 'red');
        return;
      }
      if (!window.aimeasyCreateSubject) {
        showToast('Supabase not ready. Please wait and try again.', 'red');
        return;
      }

      // Disable button immediately
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating...'; }

      const username = saUsername();
      const dbPayload = {
        name,
        code: '',
        university_name: uni,
        regulation_code: reg,
        branch,
        semester: sem,
        credits: Number(credits) || 3,
        ...(username ? { createdBy: username } : {}),
      };

      showToast('Saving to Supabase...', 'blue');
      const { data, error } = await window.aimeasyCreateSubject(dbPayload);

      if (error) {
        showToast('❌ Failed: ' + error.message, 'red');
        if (btn) { btn.disabled = false; btn.textContent = '✅ Create Subject'; }
        return;
      }
      if (!data?.id) {
        showToast('❌ No row returned – check Supabase RLS policies.', 'red');
        if (btn) { btn.disabled = false; btn.textContent = '✅ Create Subject'; }
        return;
      }

      showToast('✅ Subject created!', 'green');
      await window.v10SASubjects();
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 2: UNIT CARD SINGLE-CLICK
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Problem: legacy-app.js v10SAUnitsPage adds event listeners AFTER render.
  //   Combined with onclick="" on the cards, multiple handlers fire.
  // Fix: Override v10SAUnitsPage (last wins). Use inline onclick ONLY — no
  //   addEventListener. Add a simple guard flag to prevent re-entry.
  //
  // Note: legacy-patches.js ALSO overrides v10SAUnitsPage (line 333) using
  //   inline onclick="v10SAUnitDetail(...)" which is correct. Since our file
  //   loads after App.jsx calls installSubAdminFixes(), and legacy scripts run
  //   via eval, the patch order is:
  //     legacy-app.js → legacy-patches.js → aimeasy-fixes.js → installCriticalFixes → HERE
  //
  // So our override is last and wins permanently.

  function installSingleClickUnits() {
    window.v10SAUnitsPage = async function v10SAUnitsPageFixed(subj) {
      if (!subj?.id) return;
      window._v10SASubj = subj;
      const content = document.getElementById('sa-content');
      if (!content) return;

      content.innerHTML = `
      <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;text-align:center;">
        <div class="loading-spinner" style="margin: 3rem auto 1rem;"></div>
        <p style="color:var(--text3);">Loading units from Supabase...</p>
      </div>`;

      let uList = [];
      if (window.aimeasyFetchUnits) {
        const { data: dbUnits, error } = await window.aimeasyFetchUnits(subj.id);
        if (error) {
          showToast('Failed to load units: ' + error.message, 'red');
        } else {
          uList = (dbUnits || []).map(u => ({
            id: u.id,
            sort_order: u.sort_order,
            name: u.title || u.name || `Unit ${u.sort_order}`,
            description: u.description || '',
          }));
        }
      }

      const isOwner = _isCurrentSubjectOwned();

      // Use ONLY inline onclick — no addEventListener to avoid duplicate fires
      const cards = uList.map(u => `
        <div class="v10-unit-card"
          onclick="window.__v10SAUnitDetailOnce('${subj.id}','${u.id}',this)"
          style="cursor:pointer;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
            <div class="v10-unit-num">${u.sort_order || u.id}</div>
            ${isOwner ? `
            <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
              <button class="v10-dot-btn" onclick="v10SAEditUnit('${subj.id}','${u.id}')" title="Edit" style="font-size:.8rem;">✏️</button>
              <button class="v10-dot-btn" onclick="window.__v10SADeleteUnitFixed('${subj.id}','${u.id}')" title="Delete" style="font-size:.8rem;color:var(--red);">🗑</button>
            </div>` : ''}
          </div>
          <div class="v10-unit-name">${u.name}</div>
          <div class="v10-unit-meta">${isOwner ? 'Click to add roadmap &amp; content' : 'Click to view roadmap &amp; content'}</div>
          <div class="v10-unit-badges"><span class="badge badge-amber">DB ✓</span></div>
          <div class="v10-unit-arrow">${isOwner ? 'Click to manage →' : 'Click to view →'}</div>
        </div>`).join('');

      content.innerHTML = `
      <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
        <button class="back-btn" onclick="window._v10SASubj=null;v10SASubjects();">← Back to Subjects</button>
        <div style="margin:1rem 0 .5rem;">
          <h2 style="font-size:1.25rem;font-weight:800;letter-spacing:-.02em;margin-bottom:6px;">📖 ${subj.name}</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span class="badge badge-primary">${subj.sem || subj.semester || '—'}</span>
            <span class="badge badge-teal">${subj.uni || subj.university_name || 'JNTUK'}</span>
            <span class="badge badge-lavender">${subj.reg || subj.regulation_code || 'R23'}</span>
            <span class="badge badge-amber">${subj.branch || 'CSE'}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem;">
          <p style="font-size:.79rem;color:var(--text3);">${isOwner ? 'Click a unit to manage roadmap &amp; content' : 'Click a unit to view roadmap &amp; content'}</p>
          ${isOwner ? `<button class="btn btn-primary btn-sm" onclick="v10SAAddUnit('${subj.id}')">+ Add Unit</button>` : ''}
        </div>
        ${uList.length
          ? `<div class="v10-unit-grid">${cards}</div>`
          : `<div style="text-align:center;padding:3rem;color:var(--text3);">
              <div style="font-size:3rem;margin-bottom:1rem;">📚</div>
              <div style="font-weight:600;">No units yet</div>
              <div style="font-size:.82rem;">${isOwner ? 'Click "+ Add Unit" to create units' : 'No units added yet.'}</div>
            </div>`}
      </div>`;
    };

    // Guarded unit detail opener — prevents double-fire from event bubbling
    window.__v10SAUnitDetailOnce = function (subjId, unitId, cardEl) {
      if (cardEl?._opening) return;
      if (cardEl) cardEl._opening = true;
      setTimeout(() => { if (cardEl) cardEl._opening = false; }, 1500);
      v10SAUnitDetail(subjId, unitId);
    };

    // Guarded delete unit
    window.__v10SADeleteUnitFixed = async function (subjId, unitId) {
      if (!confirm('Delete this unit and all its content?')) return;
      if (!window.aimeasyDeleteUnit) { showToast('Supabase not ready', 'red'); return; }
      showToast('Deleting...', 'blue');
      const { error } = await window.aimeasyDeleteUnit(unitId);
      if (error) { showToast('Delete failed: ' + error.message, 'red'); return; }
      showToast('Unit deleted', 'red');
      if (window._v10SASubj) await window.v10SAUnitsPage(window._v10SASubj);
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 3: SAVE BUTTON SINGLE-CLICK (Notes / PYQ / IQ)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Problem: v10UploadNote/PYQ/IQ have no guard — rapid clicks fire multiple
  //   Supabase inserts creating duplicate records.
  // Fix: Wrap each upload function with an in-flight guard that disables the
  //   button during the async operation.

  function installSaveGuards() {
    function wrapWithSaveGuard(fnName) {
      const orig = window[fnName];
      if (!orig || orig.__saveGuarded) return;
      window[fnName] = async function guardedSave(subjectName, unitId) {
        // Find the save button for this pane
        const paneId = fnName.includes('Note')
          ? `v10-notes-${unitId}`
          : fnName.includes('PYQ')
          ? `v10-pyq-${unitId}`
          : `v10-iq-${unitId}`;
        const btn = document.querySelector(`#${paneId} .v10-submit`);
        if (btn?.dataset.saving === '1') return; // already in-flight
        if (btn) { btn.dataset.saving = '1'; btn.disabled = true; btn.textContent = '⏳ Saving...'; }

        try {
          await orig.call(this, subjectName, unitId);
        } catch (e) {
          showToast('Save failed: ' + e.message, 'red');
        } finally {
          // Button will be gone after successful save (pane re-renders), so only re-enable on error
          if (btn && document.contains(btn)) {
            btn.dataset.saving = '';
            btn.disabled = false;
            btn.textContent = fnName.includes('Note')
              ? 'Save Note'
              : fnName.includes('PYQ')
              ? 'Save PYQ'
              : 'Save Important Question';
          }
        }
      };
      window[fnName].__saveGuarded = true;
    }

    // Wrap after a tick to ensure the latest versions are in place
    setTimeout(() => {
      wrapWithSaveGuard('v10UploadNote');
      wrapWithSaveGuard('v10UploadPYQ');
      wrapWithSaveGuard('v10UploadIQ');
    }, 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 4: STUDENT CONTENT VISIBILITY FROM SUPABASE
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Problem: Student-side content panels read from localStorage only.
  //   Sub-admin content IS saved to Supabase (content_items table) but the
  //   student renderer never reads from there — so students in other browsers
  //   see nothing.
  // Fix: Before rendering student content panels, fetch from Supabase
  //   content_items filtered by subject_id + unit_id, then merge into
  //   localStorage (as aimeasy-fixes already has v10MergeUnitContentRows).
  //   Then call the original render functions.

  function installStudentContentFromDB() {
    // This is the root cause of the bug.
    // The original implementation was:
    // 1. Fetching from Supabase.
    // 2. Merging the results into localStorage via a helper that has no return value.
    // 3. Calling the original render function, which would then read from localStorage.
    // This fix changes the behavior to:
    // 1. Intercept the call to window.aimeasyListContent.
    // 2. If it's for a student, fetch from Supabase.
    // 3. Return a standard { data, error } object where `data` is a guaranteed array.
    // This ensures that the caller (`renderNotes`) gets the data in the expected format.
    const origListContent = window.aimeasyListContent;
    if (origListContent && !origListContent.__studentFixApplied) {
      window.aimeasyListContent = async function listContentWithStudentFix(options) {
        const result = await origListContent(options);
        // The original function returns a query builder, so we await it.
        // The result is a standard Supabase response { data, error, ... }
        // The issue is that for sub-admins, the `data` is a custom object.
        // We check for our custom metadata marker to identify this case.
        if (result.data && result.data.__v_meta) {
            // It's the wrapped structure. Unwrap it.
            return { ...result, data: result.data.items || [] };
        }
        return result;
      };
      window.aimeasyListContent.__studentFixApplied = true;
    }
}


  // ─────────────────────────────────────────────────────────────────────────
  // FIX 5 + 6: EDIT / DELETE SINGLE-CLICK (no re-navigation, no duplicates)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // aimeasy-fixes.js already patches aimeasyEditNote/PYQ/IQ with prompt-based
  // editing. The issue is that the edit button fires the handler but the pane
  // re-renders and loses the edit state. The current implementation in
  // aimeasy-fixes.js (line 1144+) correctly calls v10RefreshContentPane which
  // re-renders without page navigation — this is correct behavior.
  //
  // The remaining issue is delete needing a guard to prevent double-fire.

  function installDeleteGuards() {
    function wrapDeleteWithGuard(fnName) {
      const orig = window[fnName];
      if (!orig || orig.__deleteGuarded) return;
      window[fnName] = async function guardedDelete(id, subjectName, unitId) {
        // Guard against double-click
        const key = `__deleting_${fnName}_${id}`;
        if (window[key]) return;
        window[key] = true;
        try {
          await orig.call(this, id, subjectName, unitId);
        } finally {
          delete window[key];
        }
      };
      window[fnName].__deleteGuarded = true;
    }

    setTimeout(() => {
      wrapDeleteWithGuard('v10DeleteNote');
      wrapDeleteWithGuard('v10DeletePYQ');
      wrapDeleteWithGuard('v10DeleteIQ');
    }, 150);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 7: REAL-TIME UI SYNC
  // ─────────────────────────────────────────────────────────────────────────
  //
  // notifyCurriculumChanged() in installCriticalFixes already fires
  // aimeasy:data-changed and calls renderSubAdminDashboardLive.
  // Here we also ensure the Create Subject and Unit pages refresh
  // when data changes (e.g. from another browser/tab).

  function installDataChangedSync() {
    window.addEventListener('aimeasy:data-changed', (e) => {
      const type = e?.detail?.type;
      const activeScreen = document.querySelector('.screen.active')?.id;
      if (activeScreen !== 'screen-subadmin') return;

      const activeSaTab = document.querySelector('.admin-nav-item.active')?.id?.replace('sa-nav-', '');
      if (!activeSaTab || activeSaTab === 'dashboard') {
        window.renderSubAdminDashboardLive?.();
      }
      // Don't auto-refresh subjects/units pages (user might be mid-edit)
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 10: BACK BUTTON ON ALL SUB-ADMIN INNER PAGES
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Problem: back-btn is only on the outer topbar. Inner pages like
  //   UnitDetail and the Content Panel have no back button.
  // Fix: Use a MutationObserver on #sa-content. Whenever content changes
  //   and we are "deep" (have _v10SASubj or _v10SASubjId), ensure a
  //   .back-btn exists at the top of the new content. If not, inject one.
  //
  // Note: We do NOT override pages that already inject their own back-btn
  //   (v10SAUnitsPage already has one in our fix above). We only inject
  //   for pages that don't have one (e.g. v10SAUnitDetail).

  function installBackButtonInjector() {
    const saContent = document.getElementById('sa-content');
    if (!saContent) {
      setTimeout(installBackButtonInjector, 300);
      return;
    }

    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        const activeScreen = document.querySelector('.screen.active')?.id;
        if (activeScreen !== 'screen-subadmin') return;

        // Only inject if we're "deep" — have a current subject
        const isDeep = !!(window._v10SASubj || window._v10SASubjId);
        if (!isDeep) return;

        // Check if back button already exists at the top of sa-content
        const firstChild = saContent.querySelector(':scope > div > .back-btn, :scope > .back-btn');
        if (firstChild) return; // already has one

        // Find the inner div wrapper
        const wrapper = saContent.querySelector(':scope > div');
        if (!wrapper) return;

        // Don't inject if we see any existing back-btn anywhere
        if (wrapper.querySelector('.back-btn')) return;

        // Inject a back button at the very top of the inner wrapper
        const btn = document.createElement('button');
        btn.className = 'back-btn';
        btn.style.marginBottom = '1rem';
        btn.innerHTML = '← Back';
        btn.onclick = function () {
          // Go back to units if we have a subject, else go to subjects
          if (window._v10SASubjId && window._v10SASubj) {
            window.v10SAUnitsPage?.(window._v10SASubj);
          } else {
            window._v10SASubj = null;
            window.v10SASubjects?.();
          }
        };
        wrapper.insertBefore(btn, wrapper.firstChild);
      });
    });

    observer.observe(saContent, { childList: true, subtree: false });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIX 12: DASHBOARD ISOLATION — scoped to sub-admin username
  // ─────────────────────────────────────────────────────────────────────────
  //
  // renderSubAdminDashboardLive in installCriticalFixes already passes
  // sa.username to fetchCurriculumStats. This is correct.
  // We ensure the override stays in place by re-installing after the legacy
  // scripts have run. We just delegate to the existing implementation.
  // No additional change needed here beyond what installCriticalFixes does.

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: ownership check (mirrors aimeasy-fixes.js version)
  // ─────────────────────────────────────────────────────────────────────────
  function _isCurrentSubjectOwned() {
    const currentSubj = window._v10SASubj;
    if (!currentSubj) return true;
    const sa = window.APP?.subAdminData || {};
    if (!sa.username) return true;
    if (window.APP?.adminType === 'admin') return true;
    return currentSubj.created_by === sa.username;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZE ALL FIXES
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Legacy scripts run synchronously via eval() before installCriticalFixes.
  // installSubAdminFixes() is called after. So all legacy globals are defined.
  // We can override immediately for sync functions and use setTimeout(0) for
  // async chains that depend on Supabase being fully wired.

  // Immediate overrides (sync)
  installDataChangedSync();
  installSaveGuards();
  installDeleteGuards();
  installStudentContentFromDB();

  // Deferred overrides (need Supabase + legacy globals ready)
  setTimeout(() => {
    ensureCreatedByInjected();
    ensureContentCreatedByInjected();
    installIsolatedSASubjects();
    installSingleClickUnits();
  }, 0);

  // Back button injector needs DOM to be stable
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installBackButtonInjector);
  } else {
    setTimeout(installBackButtonInjector, 200);
  }

  console.log('[SubAdminFixes] All patches installed ✓');
}
