const SUBJECT_KEY = 'edusync_custom_subjects';

const SELECT_OPTIONS = {
  universities: ['JNTUK', 'JNTUH', 'Andhra University'],
  get regulations() {
    try {
      const stored = JSON.parse(localStorage.getItem('edusync_regulations') || '[]');
      return stored.length ? stored : ['R23', 'R20', 'R19', 'R16'];
    } catch (error) {
      return ['R23', 'R20', 'R19', 'R16'];
    }
  },
  branches: ['CSE', 'ECE', 'EEE', 'IT', 'AIML', 'AIDS', 'MECH', 'CIVIL'],
  years: ['1', '2', '3', '4'],
  semesters: ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'],
  credits: ['1', '2', '3', '4', '5'],
};

function readSubjects() {
  try {
    return JSON.parse(localStorage.getItem(SUBJECT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSubjects(subjects) {
  localStorage.setItem(SUBJECT_KEY, JSON.stringify(subjects));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function optionList(options, selected) {
  return options
    .map((option) => {
      const safeOption = escapeHtml(option);
      return `<option value="${safeOption}" ${String(selected || '') === option ? 'selected' : ''}>${safeOption}</option>`;
    })
    .join('');
}

function getFormValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function findSubject(id) {
  return readSubjects().find((subject) => String(subject.id) === String(id));
}

function showToast(message, type = 'blue') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  }
}

function renderSubjectForm(editingSubject) {
  const isEdit = Boolean(editingSubject);
  const title = isEdit ? 'Edit Subject' : 'Add New Subject';

  return `
    <div class="card" style="margin-bottom:1rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:1rem;">
        <div>
          <h3 style="margin-bottom:4px;">${title}</h3>
          <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;">Subjects created here are available to students and synced to Supabase when configured.</p>
        </div>
        ${isEdit ? '<button class="btn btn-ghost btn-sm" onclick="adminSubjectCancelEdit()">Cancel Edit</button>' : ''}
      </div>

      <input type="hidden" id="admin-subject-id" value="${escapeHtml(editingSubject?.id || '')}">

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
        <div class="input-group">
          <label>Subject Name</label>
          <input class="input" id="admin-subject-name" value="${escapeHtml(editingSubject?.name || '')}" placeholder="e.g. Operating Systems">
        </div>
        <div class="input-group">
          <label>Subject Code</label>
          <input class="input" id="admin-subject-code" value="${escapeHtml(editingSubject?.code || '')}" placeholder="e.g. CS305">
        </div>
        <div class="input-group">
          <label>University</label>
          <select class="select" id="admin-subject-uni">
            ${optionList(SELECT_OPTIONS.universities, editingSubject?.uni)}
          </select>
        </div>
        <div class="input-group">
          <label>Regulation</label>
          <select class="select" id="admin-subject-reg">
            ${optionList(SELECT_OPTIONS.regulations, editingSubject?.reg)}
          </select>
        </div>
        <div class="input-group">
          <label>Branch</label>
          <select class="select" id="admin-subject-branch">
            ${optionList(SELECT_OPTIONS.branches, editingSubject?.branch)}
          </select>
        </div>
        <div class="input-group">
          <label>Year</label>
          <select class="select" id="admin-subject-year">
            ${optionList(SELECT_OPTIONS.years, editingSubject?.year)}
          </select>
        </div>
        <div class="input-group">
          <label>Semester</label>
          <select class="select" id="admin-subject-sem">
            ${optionList(SELECT_OPTIONS.semesters, editingSubject?.sem)}
          </select>
        </div>
        <div class="input-group">
          <label>Credits</label>
          <select class="select" id="admin-subject-credits">
            ${optionList(SELECT_OPTIONS.credits, String(editingSubject?.credits || '3'))}
          </select>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="${isEdit ? 'adminSubjectUpdate()' : 'adminSubjectCreate()'}">
          ${isEdit ? 'Save Changes' : '+ Add Subject'}
        </button>
      </div>
    </div>
  `;
}

function renderSubjectCard(subject) {
  const safeId = escapeHtml(subject.id);
  const safeName = escapeHtml(subject.name);
  const openPayload = encodeURIComponent(JSON.stringify(subject));

  return `
    <div class="card" style="padding:1.1rem;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-weight:800;font-size:0.98rem;margin-bottom:4px;">${safeName}</div>
          <div style="font-size:0.76rem;color:var(--text3);">${escapeHtml(subject.code || '-')} · ${escapeHtml(subject.credits || 3)} credits</div>
        </div>
        <span class="badge badge-amber">Custom</span>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        <span class="badge badge-primary">${escapeHtml(subject.sem)}</span>
        <span class="badge badge-teal">${escapeHtml(subject.uni)}</span>
        <span class="badge badge-lavender">${escapeHtml(subject.reg)}</span>
        <span class="badge badge-green">${escapeHtml(subject.branch)}</span>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="adminSubjectOpen('${openPayload}')">Open</button>
        <button class="btn btn-ghost btn-sm" onclick="adminSubjectEdit('${safeId}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="adminSubjectDelete('${safeId}')">Delete</button>
      </div>
    </div>
  `;
}

function renderAdminSubjectCrud(editingSubject = null) {
  const content = document.getElementById('admin-content');
  if (!content) return;

  const subjects = readSubjects();

  content.innerHTML = `
    <div style="padding:2rem;max-width:1200px;margin:0 auto;width:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:1.3rem;">
        <div>
          <h2 style="font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;">Subject CRUD</h2>
          <p style="font-size:0.82rem;color:var(--text3);">Create, view, update, delete, and open subjects for unit/content management.</p>
        </div>
        <span class="badge badge-primary">${subjects.length} custom subject${subjects.length === 1 ? '' : 's'}</span>
      </div>

      ${renderSubjectForm(editingSubject)}

      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:1.2rem 0 0.8rem;">
        <h3>Custom Subjects</h3>
        <button class="btn btn-ghost btn-sm" onclick="adminSubjectRefresh()">Refresh</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;">
        ${subjects.length ? subjects.map(renderSubjectCard).join('') : `
          <div class="card" style="grid-column:1/-1;text-align:center;color:var(--text3);">
            No custom subjects yet. Add your first subject above.
          </div>
        `}
      </div>
    </div>
  `;
}

// Helper to collect data from input fields.
function collectSubjectPayload(existingId) {
  const name = getFormValue('admin-subject-name');
  const code = getFormValue('admin-subject-code');
  const uni = getFormValue('admin-subject-uni');
  const reg = getFormValue('admin-subject-reg');
  const branch = getFormValue('admin-subject-branch');
  const year = getFormValue('admin-subject-year');
  const sem = getFormValue('admin-subject-sem');
  const credits = getFormValue('admin-subject-credits');

  if (!name || !code || !uni || !reg || !branch || !year || !sem || !credits) {
    showToast('Fill all subject fields', 'red');
    return null;
  }

  return {
    id: existingId || Date.now(),
    name,
    code,
    uni,
    reg,
    branch,
    year,
    sem,
    credits,
    icon: '📖',
  };
}

export function installAdminSubjectCrud() {
  if (window.__aimeasyAdminSubjectCrudInstalled) return;

  window.adminSubjectCreate = function adminSubjectCreate() {
    const subjects = readSubjects();
    const payload = collectSubjectPayload();
    if (!payload) return;

    const duplicate = subjects.some(
      (subject) =>
        subject.code?.toLowerCase() === payload.code.toLowerCase() &&
        subject.sem === payload.sem &&
        subject.branch === payload.branch,
    );

    if (duplicate) {
      showToast('A subject with this code already exists for that branch and semester', 'red');
      return;
    }

    subjects.push(payload);
    saveSubjects(subjects);
    showToast('Subject added successfully', 'green');
    renderAdminSubjectCrud();
  };

  window.adminSubjectEdit = function adminSubjectEdit(id) {
    const subject = findSubject(id);
    if (!subject) {
      showToast('Subject not found', 'red');
      return;
    }

    renderAdminSubjectCrud(subject);
  };

  window.adminSubjectUpdate = function adminSubjectUpdate() {
    const id = getFormValue('admin-subject-id');
    const payload = collectSubjectPayload(Number(id));
    if (!payload) return;

    const subjects = readSubjects();
    const index = subjects.findIndex((subject) => String(subject.id) === String(id));

    if (index === -1) {
      showToast('Subject not found', 'red');
      return;
    }

    const oldName = subjects[index].name;
    subjects[index] = { ...subjects[index], ...payload };
    saveSubjects(subjects);

    if (oldName !== payload.name) {
      ['edusync_admin_notes', 'edusync_admin_pyqs', 'edusync_admin_iqs', 'edusync_admin_videos'].forEach((key) => {
        try {
          const items = JSON.parse(localStorage.getItem(key) || '[]');
          localStorage.setItem(
            key,
            JSON.stringify(items.map((item) => (item.subject === oldName ? { ...item, subject: payload.name } : item))),
          );
        } catch {
          // Ignore malformed legacy content.
        }
      });
    }

    showToast('Subject updated successfully', 'green');
    renderAdminSubjectCrud();
  };

  window.adminSubjectDelete = function adminSubjectDelete(id) {
    const subject = findSubject(id);
    if (!subject) {
      showToast('Subject not found', 'red');
      return;
    }

    if (!confirm(`Delete "${subject.name}" and its units/content links?`)) return;

    saveSubjects(readSubjects().filter((item) => String(item.id) !== String(id)));
    localStorage.removeItem(`edusync_units_${id}`);

    ['edusync_admin_notes', 'edusync_admin_pyqs', 'edusync_admin_iqs', 'edusync_admin_videos'].forEach((key) => {
      try {
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(items.filter((item) => item.subject !== subject.name)));
      } catch {
        // Ignore malformed legacy content.
      }
    });

    showToast('Subject deleted', 'red');
    renderAdminSubjectCrud();
  };

  window.adminSubjectOpen = function adminSubjectOpen(encodedSubject) {
    let subject;
    try {
      subject = JSON.parse(decodeURIComponent(encodedSubject));
    } catch {
      showToast('Could not open subject', 'red');
      return;
    }

    if (typeof window.v10AdminOpenSubjectObj === 'function') {
      window.v10AdminOpenSubjectObj(subject);
      return;
    }

    if (typeof window.adminOpenSubject === 'function') {
      window.adminOpenSubject(subject);
      return;
    }

    showToast('Subject opened, but unit manager is not ready yet', 'amber');
  };

  window.adminSubjectRefresh = function adminSubjectRefresh() {
    renderAdminSubjectCrud();
  };

  window.adminSubjectCancelEdit = function adminSubjectCancelEdit() {
    renderAdminSubjectCrud();
  };

  const originalSwitchAdminSection = window.switchAdminSection;
  if (typeof originalSwitchAdminSection === 'function') {
    window.switchAdminSection = function switchAdminSectionWithCrud(section) {
      if (section === 'subjects') {
        document.querySelectorAll('[id^="admin-nav-"]').forEach((el) => el.classList.remove('active'));
        document.getElementById('admin-nav-subjects')?.classList.add('active');
        const titleEl = document.getElementById('admin-topbar-title');
        if (titleEl) titleEl.textContent = 'Subject CRUD';
        renderAdminSubjectCrud();
        if (window.location.hash !== '#/admin/subjects') {
          window.location.hash = '#/admin/subjects';
        }
        return;
      }

      originalSwitchAdminSection.call(this, section);
    };
  }

  window.v10AdminSubjects = renderAdminSubjectCrud;
  window.renderAdminSubjectCrud = renderAdminSubjectCrud;
  window.__aimeasyAdminSubjectCrudInstalled = true;
}
