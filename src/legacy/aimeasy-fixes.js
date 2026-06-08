// AIIENS Edu targeted fixes: auth, regulations, counters, navigation, menus, and placeholders.
(function installAIIENSEduFixes() {
  const REG_KEY = 'edusync_regulations'; // legacy key (no longer used for regulation CRUD)
  const DEFAULT_UNIVERSITIES = [
    { name: 'JNTUK', code: 'JNTUK', state: 'Andhra Pradesh', status: 'Active' },
    { name: 'JNTUH', code: 'JNTUH', state: 'Telangana', status: 'Active' },
    { name: 'Andhra University', code: 'AU', state: 'Andhra Pradesh', status: 'Active' },
  ];

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || '') ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }


  function esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function normalizeStatus(value) {
    return String(value || 'Active').trim().toLowerCase();
  }

  function uniqueByName(rows) {
    const seen = new Set();
    const deletedDefaults = new Set(read('edusync_deleted_universities', []).map((name) => String(name || '').toLowerCase()));
    return rows
      .map((row) => ({
        name: String(row?.name || row?.university_name || row?.university || row?.code || row || '').trim(),
        code: String(row?.code || row?.university_code || row?.name || row || '').trim(),
        state: String(row?.state || '').trim(),
        status: String(row?.status || 'Active').trim() || 'Active',
        id: row?.id,
      }))
      .filter((row) => {
        const key = row.name.toLowerCase();
        return row.name && normalizeStatus(row.status) !== 'inactive' && normalizeStatus(row.status) !== 'deleted' && !deletedDefaults.has(key);
      })
      .filter((row) => {
        const key = row.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  let cachedRegulations = read('aimeasy_cached_regulations', []);
  try {
    const stored = localStorage.getItem('aimeasy_cached_regulations');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) {
        cachedRegulations = parsed;
      }
    }
  } catch (e) {}

  async function regulations() {
    const supabase = window.__AIMEASY_SUPABASE__;
    if (!supabase) return cachedRegulations;
    try {
      const { data } = await supabase
        .from('regulations')
        .select('regulation_name, regulation_code, status')
        .order('created_at', { ascending: true });
      const list = (data || [])
        .filter((r) => {
          const status = String(r?.status || '').trim().toLowerCase();
          return !status || status === 'active';
        })
        .map((r) => String(r.regulation_code || r.regulation_name || '').trim().toUpperCase())
        .filter(Boolean);
      cachedRegulations = list;
      localStorage.setItem('aimeasy_cached_regulations', JSON.stringify(list));
      localStorage.setItem('edusync_regulations', JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to fetch regulations from Supabase:', e);
    }
    return cachedRegulations;
  }

  async function universities() {
    const localRows = uniqueByName([...DEFAULT_UNIVERSITIES, ...read('edusync_universities', [])]);
    const supabase = window.__AIMEASY_SUPABASE__;
    if (!supabase) return localRows;
    try {
      const { data } = await supabase
        .from('universities')
        .select('id, name, code, state, status')
        .order('name', { ascending: true });
      const rows = uniqueByName([...DEFAULT_UNIVERSITIES, ...(data || []), ...read('edusync_universities', [])]);
      localStorage.setItem('edusync_universities', JSON.stringify(rows));
      return rows;
    } catch (e) {
      console.warn('Failed to fetch universities from Supabase:', e);
      return localRows;
    }
  }

  async function refreshRegulationUI() {
    // Re-render admin regulation manager + dropdowns (if present)
    try {
      if (window.APP?.adminType) {
        installRegulationManager?.();
      }
      await updateRegulationDropdowns?.();
      await updateUniversityDropdowns?.();
      await renderRegulationList?.();
      window.aiiensRefreshActiveAdminSurfaces?.();
    } catch (e) {
      // ignore
    }
  }



  async function updateRegulationDropdowns(root = document) {
    const regs = await regulations();
    root.querySelectorAll('select').forEach((select) => {

      const id = (select.id || '').toLowerCase();
      const label = (select.closest('.input-group')?.querySelector('label,.v10-label')?.textContent || '').toLowerCase();
      const onchange = select.getAttribute('onchange') || '';
      if (!id.includes('reg') && !label.includes('regulation') && !onchange.includes('reg')) return;
      const current = select.value;
      const first = onchange.includes('Filter') || onchange.includes('filter') ? 'All Regulations' : 'Select Regulation';
      select.innerHTML = `<option value="">${first}</option>` + regs.map((reg) => `<option value="${esc(reg)}"${current === reg ? ' selected' : ''}>${esc(reg)}</option>`).join('');
    });
  }
  window.aimeasyUpdateRegulationDropdowns = updateRegulationDropdowns;

  async function updateUniversityDropdowns(root = document) {
    const rows = await universities();
    root.querySelectorAll('select').forEach((select) => {
      const id = (select.id || '').toLowerCase();
      const label = (select.closest('.input-group')?.querySelector('label,.v10-label')?.textContent || '').toLowerCase();
      const onchange = select.getAttribute('onchange') || '';
      if (!id.includes('uni') && !label.includes('university') && !onchange.toLowerCase().includes('uni')) return;
      const current = select.value;
      const first = onchange.includes('Filter') || onchange.includes('filter') ? 'All Universities' : 'Select University';
      select.innerHTML = `<option value="">${first}</option>` + rows.map((row) => {
        const value = row.name || row.code;
        return `<option value="${esc(value)}"${current === value ? ' selected' : ''}>${esc(row.name || row.code)}</option>`;
      }).join('');
    });
    if (root === document && document.getElementById('university-list')) {
      window.aiiensRenderUniversities?.();
    }
  }
  window.aiiensUpdateUniversityDropdowns = updateUniversityDropdowns;

  async function installRegulationManager() {
    const content = document.getElementById('admin-content');
    if (!content || document.getElementById('aimeasy-regulation-manager')) return;
    const grid = content.querySelector('.admin-manage-grid') || content.querySelector('div[style*="grid-template-columns"]');
    if (!grid) return;
    const regs = await regulations();
    grid.insertAdjacentHTML('beforeend', `

      <div class="card" id="aimeasy-regulation-manager">
        <h3 style="margin-bottom:1rem;">Regulation Management</h3>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;">Created regulations are the only options shown to Sub Admin, Creator, and Student filters.</p>
        <div class="input-group">
          <label>New Regulation</label>
          <div style="display:flex;gap:8px;">
            <input class="input" id="aimeasy-reg-name" placeholder="e.g. R24">
            <button class="btn btn-primary btn-sm" onclick="aimeasyAddRegulation()">Add</button>
          </div>
        </div>
        <div style="margin-top:0.8rem;">
          ${regs.length ? regs.map((reg, index) => `
            <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:5px;font-size:0.85rem;">
              <span style="flex:1;font-weight:600;">${esc(reg)}</span>
              <span class="badge badge-green">Live</span>
              <button class="btn btn-ghost btn-sm" onclick="aimeasyEditRegulation(${index})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="aimeasyDeleteRegulation(${index})">Delete</button>
            </div>`).join('') : '<div style="font-size:0.82rem;color:var(--text3);padding:8px 0;">No regulations created yet.</div>'}
        </div>
      </div>`);
    await renderRegulationList();
  }

  async function renderRegulationList() {
    const list = document.getElementById('aimeasy-regulation-list');
    if (!list) return;
    const regs = await regulations();
    list.innerHTML = regs.length ? regs.map((reg, index) => `
      <div class="v10-item regulation-row">
        <div class="v10-item-body"><div class="v10-item-title">${esc(reg)}</div></div>
        <span class="badge badge-green">Live</span>
        <button class="btn btn-ghost btn-sm" onclick="aimeasyEditRegulation(${index})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="aimeasyDeleteRegulation(${index})">Delete</button>
      </div>`).join('') : '<div class="empty-state-card">No regulations created yet.</div>';
  }

  window.aimeasyAddRegulation = async function aimeasyAddRegulation() {
    const input = document.getElementById('aimeasy-reg-name');
    const reg = input?.value.trim().toUpperCase();
    if (!reg) {
      showToast('Enter regulation', 'red');
      return;
    }

    const supabase = window.__AIMEASY_SUPABASE__;
    if (!supabase) {
      cachedRegulations = [...new Set([...cachedRegulations, reg])];
      localStorage.setItem('aimeasy_cached_regulations', JSON.stringify(cachedRegulations));
      localStorage.setItem('edusync_regulations', JSON.stringify(cachedRegulations));
      showToast('Regulation saved.', 'green');
      await refreshRegulationUI();
      return;
    }

    // Check existence by regulation_code/name (case-insensitive match in UI)
    const { data: existing } = await supabase
      .from('regulations')
      .select('id, regulation_name, regulation_code')
      .or(`regulation_code.eq.${reg},regulation_name.eq.${reg}`);

    if (existing?.length) {
      showToast('Regulation already exists', 'amber');
      return;
    }

    let authUser = null;
    try {
      authUser = supabase.auth?.getUser ? (await supabase.auth.getUser())?.data?.user : null;
    } catch (e) {
      authUser = null;
    }
    const appUser = window.APP?.user || {};
    const createdBy = String(authUser?.id || authUser?.email || appUser.email || appUser.name || 'admin').trim() || 'admin';
    const regulationPayload = {
      regulation_name: reg,
      regulation_code: reg,
      university: appUser.university || appUser.university_name || 'JNTUK',
      status: 'active',
      created_by: createdBy,
    };
    const { error: insErr } = await supabase
      .from('regulations')
      .insert([regulationPayload]);

    if (insErr) {
      showToast(insErr.message || 'Failed to create regulation', 'red');
      return;
    }

    showToast('Regulation saved to Supabase.', 'green');
    await refreshRegulationUI();
  };



  window.aimeasyEditRegulation = async function aimeasyEditRegulation(index) {
    const regs = await regulations();
    const oldReg = regs[index];
    const next = prompt('Edit regulation:', oldReg);
    if (!next?.trim()) return;
    const updated = next.trim().toUpperCase();

    const supabase = window.__AIMEASY_SUPABASE__;
    if (!supabase) {
      cachedRegulations = regs.map((item, itemIndex) => itemIndex === index ? updated : item);
      localStorage.setItem('aimeasy_cached_regulations', JSON.stringify(cachedRegulations));
      localStorage.setItem('edusync_regulations', JSON.stringify(cachedRegulations));
      showToast('Regulation updated.', 'green');
      await refreshRegulationUI();
      return;
    }

    const { data: rows } = await supabase
      .from('regulations')
      .select('id')
      .or(`regulation_code.eq.${oldReg},regulation_name.eq.${oldReg}`);

    const id = rows?.[0]?.id;
    if (!id) {
      showToast('Regulation not found in DB', 'red');
      return;
    }

    const { error: upErr } = await supabase
      .from('regulations')
      .update({
        regulation_name: updated,
        regulation_code: updated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (upErr) {
      showToast(upErr.message || 'Failed to update regulation', 'red');
      return;
    }

    showToast('Regulation updated (Supabase).', 'green');
    await refreshRegulationUI();
  };



  window.aimeasyDeleteRegulation = async function aimeasyDeleteRegulation(index) {
    const regs = await regulations();
    if (!confirm(`Delete "${regs[index]}"?`)) return;

    const supabase = window.__AIMEASY_SUPABASE__;
    if (!supabase) {
      cachedRegulations = regs.filter((_, itemIndex) => itemIndex !== index);
      localStorage.setItem('aimeasy_cached_regulations', JSON.stringify(cachedRegulations));
      localStorage.setItem('edusync_regulations', JSON.stringify(cachedRegulations));
      showToast('Regulation deleted.', 'red');
      await refreshRegulationUI();
      return;
    }

    const delVal = regs[index];
    const { data: rows } = await supabase
      .from('regulations')
      .select('id')
      .or(`regulation_code.eq.${delVal},regulation_name.eq.${delVal}`);

    const id = rows?.[0]?.id;
    if (!id) {
      showToast('Regulation not found in DB', 'red');
      return;
    }

    const { error: delErr } = await supabase.from('regulations').delete().eq('id', id);
    if (delErr) {
      showToast(delErr.message || 'Failed to delete regulation', 'red');
      return;
    }

    showToast('Regulation deleted (Supabase).', 'red');
    await refreshRegulationUI();
  };



  async function statsLiveFromSupabase() {
    const supabase = window.__AIMEASY_SUPABASE__;
    if (!supabase) return {
      students: 0,
      subjects: 0,
      videos: 0,
      notes: 0,
      pyqs: 0,
      iqs: 0,
      totalRegulations: 0,
      recentRegulations: []
    };

    const { data: dashboardCounts, error: dashboardCountsError } = await supabase.rpc('get_dashboard_counts');
    if (dashboardCountsError) {
      console.warn('get_dashboard_counts failed:', dashboardCountsError.message);
    }
    const counts = Array.isArray(dashboardCounts) ? dashboardCounts[0] || {} : dashboardCounts || {};

    // Regulations from public.regulations
    const { count: regsCount } = await supabase
      .from('regulations')
      .select('*', { count: 'exact', head: true });

    const { data: recentRegRows } = await supabase
      .from('regulations')
      .select('id, regulation_name, regulation_code, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      students: Number(counts.students || 0),
      creators: Number(counts.creators || 0),
      subjects: Number(counts.subjects || 0),
      totalRegulations: Number(counts.regulations || regsCount || 0),
      recentRegulations: (recentRegRows || []).map(r => String(r.regulation_name || '').trim() || String(r.regulation_code || '').trim()).filter(Boolean),
      videos: 0,
      notes: 0,
      pyqs: 0,
      iqs: 0
    };
  }


  function statCards(items) {
    return items.map(([label, value, color]) => `
      <div class="admin-stat-card">
        <div class="admin-stat-accent" style="background:${color};"></div>
        <div style="font-size:2.3rem;font-weight:800;color:${color};">${value}</div>
        <div style="font-size:0.88rem;font-weight:600;margin-top:4px;">${label}</div>
        <div style="font-size:0.75rem;color:var(--text3);margin-top:4px;">Real records only</div>
      </div>`).join('');
  }

  async function renderAdminDashboardLive() {
    const content = document.getElementById('admin-content');
    if (!content) return;

    content.innerHTML = `
      <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
        <div style="margin-bottom:1.6rem;">
          <h2 style="font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;">Admin Dashboard</h2>
          <p style="font-size:0.84rem;color:var(--text3);">Loading live metrics from Supabase...</p>
        </div>
      </div>`;

    const s = await statsLiveFromSupabase();

    content.innerHTML = `
      <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
        <div style="margin-bottom:1.6rem;">
          <h2 style="font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;">Admin Dashboard</h2>
          <p style="font-size:0.84rem;color:var(--text3);">Supabase is the only source of truth.</p>
        </div>
        <div class="admin-grid" style="margin-bottom:2rem;">
          ${statCards([
            ['Total Students', s.students, 'var(--primary)'],
            ['Total Content Creators', s.creators, 'var(--teal)'],
            ['Total Subjects', s.subjects, 'var(--lavender)'],
            ['Total Regulations', s.totalRegulations, 'var(--amber)'],
          ])}
        </div>
      </div>`;
  }


  function renderSubAdminDashboardLive() {
    const content = document.getElementById('sa-content');
    if (!content) return;
    const sa = APP.subAdminData || {};
    const subjects = read('edusync_custom_subjects', []).filter((subject) => !sa.branch || subject.branch === sa.branch);
    const subjectNames = new Set(subjects.map((subject) => subject.name));
    const countFor = (key) => read(key, []).filter((item) => subjectNames.has(item.subject)).length;
    content.innerHTML = `
      <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
        <div style="margin-bottom:1.6rem;">
          <h2 style="font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;">Sub Admin Dashboard</h2>
          <p style="font-size:0.82rem;color:var(--text3);">${esc(sa.branch || 'Content Management')}</p>
        </div>
        <div class="admin-grid" style="margin-bottom:1.6rem;">
          ${statCards([
            ['Subjects', subjects.length, 'var(--primary)'],
            ['Videos', countFor('edusync_admin_videos'), 'var(--teal)'],
            ['Notes', countFor('edusync_admin_notes'), 'var(--lavender)'],
            ['PYQs', countFor('edusync_admin_pyqs'), 'var(--amber)']
          ])}
        </div>
      </div>`;
  }

  function skillUpComingSoon() {
    const content = document.getElementById('sa-content');
    if (!content) return;
    content.innerHTML = `
      <div style="padding:2rem;max-width:720px;margin:0 auto;width:100%;">
        <div class="card" style="text-align:center;padding:2.2rem;">
          <div style="width:46px;height:46px;border-radius:12px;background:var(--primary-light);color:var(--primary);display:inline-flex;align-items:center;justify-content:center;font-weight:800;margin-bottom:1rem;">SU</div>
          <h2 style="font-size:1.25rem;font-weight:800;margin-bottom:6px;">Skill Up</h2>
          <p style="font-size:0.9rem;color:var(--text2);">Coming Soon</p>
        </div>
      </div>`;
  }

  window.adminNavigateBack = function adminNavigateBack() {
    const isDashboardActive = document.getElementById('admin-nav-dashboard')?.classList.contains('active');
    if (isDashboardActive) {
      if (typeof adminLogout === 'function') {
        adminLogout();
      } else {
        window.aimeasySafeBack('/landing');
      }
    } else {
      switchAdminSection('dashboard');
    }
  };

  window.subAdminNavigateBack = function subAdminNavigateBack() {
    if (window._v10SASubjId && window._v10SASubj && typeof v10SAUnitsPage === 'function') {
      window._v10SASubjId = null;
      window._v10SAUnitId = null;
      v10SAUnitsPage(window._v10SASubj);
      return;
    }
    if (window._v10SASubj && typeof v10SASubjects === 'function') {
      window._v10SASubj = null;
      v10SASubjects();
      return;
    }
    const isDashboardActive = document.getElementById('sa-nav-dashboard')?.classList.contains('active');
    if (isDashboardActive) {
      if (typeof subAdminBack === 'function') {
        subAdminBack();
      } else {
        window.aimeasySafeBack('/landing');
      }
    } else {
      switchSASection('dashboard');
    }
  };

  window.creatorNavigateBack = function creatorNavigateBack() {
    if (window._crSelectedUnit && typeof renderCRAddContent === 'function') {
      window._crSelectedUnit = null;
      renderCRAddContent();
      return;
    }
    if (window._crSelectedSubj && typeof renderCRAddContent === 'function') {
      window._crSelectedSubj = null;
      renderCRAddContent();
      return;
    }
    const isDashboardActive = document.getElementById('cr-nav-dashboard')?.classList.contains('active');
    if (isDashboardActive) {
      if (typeof creatorLogout === 'function') {
        creatorLogout();
      } else {
        window.aimeasySafeBack('/landing');
      }
    } else {
      switchCRSection('dashboard');
    }
  };

  function addMenuIcons() {
    const paths = {
      dashboard: 'M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z',
      create: 'M12 5v14M5 12h14',
      subjects: 'M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z',
      approvals: 'M20 6 9 17l-5-5',
      creatorview: 'M12 3v18M3 12h18',
      skillup: 'M13 2 3 14h8l-1 8 11-14h-8l1-6z',
      choosing: 'M12 2l7 19-7-4-7 4 7-19z',
      addcontent: 'M12 5v14M5 12h14',
      view: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'
    };
    document.querySelectorAll('.admin-nav-item[id]').forEach((item) => {
      const span = item.querySelector('span:first-child');
      if (!span || span.querySelector('svg')) return;
      const key = item.id.replace(/^(admin|sa|cr)-nav-/, '');
      span.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key] || 'M4 6h16M4 12h16M4 18h16'}"></path></svg>`;
      span.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:20px;';
    });
  }

  function replaceUnitButtons() {
    document.querySelectorAll('.v10-unit-card,.adm-unit-card').forEach((card) => {
      if (card.querySelector('.aimeasy-unit-dots')) return;
      const buttons = Array.from(card.querySelectorAll('button')).filter((button) => /edit|delete|del|✏|🗑/i.test((button.textContent || '') + (button.title || '')));
      if (buttons.length < 2) return;
      const edit = buttons.find((button) => /edit|✏/i.test((button.textContent || '') + (button.title || '')));
      const del = buttons.find((button) => /delete|del|🗑/i.test((button.textContent || '') + (button.title || '')));
      if (!edit || !del) return;
      const editCall = edit.getAttribute('onclick') || '';
      const delCall = del.getAttribute('onclick') || '';
      const parent = edit.parentElement;
      buttons.forEach((button) => button.remove());
      parent.insertAdjacentHTML('beforeend', `<button class="v10-dot-btn aimeasy-unit-dots" title="Options" onclick="aimeasyOpenUnitMenu(this,\`${editCall.replace(/`/g, '\\`')}\`,\`${delCall.replace(/`/g, '\\`')}\`)">⋮</button>`);
    });
  }

  window.aimeasyOpenUnitMenu = function aimeasyOpenUnitMenu(button, editCall, delCall) {
    window.event?.stopPropagation();
    document.querySelectorAll('.aimeasy-unit-menu').forEach((menu) => menu.remove());
    button.parentElement.insertAdjacentHTML('beforeend', `<div class="adm-popup aimeasy-unit-menu"><button class="adm-popup-item" onclick="${editCall}">Edit</button><button class="adm-popup-item red" onclick="${delCall}">Delete</button></div>`);
  };

  function saveUserProfile(user) {
    const users = read('edusync_users', []);
    const key = user.id || user.googleId || user.email;
    const index = users.findIndex((item) => (item.id || item.googleId || item.email) === key);
    if (index >= 0) users[index] = { ...users[index], ...user };
    else users.push(user);
    write('edusync_users', users);
    localStorage.setItem('edusync_session_user', JSON.stringify(user));
    if (user.googleId || user.id) localStorage.setItem('edusync_user_' + (user.googleId || user.id), JSON.stringify(user));
  }

  localStorage.removeItem('aimeasy_oauth_role');
  localStorage.removeItem('aimeasy_active_role');

  if (!window.submitAdminLogin?.isPatched) {
    const originalSubmitAdminLogin = window.submitAdminLogin;
    window.submitAdminLogin = function submitAdminLoginPersistent() {
      const userid = document.getElementById('admin-userid')?.value.trim();
      const password = document.getElementById('admin-password')?.value.trim();
      const type = typeof adminLoginType !== 'undefined' ? adminLoginType : 'admin';
      originalSubmitAdminLogin?.();
      if (type === 'admin' && userid === 'syamalarao99' && password === '9398540299') {
        localStorage.setItem('edusync_admin_session', JSON.stringify({ type: 'admin', username: userid }));
      }
      if (type !== 'admin') {
        const subAdmin = read('edusync_subadmins', []).find((item) => item.username === userid && item.password === password);
        if (subAdmin) {
          localStorage.setItem('edusync_admin_session', JSON.stringify({ type: subAdmin.role === 'content_creator' ? 'content_creator' : 'subadmin', data: subAdmin }));
        }
      }
    };
    window.submitAdminLogin.isPatched = true;
  }

  if (!window.adminLogout?.isPatched) {
    const originalAdminLogout = window.adminLogout;
    window.adminLogout = function adminLogoutFixed() {
      localStorage.removeItem('edusync_admin_session');
      if (window.APP) {
        window.APP.adminType = null;
        window.APP.subAdminData = null;
        window.APP.session = false;
      }
      window.__aimeasyPreserveRoleRoute = '';
      originalAdminLogout?.();
    };
    window.adminLogout.isPatched = true;
  }

  if (!window.subAdminBack?.isPatched) {
    const originalSubAdminBack = window.subAdminBack;
    window.subAdminBack = function subAdminBackPreserveSession() {
      // Back button must never clear session.
      console.log('[NAVIGATION] Back button pressed');
      console.log('[AUTH] Session preserved');
      originalSubAdminBack?.();
    };
    window.subAdminBack.isPatched = true;
  }

  if (!window.creatorLogout?.isPatched) {
    const originalCreatorLogout = window.creatorLogout;
    window.creatorLogout = async function creatorLogoutFixed() {
      localStorage.removeItem('edusync_admin_session');
      if (window.APP) {
        window.APP.adminType = null;
        window.APP.subAdminData = null;
        window.APP.session = false;
      }
      window.__aimeasyPreserveRoleRoute = '';
      const supabase = window.__AIMEASY_SUPABASE__;
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('Supabase creator logout signout error:', e);
        }
      }
      originalCreatorLogout?.();
    };
    window.creatorLogout.isPatched = true;
  }

  let isSyncing = false;
  window.aimeasySyncAndRefresh = async function aimeasySyncAndRefresh(customRenderFn) {
    if (isSyncing) return;
    if (typeof window.hydrateLegacyState === 'function') {
      isSyncing = true;
      try {
        await window.hydrateLegacyState();
        if (typeof customRenderFn === 'function') {
          customRenderFn();
        } else {
          // Re-render active views
          const activeScreen = document.querySelector('.screen.active')?.id;
          if (activeScreen === 'screen-app') {
            const activePage = [...document.querySelectorAll('[id^="page-"]')].find(p => p.style.display !== 'none')?.id?.replace('page-', '');
            if (activePage === 'dashboard') {
              if (typeof updateStudentDashboardMetrics === 'function') updateStudentDashboardMetrics();
            } else if (activePage === 'subjects') {
              if (typeof renderSubjects === 'function') renderSubjects();
            } else if (activePage === 'units') {
              if (window.APP?.currentSubject && typeof renderUnits === 'function') renderUnits(window.APP.currentSubject);
            } else if (activePage === 'unit-content') {
              if (window.APP?.currentSubject && window.APP?.currentUnit) {
                const subjId = window.APP.currentSubject.id || window.APP.currentSubject.rawId || window.APP.currentSubject;
                const unitNum = window.APP.currentUnit;
                if (typeof renderVideoList === 'function') renderVideoList(subjId, unitNum);
                if (typeof renderNotes === 'function') renderNotes(subjId, unitNum);
                if (typeof renderPYQ === 'function') renderPYQ(null, subjId, unitNum);
                if (typeof renderIQ === 'function') renderIQ(subjId, unitNum);
              }
            }
          } else if (activeScreen === 'screen-admin') {
            const activeAdminTab = document.querySelector('.admin-nav-item.active')?.id?.replace('admin-nav-', '');
            if (typeof window.aiiensRefreshActiveAdminSurfaces === 'function') {
              window.aiiensRefreshActiveAdminSurfaces();
            } else if (activeAdminTab === 'dashboard') {
              if (typeof renderAdminDashboardLive === 'function') renderAdminDashboardLive();
            } else if (activeAdminTab === 'subjects') {
              if (typeof renderAdminSubjectCrud === 'function') renderAdminSubjectCrud();
            }
          } else if (activeScreen === 'screen-subadmin') {
            const activeSaTab = document.querySelector('.admin-nav-item.active')?.id?.replace('sa-nav-', '');
            if (typeof window.aiiensRefreshActiveAdminSurfaces === 'function') {
              window.aiiensRefreshActiveAdminSurfaces();
            } else if (activeSaTab === 'dashboard') {
              if (typeof renderSubAdminDashboardLive === 'function') renderSubAdminDashboardLive();
            } else if (activeSaTab === 'subjects' || activeSaTab === 'curriculum') {
              if (typeof v10SASubjects === 'function') v10SASubjects();
            }
          } else if (activeScreen === 'screen-creator') {
            const activeCrTab = document.querySelector('.admin-nav-item.active')?.id?.replace('cr-nav-', '');
            if (activeCrTab === 'dashboard') {
              if (typeof renderCRDashboard === 'function') renderCRDashboard();
            } else if (activeCrTab === 'choosing' || activeCrTab === 'addcontent') {
              if (typeof renderCRAddContent === 'function') renderCRAddContent();
            }
          }
        }
      } catch (e) {
        console.warn('[AIIENS Edu sync] Sync failed:', e);
      } finally {
        isSyncing = false;
      }
    }
  };

  if (!window.renderAdminSection?.isPatched) {
    const originalRenderAdminSection = window.renderAdminSection;
    window.renderAdminSection = function renderAdminSectionFixed(section) {
      if (section === 'dashboard') {
        renderAdminDashboardLive();
        return;
      }
      originalRenderAdminSection?.(section);
      if (section === 'create') installRegulationManager();
      updateRegulationDropdowns();
      updateUniversityDropdowns();
      addMenuIcons();
    };
    window.renderAdminSection.isPatched = true;
  }

  if (!window.switchSASection?.isPatched) {
    const originalSwitchSASection = window.switchSASection;
    window.switchSASection = function switchSASectionFixed(section) {
      if (section === 'dashboard') {
        closeSASidebar?.();
        document.querySelectorAll('[id^="sa-nav-"]').forEach((el) => el.classList.remove('active'));
        document.getElementById('sa-nav-dashboard')?.classList.add('active');
        const title = document.getElementById('sa-topbar-title');
        if (title) title.textContent = 'Sub Admin Dashboard';
        renderSubAdminDashboardLive();
        addMenuIcons();
        if (window.location.hash !== '#/subadmin/dashboard') {
          window.location.hash = '#/subadmin/dashboard';
        }
        return;
      }
      if (section === 'skillup') {
        closeSASidebar?.();
        skillUpComingSoon();
        addMenuIcons();
        if (window.location.hash !== '#/subadmin/skillup') {
          window.location.hash = '#/subadmin/skillup';
        }
        return;
      }
      originalSwitchSASection?.(section);
      updateRegulationDropdowns();
      updateUniversityDropdowns();
      addMenuIcons();
      setTimeout(replaceUnitButtons, 0);
    };
    window.switchSASection.isPatched = true;
  }

  if (!window.switchCRSection?.isPatched) {
    const originalSwitchCRSection = window.switchCRSection;
    window.switchCRSection = function switchCRSectionFixed(section) {
      originalSwitchCRSection?.(section);
    };
    window.switchCRSection.isPatched = true;
  }

  ['v10SASubjects', 'v10SAUnitsPage', 'v10AdminSubjects', 'v10AdminOpenSubjectObj', 'v11AdminSubjectsPage', 'v11AdminUnitsPage', 'v11CreatorUnitsPage', 'renderCRChoosing', 'renderCRAddContent', 'renderSubjects'].forEach((name) => {
    const original = window[name];
    if (typeof original !== 'function' || original.isPatched) return;
    window[name] = function patchedRender(...args) {
      const result = original.apply(this, args);
      updateRegulationDropdowns();
      updateUniversityDropdowns();
      addMenuIcons();
      setTimeout(replaceUnitButtons, 0);
      return result;
    };
    window[name].isPatched = true;
  });

  if (!window.launchTeacherPortal?.isPatched) {
    const originalLaunchTeacherPortal = window.launchTeacherPortal;
    window.launchTeacherPortal = function launchTeacherPortalFixed(teacher) {
      if (teacher?.role === 'content_creator' || teacher?.role === 'creator' || teacher?.role === 'teacher' || APP.adminType === 'content_creator') {
        APP.adminType = 'content_creator';
        APP.subAdminData = {
          username: teacher?.name || 'Creator',
          branch: teacher?.branch || 'CSE',
          role: 'content_creator'
        };
        localStorage.setItem('edusync_admin_session', JSON.stringify({
          type: 'content_creator',
          username: APP.subAdminData.username,
          data: APP.subAdminData
        }));
        launchCreatorScreen?.();
        return;
      }
      originalLaunchTeacherPortal?.(teacher);
    };
    window.launchTeacherPortal.isPatched = true;
  }

  if (!window.showScreen?.isPatched) {
    const originalShowScreen = window.showScreen;
    window.showScreen = function showScreenFixed(id, role) {
      if (id === 'screen-google-auth' && typeof window.syncGoogleAuthScreen === 'function') {
        window.syncGoogleAuthScreen();
      }
      if (id === 'screen-profile' && typeof window.aimeasyHydrateProfileDropdowns === 'function') {
        window.setTimeout(() => window.aimeasyHydrateProfileDropdowns(), 0);
      }
      const result = originalShowScreen?.(id, role);
      updateRegulationDropdowns();
      updateUniversityDropdowns();
      addMenuIcons();
      return result;
    };
    window.showScreen.isPatched = true;
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.aimeasy-unit-dots,.aimeasy-unit-menu')) {
      document.querySelectorAll('.aimeasy-unit-menu').forEach((menu) => menu.remove());
    }
  });

  if (!window.openAdminLogin?.isPatched) {
    const originalOpenAdminLogin = window.openAdminLogin;
    window.openAdminLogin = function openAdminLoginPersistent(type) {
      localStorage.removeItem('edusync_admin_session');
      if (window.APP) {
        window.APP.adminType = null;
        window.APP.subAdminData = null;
        window.APP.session = false;
      }
      window.__aimeasyPreserveRoleRoute = '';
      return originalOpenAdminLogin?.(type);
    };
    window.openAdminLogin.isPatched = true;
  }

  window.subAdminLogout = function subAdminLogout() {
    localStorage.removeItem('edusync_admin_session');
    if (window.APP) {
      window.APP.adminType = null;
      window.APP.subAdminData = null;
      window.APP.session = false;
    }
    window.__aimeasyPreserveRoleRoute = '';
    window.showScreen?.('screen-landing');
    window.history?.replaceState?.({ aimeasyPath: '/landing', aimeasyIndex: 0 }, '', '#/landing');
  };

  window.addEventListener('load', () => {
    document.title = 'AIIENS Edu - Smart AI Learning Ecosystem';
    const adminSession = read('edusync_admin_session', null);
    // Ensure async dropdown population runs without breaking render flow

    // Get current hash route to preserve it on load/reload
    const currentRoute = (window.location.hash || '').replace(/^#/, '');
    const isLanding = !currentRoute || currentRoute === '/' || currentRoute === '/landing' || currentRoute === '/intro';

    if (currentRoute && /^\/(admin|subadmin|creator)(\/|$)/.test(currentRoute)) {
      window.__aimeasyPreserveRoleRoute = currentRoute;
    }

    if (!isLanding) {
      if (adminSession?.type === 'admin') {
        APP.adminType = 'admin';
        APP.session = true;
        hideLoading?.();
        launchAdminDashboard?.();
      } else if (adminSession?.type === 'subadmin') {
        APP.adminType = 'subadmin';
        APP.subAdminData = adminSession.data;
        APP.session = true;
        hideLoading?.();
        launchSubAdmin?.();
      } else if (adminSession?.type === 'content_creator' || adminSession?.type === 'creator') {
        APP.adminType = 'content_creator';
        APP.subAdminData = adminSession.data;
        APP.session = true;
        hideLoading?.();
        launchCreatorScreen?.();
      }
    }
    updateRegulationDropdowns();
    updateUniversityDropdowns();
    addMenuIcons();
  });

  // Edit handlers for sub-admin uploaded resources
  window.aimeasyEditNote = async function(id, subjectName, unitId) {
    const notes = JSON.parse(localStorage.getItem('edusync_admin_notes') || '[]');
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const newTitle = prompt('Edit Note Title:', note.title);
    if (newTitle === null) return;
    if (!newTitle.trim()) {
      showToast('Title cannot be empty', 'red');
      return;
    }
    const newLink = prompt('Edit Note Link / URL:', note.link || '');
    if (newLink === null) return;
    
    note.title = newTitle.trim();
    note.link = newLink.trim();
    if (note.dbContentId) {
      await window.aimeasyUpdateContent?.(note.dbContentId, {
        title: note.title,
        url: note.link,
      });
    }
    localStorage.setItem('edusync_admin_notes', JSON.stringify(notes));
    showToast('Note updated successfully', 'green');
    
    if (typeof v10RefreshContentPane === 'function') await v10RefreshContentPane('notes', subjectName, unitId);
    else {
      const pane = document.getElementById('v10-notes-' + unitId);
      if (pane && typeof v10NotesForm === 'function') pane.innerHTML = v10NotesForm(subjectName, unitId);
    }
    window.aimeasySyncAndRefresh?.();
  };

  window.aimeasyEditPYQ = async function(id, subjectName, unitId) {
    const pyqs = JSON.parse(localStorage.getItem('edusync_admin_pyqs') || '[]');
    const pyq = pyqs.find(p => p.id === id);
    if (!pyq) return;
    const newQuestion = prompt('Edit PYQ Question:', pyq.question);
    if (newQuestion === null) return;
    if (!newQuestion.trim()) {
      showToast('Question cannot be empty', 'red');
      return;
    }
    const newYear = prompt('Edit Exam Year:', pyq.year);
    if (newYear === null) return;
    const newCount = prompt('Edit Repeated Count:', pyq.count || '1');
    if (newCount === null) return;
    const newAnswer = prompt('Edit Answer/Explanation (optional):', pyq.answer || '');
    if (newAnswer === null) return;

    pyq.question = newQuestion.trim();
    pyq.year = newYear.trim();
    pyq.count = parseInt(newCount) || 1;
    pyq.answer = newAnswer.trim();
    if (pyq.dbContentId) {
      await window.aimeasyUpdateContent?.(pyq.dbContentId, {
        title: pyq.question.slice(0, 80),
        body: pyq.question,
        metadata: {
          ...(pyq.metadata || {}),
          year: pyq.year,
          count: pyq.count,
          answer: pyq.answer,
          topicId: pyq.topicId,
        },
      });
    }
    
    localStorage.setItem('edusync_admin_pyqs', JSON.stringify(pyqs));
    showToast('PYQ updated successfully', 'green');
    
    if (typeof v10RefreshContentPane === 'function') await v10RefreshContentPane('pyq', subjectName, unitId);
    else {
      const pane = document.getElementById('v10-pyq-' + unitId);
      if (pane && typeof v10PYQForm === 'function') pane.innerHTML = v10PYQForm(subjectName, unitId);
    }
    window.aimeasySyncAndRefresh?.();
  };

  window.aimeasyEditIQ = async function(id, subjectName, unitId) {
    const iqs = JSON.parse(localStorage.getItem('edusync_admin_iqs') || '[]');
    const iq = iqs.find(q => q.id === id);
    if (!iq) return;
    const newQuestion = prompt('Edit Important Question:', iq.question);
    if (newQuestion === null) return;
    if (!newQuestion.trim()) {
      showToast('Question cannot be empty', 'red');
      return;
    }
    const newPriority = prompt('Edit Priority (high / med / low):', iq.priority || 'med');
    if (newPriority === null) return;
    const newTags = prompt('Edit Tags (comma separated):', iq.tags || '');
    if (newTags === null) return;

    iq.question = newQuestion.trim();
    iq.priority = ['high', 'med', 'low'].includes(newPriority.trim().toLowerCase()) ? newPriority.trim().toLowerCase() : 'med';
    iq.tags = newTags.trim();
    if (iq.dbContentId) {
      await window.aimeasyUpdateContent?.(iq.dbContentId, {
        title: iq.question.slice(0, 80),
        body: iq.question,
        metadata: {
          ...(iq.metadata || {}),
          priority: iq.priority,
          tags: iq.tags,
          topicId: iq.topicId,
        },
      });
    }
    
    localStorage.setItem('edusync_admin_iqs', JSON.stringify(iqs));
    showToast('Question updated successfully', 'green');
    
    if (typeof v10RefreshContentPane === 'function') await v10RefreshContentPane('iq', subjectName, unitId);
    else {
      const pane = document.getElementById('v10-iq-' + unitId);
      if (pane && typeof v10IQForm === 'function') pane.innerHTML = v10IQForm(subjectName, unitId);
    }
    window.aimeasySyncAndRefresh?.();
  };

  // Inject Edit/Delete hover overrides
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .v10-edit-btn:hover { background:var(--primary-light) !important; color:var(--primary) !important; }
    .v10-del-btn:hover { background:var(--red-light) !important; color:var(--red) !important; }
  `;
  document.head.appendChild(styleEl);

  setTimeout(() => {
    updateRegulationDropdowns();
    updateUniversityDropdowns();
    addMenuIcons();
    replaceUnitButtons();
  }, 0);
})();
