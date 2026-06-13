// ═══════════════════════════════════════════════════════════════
//  INJECT STYLES
// ═══════════════════════════════════════════════════════════════
(function injectV11Styles(){
  if(document.getElementById('v11-styles')) return;
  const s = document.createElement('style');
  s.id = 'v11-styles';
  s.textContent = `
/* Admin subject card */
.adm-subj-card {
  background:var(--surface); border:1.5px solid var(--border);
  border-radius:var(--radius-lg); padding:1.2rem;
  transition:var(--transition); position:relative;
}
.adm-subj-card:hover { border-color:var(--primary); box-shadow:var(--shadow-md); transform:translateY(-2px); }
.adm-subj-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; }

/* 3-dot popup */
.adm-popup { 
  position:absolute; top:calc(100% + 4px); right:8px; z-index:600;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-md); box-shadow:0 8px 32px rgba(0,0,0,0.14);
  min-width:170px; overflow:hidden;
  animation:scaleIn .15s cubic-bezier(.34,1.56,.64,1) both;
  transform-origin:top right;
}
.adm-popup-item {
  display:flex; align-items:center; gap:10px;
  padding:10px 16px; font-size:0.84rem; font-weight:500;
  cursor:pointer; border:none; background:transparent;
  width:100%; text-align:left; color:var(--text); transition:background .15s;
}
.adm-popup-item:hover { background:var(--surface2); }
.adm-popup-item.red { color:var(--red); }
.adm-popup-item.red:hover { background:var(--red-light); }

/* Admin unit detail */
.adm-unit-card {
  background:var(--surface); border:1.5px solid var(--border);
  border-radius:var(--radius-lg); padding:1.2rem;
  cursor:pointer; transition:var(--transition); position:relative;
}
.adm-unit-card:hover { border-color:var(--lavender); box-shadow:var(--shadow-md); transform:translateY(-2px); }
.adm-unit-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:1rem; }

/* Creator portal */
.cr-subj-card {
  background:var(--surface); border:1.5px solid var(--border);
  border-radius:var(--radius-lg); padding:1.2rem;
  cursor:pointer; transition:var(--transition);
}
.cr-subj-card:hover { border-color:var(--teal); box-shadow:var(--shadow-md); transform:translateY(-2px); }
.cr-subj-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; }

/* Confirm delete modal */
.v11-confirm-modal {
  position:fixed; inset:0; background:rgba(15,23,42,0.55);
  backdrop-filter:blur(6px); display:flex; align-items:center;
  justify-content:center; z-index:2000;
}
.v11-confirm-box {
  background:var(--surface); border-radius:var(--radius-xl);
  padding:2rem; max-width:420px; width:92%;
  box-shadow:0 24px 80px rgba(0,0,0,0.18);
  animation:scaleIn 0.25s cubic-bezier(.34,1.56,.64,1) both;
}

/* Back button */
.v11-back { display:inline-flex; align-items:center; gap:6px; padding:7px 16px; border-radius:50px; border:1.5px solid var(--border); background:var(--surface); color:var(--text2); font-size:0.84rem; font-weight:600; cursor:pointer; transition:var(--transition); margin-bottom:1.2rem; }
.v11-back:hover { border-color:var(--primary); color:var(--primary); background:var(--primary-light); }

/* Tabs */
.v11-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:1.2rem; }
.v11-tab { padding:8px 16px; border-radius:50px; border:1.5px solid var(--border); background:var(--surface); color:var(--text2); font-size:0.84rem; font-weight:600; cursor:pointer; transition:var(--transition); }
.v11-tab.on { background:var(--primary); color:#fff; border-color:var(--primary); }
.v11-pane { display:none; }
.v11-pane.on { display:block; }

/* Uploaded item row */
.v11-item-row {
  display:flex; align-items:center; gap:8px;
  padding:9px 12px; border:1px solid var(--border);
  border-radius:var(--radius-sm); margin-bottom:6px;
  font-size:0.82rem; background:var(--surface);
  transition:var(--transition);
}
.v11-item-row:hover { border-color:var(--primary-mid); background:var(--primary-light); }
`;
  document.head.appendChild(s);
})();

// AIIENS Edu: dynamic features and unit management sync.
(function installAIIENSEduFeatureAndUnitFixes() {
  const DEFAULT_FEATURES = ['Videos', 'Notes', 'PYQs', 'Important Questions'];
  const LEGACY_FEATURE_SLUGS = new Set(['videos', 'notes', 'pyqs', 'important-questions']);
  const FEATURE_KEY = 'edusync_features';
  const DISABLED_FEATURE_KEY = 'edusync_disabled_features';
  const DYNAMIC_CONTENT_KEY = 'edusync_dynamic_feature_content';

  function esc(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function js(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function slug(value) {
    return String(value || '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || '') ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('edusync:data-sync', { detail: { key } }));
  }

  function features() {
    const stored = read(FEATURE_KEY, DEFAULT_FEATURES);
    const disabled = new Set(read(DISABLED_FEATURE_KEY, []).map(slug));
    const seen = new Set();
    return [...DEFAULT_FEATURES, ...(Array.isArray(stored) ? stored : [])]
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .filter(item => {
        const key = slug(item);
        if (!key || seen.has(key) || disabled.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function saveFeatures(list) {
    const seen = new Set();
    write(FEATURE_KEY, list.map(item => String(item || '').trim()).filter(Boolean).filter(item => slug(item) !== 'videos').filter(item => {
      const key = slug(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }));
  }

  function dynamicItems(feature, subject, unit) {
    const key = slug(feature);
    return read(DYNAMIC_CONTENT_KEY, []).filter(item => item.slug === key && item.subject === subject && parseInt(item.unit) === parseInt(unit));
  }

  function subjectById(id) {
    return read('edusync_custom_subjects', []).find(item => String(item.id) === String(id));
  }

  function normalizedUnits(subjId) {
    let units = read('edusync_units_' + subjId, []);
    if (!units.length) {
      units = Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        name: `Unit ${index + 1}`,
        description: '',
        order: index + 1,
        topics: []
      }));
      write('edusync_units_' + subjId, units);
    }
    return units.map((unit, index) => ({
      ...unit,
      id: Number(unit.id || index + 1),
      order: Number(unit.order || unit.id || index + 1),
      description: unit.description || '',
      topics: Array.isArray(unit.topics) ? unit.topics : []
    })).sort((a, b) => (a.order || a.id) - (b.order || b.id));
  }

  function contentCount(key, subject, unit) {
    return read(key, []).filter(item => item.subject === subject && parseInt(item.unit) === parseInt(unit)).length;
  }

  function deleteUnitContent(subject, unit) {
    ['edusync_admin_notes', 'edusync_admin_pyqs', 'edusync_admin_iqs', 'edusync_admin_videos'].forEach(key => {
      write(key, read(key, []).filter(item => !(item.subject === subject && parseInt(item.unit) === parseInt(unit))));
    });
    write(DYNAMIC_CONTENT_KEY, read(DYNAMIC_CONTENT_KEY, []).filter(item => !(item.subject === subject && parseInt(item.unit) === parseInt(unit))));
  }

  function rerenderUnits(subjId) {
    const subj = subjectById(subjId) || window._v10SASubj || window._v11AdminSubj;
    if (subj && window._v10SASubj?.id === subj.id && typeof v10SAUnitsPage === 'function') v10SAUnitsPage(subj);
    if (subj && window._v11AdminSubj?.id === subj.id && typeof v11AdminUnitsPage === 'function') v11AdminUnitsPage(subj);
  }

  function genericPane(feature, subject, unit, mode) {
    const key = slug(feature);
    const items = dynamicItems(feature, subject, unit);
    if (mode === 'student') {
      return `<div class="v10-items">${items.length ? items.map(item => `
        <div class="v10-item">
          <span style="font-size:1.1rem;">*</span>
          <div class="v10-item-body">
            <div class="v10-item-title">${esc(item.title)}</div>
            ${item.description ? `<div class="v10-item-meta">${esc(item.description)}</div>` : ''}
            ${item.link ? `<a href="${esc(item.link)}" target="_blank" rel="noopener" style="font-size:.78rem;color:var(--primary);word-break:break-all;">${esc(item.link)}</a>` : ''}
          </div>
        </div>`).join('') : `<div style="text-align:center;padding:2rem;color:var(--text3);">No ${esc(feature)} available yet.</div>`}</div>`;
    }
    return `<div class="v10-form">
      <p class="hint">Add ${esc(feature)} for this unit. Students will see it immediately.</p>
      <div class="input-group"><span class="v10-label">${esc(feature).toUpperCase()} TITLE</span><input class="input" id="dyn-title-${key}-${unit}" placeholder="e.g. Unit ${unit} ${esc(feature)}"></div>
      <div class="input-group"><span class="v10-label">DESCRIPTION / DETAILS</span><textarea class="input" id="dyn-desc-${key}-${unit}" rows="3" style="resize:vertical;"></textarea></div>
      <div class="input-group"><span class="v10-label">LINK / URL</span><input class="input" id="dyn-link-${key}-${unit}" placeholder="https://..." type="url"></div>
      <button class="v10-submit" onclick="edusyncAddDynamicFeatureContent('${js(feature)}','${js(subject)}',${unit},'${mode}')">+ Add ${esc(feature)}</button>
    </div>${items.length ? `<div class="v10-items"><div class="v10-items-head">${esc(feature)} (${items.length})</div>${items.map(item => `
      <div class="v10-item">
        <span style="font-size:1.1rem;">*</span>
        <div class="v10-item-body"><div class="v10-item-title">${esc(item.title)}</div><div class="v10-item-meta">${esc(item.uploadedAt || '')}</div></div>
        <button class="v10-del" onclick="edusyncDeleteDynamicFeatureContent(${item.id},'${js(feature)}','${js(subject)}',${unit},'${mode}')" title="Delete">x</button>
      </div>`).join('')}</div>` : ''}`;
  }

  function dynamicContentPanel(subject, unit, mode) {
    const tabs = features().map((feature, index) => {
      const key = slug(feature);
      const count = LEGACY_FEATURE_SLUGS.has(key) ? '' : ` (${dynamicItems(feature, subject, unit).length})`;
      return `<button class="v10-tab ${index === 0 ? 'on' : ''}" onclick="v10SwitchTab(this,'dyn-${mode}-${key}-${unit}')">${esc(key === 'important-questions' ? 'Important Qs' : feature)}${count}</button>`;
    }).join('');
    const panes = features().map((feature, index) => {
      const key = slug(feature);
      let html = genericPane(feature, subject, unit, mode);
      if (key === 'videos') html = mode === 'student' ? '<div style="padding:1rem;color:var(--text3);">Use the Videos tab to view the learning roadmap.</div>' : '<div style="padding:1rem;color:var(--text3);">Add video URLs in the Learning Roadmap panel.</div>';
      if (key === 'notes' && mode !== 'student') html = v10NotesForm(subject, unit);
      if (key === 'pyqs' && mode !== 'student') html = v10PYQForm(subject, unit);
      if (key === 'important-questions' && mode !== 'student') html = v10IQForm(subject, unit);
      return `<div class="v10-pane ${index === 0 ? 'on' : ''}" id="dyn-${mode}-${key}-${unit}">${html}</div>`;
    }).join('');
    return `<div class="v10-panel"><div class="v10-panel-head"><h4>Unit Content</h4></div><div class="v10-tabs">${tabs}</div>${panes}</div>`;
  }

  window.edusyncAddDynamicFeatureContent = function(feature, subject, unit, mode) {
    const key = slug(feature);
    const title = document.getElementById(`dyn-title-${key}-${unit}`)?.value.trim();
    const description = document.getElementById(`dyn-desc-${key}-${unit}`)?.value.trim();
    const link = document.getElementById(`dyn-link-${key}-${unit}`)?.value.trim();
    if (!title) {
      showToast('Enter a title', 'red');
      return;
    }
    const items = read(DYNAMIC_CONTENT_KEY, []);
    items.push({ id: Date.now(), feature, slug: key, title, description, link, subject, unit, uploadedBy: APP.subAdminData?.username || mode || 'Sub Admin', uploadedAt: new Date().toLocaleString() });
    write(DYNAMIC_CONTENT_KEY, items);
    showToast(feature + ' added and live for students.', 'green');
    if (mode === 'creator' && typeof renderCRAddContent === 'function') renderCRAddContent();
    else if (typeof v10SAUnitDetail === 'function' && window._v10SASubjId) v10SAUnitDetail(window._v10SASubjId, unit);
  };

  window.edusyncDeleteDynamicFeatureContent = function(id, feature, subject, unit, mode) {
    if (!confirm(`Delete this ${feature}?`)) return;
    write(DYNAMIC_CONTENT_KEY, read(DYNAMIC_CONTENT_KEY, []).filter(item => item.id !== id));
    showToast('Deleted', 'red');
    if (mode === 'creator' && typeof renderCRAddContent === 'function') renderCRAddContent();
    else if (typeof v10SAUnitDetail === 'function' && window._v10SASubjId) v10SAUnitDetail(window._v10SASubjId, unit);
  };

  adminAddFeature = function() {
    const input = document.getElementById('adm-feature-name');
    const name = input?.value.trim();
    if (!name) {
      showToast('Enter feature name', 'red');
      return;
    }
    const current = features();
    if (current.some(item => slug(item) === slug(name))) {
      showToast('Feature already exists', 'amber');
      return;
    }
    saveFeatures([...current, name]);
    if (input) input.value = '';
    renderAdminSection('create');
    showToast('Feature added and synced to all panels.', 'green');
  };

  adminEditFeature = function(index) {
    const current = features();
    const oldName = current[index];
    const nextName = prompt('Edit feature name:', oldName);
    if (!nextName?.trim()) return;
    current[index] = nextName.trim();
    saveFeatures(current);
    const oldKey = slug(oldName);
    const nextKey = slug(nextName);
    if (oldKey !== nextKey) {
      write(DYNAMIC_CONTENT_KEY, read(DYNAMIC_CONTENT_KEY, []).map(item => item.slug === oldKey ? { ...item, feature: nextName.trim(), slug: nextKey } : item));
    }
    renderAdminSection('create');
    showToast('Feature updated everywhere.', 'green');
  };

  adminDeleteFeature = function(index) {
    const current = features();
    const feature = current[index];
    if (DEFAULT_FEATURES.some(item => slug(item) === slug(feature))) {
      showToast('Default features cannot be removed', 'amber');
      return;
    }
    if (!confirm(`Delete "${feature}"? Existing content for this feature will also be removed.`)) return;
    const key = slug(feature);
    saveFeatures(current.filter((_, itemIndex) => itemIndex !== index));
    write(DYNAMIC_CONTENT_KEY, read(DYNAMIC_CONTENT_KEY, []).filter(item => item.slug !== key));
    renderAdminSection('create');
    showToast('Feature deleted', 'red');
  };

  v10ContentPanel = function(subject, unit, role) {
    return dynamicContentPanel(subject, unit, role === 'content_creator' ? 'content_creator' : 'subadmin');
  };

  v10SAUnitsPage = function(subj) {
    if (!subj?.id) return;
    window._v10SASubj = subj;
    const content = document.getElementById('sa-content');
    if (!content) return;
    const cards = normalizedUnits(subj.id).map((unit, index) => {
      const dynamicCount = read(DYNAMIC_CONTENT_KEY, []).filter(item => item.subject === subj.name && parseInt(item.unit) === unit.id).length;
      const topicCount = (unit.topics || []).length;
      const videoCount = contentCount('edusync_admin_videos', subj.name, unit.id);
      return `<div class="v10-unit-card" onclick="v10SAUnitDetail(${subj.id},${unit.id})">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div class="v10-unit-num">${esc(unit.order || unit.id)}</div>
          <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
            <button class="v10-dot-btn" onclick="v10SAEditUnit(${subj.id},${index})" title="Edit">Edit</button>
            <button class="v10-dot-btn" onclick="v10SADeleteUnit(${subj.id},${index})" title="Delete" style="color:var(--red);">Del</button>
          </div>
        </div>
        <div class="v10-unit-name">${esc(unit.name)}</div>
        ${unit.description ? `<div class="v10-unit-meta" style="margin-bottom:6px;">${esc(unit.description)}</div>` : ''}
        <div class="v10-unit-meta">${topicCount} topic${topicCount !== 1 ? 's' : ''} - ${videoCount} video${videoCount !== 1 ? 's' : ''}</div>
        <div class="v10-unit-badges">
          ${contentCount('edusync_admin_notes', subj.name, unit.id) ? `<span class="badge badge-primary">Notes ${contentCount('edusync_admin_notes', subj.name, unit.id)}</span>` : ''}
          ${contentCount('edusync_admin_pyqs', subj.name, unit.id) ? `<span class="badge badge-amber">PYQs ${contentCount('edusync_admin_pyqs', subj.name, unit.id)}</span>` : ''}
          ${contentCount('edusync_admin_iqs', subj.name, unit.id) ? `<span class="badge badge-lavender">IQs ${contentCount('edusync_admin_iqs', subj.name, unit.id)}</span>` : ''}
          ${dynamicCount ? `<span class="badge badge-teal">More ${dynamicCount}</span>` : ''}
        </div>
        <div class="v10-unit-arrow">Click to add roadmap & content -></div>
      </div>`;
    }).join('');
    content.innerHTML = `<div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
      <button class="back-btn" onclick="v10SASubjects()">Back to Subjects</button>
      <div style="margin:1rem 0 .5rem;">
        <h2 style="font-size:1.25rem;font-weight:800;letter-spacing:-.02em;margin-bottom:6px;">${esc(subj.name)}</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap;"><span class="badge badge-primary">${esc(subj.sem || '-')}</span><span class="badge badge-teal">${esc(subj.uni || 'JNTUK')}</span><span class="badge badge-lavender">${esc(subj.reg || 'R23')}</span><span class="badge badge-amber">${esc(subj.branch || 'CSE')}</span></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem;gap:10px;flex-wrap:wrap;">
        <p style="font-size:.79rem;color:var(--text3);">Click a unit card to open its learning roadmap and upload content</p>
        <button class="btn btn-primary btn-sm" onclick="v10SAAddUnit(${subj.id})">+ Add Unit</button>
      </div>
      <div class="v10-unit-grid">${cards}</div>
    </div>`;
  };

  v10SAAddUnit = function(subjId) {
    const units = normalizedUnits(subjId);
    const nextOrder = units.length ? Math.max(...units.map(unit => Number(unit.order || unit.id))) + 1 : 1;
    const name = prompt('Unit Name:', `Unit ${nextOrder}`);
    if (!name?.trim()) return;
    const description = prompt('Unit Description:', '') || '';
    const order = Number(prompt('Unit Order:', String(nextOrder))) || nextOrder;
    const newId = units.length ? Math.max(...units.map(unit => Number(unit.id))) + 1 : 1;
    units.push({ id: newId, name: name.trim(), description: description.trim(), order, topics: [] });
    write('edusync_units_' + subjId, units);
    showToast('Unit added!', 'green');
    rerenderUnits(subjId);
  };

  v10SAEditUnit = function(subjId, index) {
    const units = normalizedUnits(subjId);
    const unit = units[index];
    if (!unit) return;
    const name = prompt('Unit Name:', unit.name);
    if (!name?.trim()) return;
    unit.name = name.trim();
    unit.description = (prompt('Unit Description:', unit.description || '') || '').trim();
    unit.order = Number(prompt('Unit Order:', String(unit.order || unit.id))) || unit.order || unit.id;
    write('edusync_units_' + subjId, units);
    showToast('Unit updated!', 'green');
    rerenderUnits(subjId);
  };

  v10SADeleteUnit = function(subjId, index) {
    const units = normalizedUnits(subjId);
    const unit = units[index];
    if (!unit || !confirm('Are you sure you want to delete this unit?')) return;
    const subj = subjectById(subjId);
    units.splice(index, 1);
    write('edusync_units_' + subjId, units);
    if (subj) deleteUnitContent(subj.name, unit.id);
    showToast('Unit deleted', 'red');
    rerenderUnits(subjId);
  };

  v10SAUnitDetail = function(subjId, unitId) {
    window._v10SASubjId = subjId;
    window._v10SAUnitId = unitId;
    const subj = window._v10SASubj || subjectById(subjId);
    if (!subj) return;
    const unit = normalizedUnits(subjId).find(item => parseInt(item.id) === parseInt(unitId)) || { id: unitId, name: `Unit ${unitId}`, topics: [] };
    const content = document.getElementById('sa-content');
    if (!content) return;
    content.innerHTML = `<div style="padding:2rem;max-width:1200px;margin:0 auto;width:100%;">
      <button class="back-btn" onclick="v10SAUnitsPage(window._v10SASubj)">Back to Units</button>
      <div style="margin:1rem 0 .3rem;">
        <h2 style="font-size:1.15rem;font-weight:800;margin-bottom:4px;">${esc(subj.name)} - Unit ${esc(unit.order || unit.id)}: ${esc(unit.name)}</h2>
        <p style="font-size:.78rem;color:var(--text3);">${esc(unit.description || 'Build the learning roadmap and add content for this unit.')}</p>
      </div>
      <div class="v10-detail-wrap">${v10RoadmapPanel(subjId, unitId, unit.topics || [])}${dynamicContentPanel(subj.name, unitId, 'subadmin')}</div>
    </div>`;
  };

  const originalRenderCRAddContent = typeof renderCRAddContent === 'function' ? renderCRAddContent : null;
  renderCRAddContent = function() {
    originalRenderCRAddContent?.();
    const subj = window._crSelectedSubj;
    const unit = window._crSelectedUnit;
    const content = document.getElementById('cr-content') || document.getElementById('sa-content');
    const host = content?.querySelector('.v11-tabs')?.parentElement;
    if (!subj || !unit || !host || host.dataset.dynamicFeatures === 'true') return;
    host.dataset.dynamicFeatures = 'true';
    host.insertAdjacentHTML('beforeend', `<div style="margin-top:1rem;">${dynamicContentPanel(subj.name, unit, 'creator')}</div>`);
  };

  const originalOpenUnit = typeof openUnit === 'function' ? openUnit : null;
  openUnit = function(unit, subjectId) {
    originalOpenUnit?.(unit, subjectId);
    const subj = APP.currentSubject;
    const tabs = document.querySelector('#page-unit-content .content-tabs');
    if (!subj || !tabs) return;
    features().forEach(feature => {
      const key = slug(feature);
      if (LEGACY_FEATURE_SLUGS.has(key)) return;
      document.getElementById('tab-btn-dyn-' + key)?.remove();
      document.getElementById('tab-dyn-' + key)?.remove();
      tabs.insertAdjacentHTML('beforeend', `<button class="content-tab" id="tab-btn-dyn-${key}" onclick="switchTab('dyn-${key}')">${esc(feature)}</button>`);
      document.getElementById('page-unit-content').insertAdjacentHTML('beforeend', `<div class="tab-pane" id="tab-dyn-${key}">${genericPane(feature, subj.name, unit, 'student')}</div>`);
    });
  };

  const originalSwitchTab = typeof switchTab === 'function' ? switchTab : null;
  switchTab = function(tab) {
    if (String(tab).startsWith('dyn-')) {
      document.querySelectorAll('.content-tab').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(item => {
        item.classList.remove('active');
        item.style.display = 'none';
      });
      document.getElementById('tab-btn-' + tab)?.classList.add('active');
      const pane = document.getElementById('tab-' + tab);
      if (pane) {
        pane.classList.add('active');
        pane.style.display = 'block';
      }
      APP.currentTab = tab;
      return;
    }
    originalSwitchTab?.(tab);
  };
})();

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function v11CloseAllPopups() {
  document.querySelectorAll('.adm-popup,.v10-popup').forEach(p => p.remove());
}
document.addEventListener('click', v11CloseAllPopups);

function v11Confirm(msg, onYes) {
  v11CloseAllPopups();
  const el = document.createElement('div');
  el.className = 'v11-confirm-modal';
  el.innerHTML = `<div class="v11-confirm-box">
    <div style="font-size:1.6rem;margin-bottom:.8rem;">⚠️</div>
    <h3 style="font-size:1.05rem;margin-bottom:.6rem;">Confirm Action</h3>
    <p style="font-size:.87rem;color:var(--text2);line-height:1.5;margin-bottom:1.4rem;">${msg}</p>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.v11-confirm-modal').remove()">Cancel</button>
      <button class="btn btn-danger btn-sm" id="v11-yes-btn">Yes, Delete</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#v11-yes-btn').onclick = () => { el.remove(); onYes(); };
  el.addEventListener('click', e => { if(e.target===el) el.remove(); });
}

function v11GetAllSubjects() {
  const custom = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  // Also return built-in subjects (flattened)
  const builtin = Object.entries(SUBJECTS_DB).flatMap(([sem, subs]) =>
    subs.map(s => ({ ...s, isBuiltin:true, sem }))
  );
  return { custom, builtin, all: [...custom, ...builtin] };
}

function v11GetUnits(subjId, isBuiltin, subjObj) {
  if (isBuiltin) {
    // Use UNIT_TOPICS for builtin subjects
    const topicMap = UNIT_TOPICS[subjId] || UNIT_TOPICS['default'];
    return Array.from({length:5}, (_,i) => ({
      id: i+1,
      name: `Unit ${i+1}`,
      topics: (topicMap[i+1]||[]).map(t=>({name:t,url:''}))
    }));
  }
  const stored = JSON.parse(localStorage.getItem('edusync_units_' + subjId) || '[]');
  if (stored.length) return stored;
  return Array.from({length:5}, (_,i)=>({id:i+1,name:`Unit ${i+1}`,topics:[]}));
}

function v11GetSubjectOptions(includeBuiltin) {
  const { custom, builtin } = v11GetAllSubjects();
  const all = includeBuiltin
    ? [...custom, ...builtin]
    : custom;
  if (!all.length) return '<option value="">No subjects yet</option>';
  return '<option value="">Select Subject</option>' +
    all.map(s=>`<option value="${s.name}">${s.name}${s.isBuiltin?' (Built-in)':''}</option>`).join('');
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN SUBJECTS PAGE — WITH 3-DOT MENU
// ═══════════════════════════════════════════════════════════════
function v11AdminSubjectsPage() {
  const content = document.getElementById('admin-content');
  if (!content) return;
  const custom = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');

  const semGroups = {};
  custom.forEach(s => {
    const key = s.sem || 'Other';
    if (!semGroups[key]) semGroups[key] = [];
    semGroups[key].push(s);
  });

  content.innerHTML = `
  <div style="padding:2rem;max-width:1200px;margin:0 auto;width:100%;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:10px;">
      <div>
        <h2 style="font-size:1.4rem;font-weight:800;letter-spacing:-.02em;margin-bottom:4px;">📚 All Subjects</h2>
        <p style="font-size:.83rem;color:var(--text2);">${custom.length} custom subjects · Hover a card and click ⋮ to edit or delete</p>
      </div>
      <button class="btn btn-primary" onclick="v11AdminShowCreateSubjectForm()">+ Add Subject</button>
    </div>

    <!-- Create form (collapsed by default) -->
    <div id="v11-adm-create-form" style="display:none;margin-bottom:1.5rem;">
      <div class="card" style="border:2px dashed var(--primary-mid);">
        <h3 style="margin-bottom:1rem;font-size:1rem;">➕ Create New Subject</h3>
        <div class="form-row">
          <div class="input-group"><label>Branch</label>
            <select class="select" id="v11-adm-branch">
              <option value="">Select Branch</option>
              ${['CSE','ECE','EEE','IT','AIML','AIDS','MECH','CIVIL'].map(b=>`<option>${b}</option>`).join('')}
            </select></div>
          <div class="input-group"><label>Year</label>
            <select class="select" id="v11-adm-year">
              <option value="">Select Year</option>
              ${['1','2','3','4'].map(y=>`<option value="${y}">${y}st Year</option>`).join('')}
            </select></div>
        </div>
        <div class="form-row">
          <div class="input-group"><label>Semester</label>
            <select class="select" id="v11-adm-sem">
              <option value="">Select Semester</option>
              ${['1-1','1-2','2-1','2-2','3-1','3-2','4-1','4-2'].map(s=>`<option>${s}</option>`).join('')}
            </select></div>
          <div class="input-group"><label>Regulation</label>
            <select class="select" id="v11-adm-reg">
              <option value="">Regulation</option>
              <option>R23</option><option>R20</option><option>R19</option><option>R16</option>
            </select></div>
        </div>
        <div class="form-row">
          <div class="input-group"><label>University</label>
            <select class="select" id="v11-adm-uni">
              <option value="">Select University</option>
              <option>JNTUK</option><option>JNTUH</option><option>Andhra University</option>
            </select></div>
          <div class="input-group"><label>Credits</label>
            <select class="select" id="v11-adm-credits">
              ${[2,3,4,5].map(c=>`<option value="${c}">${c} Credits</option>`).join('')}
            </select></div>
        </div>
        <div class="form-row">
          <div class="input-group"><label>Subject Name *</label>
            <input class="input" id="v11-adm-subname" placeholder="e.g. Data Structures"></div>
          <div class="input-group"><label>Code</label>
            <input class="input" id="v11-adm-subcode" placeholder="CS301"></div>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" onclick="v11AdminCreateSubject()">✅ Create Subject</button>
          <button class="btn btn-ghost" onclick="document.getElementById('v11-adm-create-form').style.display='none'">Cancel</button>
        </div>
      </div>
    </div>

    ${custom.length === 0 ? `
    <div style="text-align:center;padding:4rem;color:var(--text3);">
      <div style="font-size:4rem;margin-bottom:1rem;">📚</div>
      <div style="font-weight:700;font-size:1.05rem;margin-bottom:4px;">No subjects yet</div>
      <div style="font-size:.83rem;">Click "+ Add Subject" to create your first subject</div>
    </div>` : `
    <div class="adm-subj-grid" id="v11-adm-subj-grid">
      ${custom.map(s => v11AdminSubjectCard(s)).join('')}
    </div>`}
  </div>`;
}

function v11AdminSubjectCard(s) {
  const safeName = (s.name||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  return `
  <div class="adm-subj-card" id="adm-scard-${s.id}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
      <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--primary-light),var(--lavender-light));display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">📖</div>
      <div class="v10-dot-wrap" onclick="event.stopPropagation()">
        <button class="v10-dot-btn" onclick="v11AdminSubjectDotMenu(this,${s.id},'${safeName}')" title="Options">⋮</button>
      </div>
    </div>
    <div style="font-weight:700;font-size:.94rem;margin-bottom:3px;">${s.name}</div>
    <div style="font-size:.74rem;color:var(--text3);margin-bottom:10px;">${s.code||'—'} · ${s.credits||3} Cr · ${s.branch||'CSE'}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
      <span class="badge badge-primary">${s.sem||'—'}</span>
      <span class="badge badge-teal">${s.uni||'JNTUK'}</span>
      <span class="badge badge-lavender">${s.reg||'R23'}</span>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="v11AdminOpenSubject(${s.id})" style="width:100%;">📂 Manage Units & Content →</button>
  </div>`;
}

function v11AdminShowCreateSubjectForm() {
  const f = document.getElementById('v11-adm-create-form');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function v11AdminSubjectDotMenu(btn, id, name) {
  v11CloseAllPopups();
  const safeName = name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const popup = document.createElement('div');
  popup.className = 'adm-popup';
  popup.innerHTML = `
    <button class="adm-popup-item" onclick="v11AdminOpenSubject(${id})">📂 Manage Units</button>
    <button class="adm-popup-item" onclick="v11AdminEditSubject(${id})">✏️ Edit Subject</button>
    <button class="adm-popup-item red" onclick="v11AdminDeleteSubject(${id},'${safeName}')">🗑️ Delete Subject</button>`;
  btn.closest('.v10-dot-wrap').appendChild(popup);
  event.stopPropagation();
}

async function v11AdminCreateSubject() {
  const branch = document.getElementById('v11-adm-branch')?.value;
  const year = document.getElementById('v11-adm-year')?.value;
  const sem = document.getElementById('v11-adm-sem')?.value;
  const reg = document.getElementById('v11-adm-reg')?.value;
  const uni = document.getElementById('v11-adm-uni')?.value;
  const credits = document.getElementById('v11-adm-credits')?.value || '3';
  const name = document.getElementById('v11-adm-subname')?.value.trim();
  const code = document.getElementById('v11-adm-subcode')?.value.trim();
  if (!branch || !sem || !reg || !uni || !name) { showToast('Fill all required fields', 'red'); return; }

  const newSubj = { id: Date.now(), branch, year, sem, reg, uni, credits, name, code, createdBy: 'admin' };

  // Sync to DB
  const supabase = window.__AIMEASY_SUPABASE__;
  if (supabase) {
    try {
      const { data, error } = await supabase.from('subjects').insert({
        name: name,
        code: code,
        branch: branch,
        regulation_code: reg,
        semester: sem,
        university_name: uni,
        created_by: 'admin'
      }).select().single();
      if (error) {
        showToast('Failed to create subject in DB: ' + error.message, 'red');
        return;
      }
      if (data) {
        newSubj.dbSubjectId = data.id;
      }
    } catch (e) {
      showToast('DB error: ' + e.message, 'red');
      return;
    }
  }

  const subjects = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  subjects.push(newSubj);
  localStorage.setItem('edusync_custom_subjects', JSON.stringify(subjects));
  showToast('✅ Subject created! Visible to students, sub admins, and creators.', 'green');
  v11AdminSubjectsPage();
}

function v11AdminEditSubject(id) {
  v11CloseAllPopups();
  const subjects = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  // Show inline edit form
  const content = document.getElementById('admin-content');
  if (!content) return;
  const branches = ['CSE','ECE','EEE','IT','AIML','AIDS','MECH','CIVIL'];
  const sems = ['1-1','1-2','2-1','2-2','3-1','3-2','4-1','4-2'];
  const regs = ['R23','R20','R19','R16'];
  const unis = ['JNTUK','JNTUH','Andhra University'];
  content.innerHTML = `
  <div style="padding:2rem;max-width:600px;margin:0 auto;width:100%;">
    <button class="v11-back" onclick="v11AdminSubjectsPage()">← Back to Subjects</button>
    <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:1.4rem;">✏️ Edit Subject: ${s.name}</h2>
    <div class="card">
      <div class="form-row">
        <div class="input-group"><label>Subject Name</label>
          <input class="input" id="v11-edit-name" value="${s.name||''}"></div>
        <div class="input-group"><label>Code</label>
          <input class="input" id="v11-edit-code" value="${s.code||''}"></div>
      </div>
      <div class="form-row">
        <div class="input-group"><label>Branch</label>
          <select class="select" id="v11-edit-branch">
            ${branches.map(b=>`<option value="${b}"${s.branch===b?' selected':''}>${b}</option>`).join('')}
          </select></div>
        <div class="input-group"><label>Semester</label>
          <select class="select" id="v11-edit-sem">
            ${sems.map(x=>`<option value="${x}"${s.sem===x?' selected':''}>${x}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-row">
        <div class="input-group"><label>Regulation</label>
          <select class="select" id="v11-edit-reg">
            ${regs.map(r=>`<option value="${r}"${s.reg===r?' selected':''}>${r}</option>`).join('')}
          </select></div>
        <div class="input-group"><label>University</label>
          <select class="select" id="v11-edit-uni">
            ${unis.map(u=>`<option value="${u}"${s.uni===u?' selected':''}>${u}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-row">
        <div class="input-group"><label>Year</label>
          <select class="select" id="v11-edit-year">
            <option value="">Select Year</option>
            ${['1','2','3','4'].map(y=>`<option value="${y}"${s.year==y?' selected':''}>${y}st Year</option>`).join('')}
          </select></div>
        <div class="input-group"><label>Credits</label>
          <select class="select" id="v11-edit-credits">
            ${[2,3,4,5].map(c=>`<option value="${c}"${s.credits==c?' selected':''}>${c} Credits</option>`).join('')}
          </select></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button class="btn btn-primary" onclick="v11AdminSaveEditSubject(${id})">💾 Save Changes</button>
        <button class="btn btn-ghost" onclick="v11AdminSubjectsPage()">Cancel</button>
      </div>
    </div>
  </div>`;
}

async function v11AdminSaveEditSubject(id) {
  const subjects = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  const idx = subjects.findIndex(x => x.id === id);
  if (idx === -1) return;

  const nextName = document.getElementById('v11-edit-name')?.value.trim() || subjects[idx].name;
  const nextCode = document.getElementById('v11-edit-code')?.value.trim() || subjects[idx].code;
  const nextBranch = document.getElementById('v11-edit-branch')?.value || subjects[idx].branch;
  const nextSem = document.getElementById('v11-edit-sem')?.value || subjects[idx].sem;
  const nextReg = document.getElementById('v11-edit-reg')?.value || subjects[idx].reg;
  const nextUni = document.getElementById('v11-edit-uni')?.value || subjects[idx].uni;
  const nextYear = document.getElementById('v11-edit-year')?.value || subjects[idx].year;
  const nextCredits = document.getElementById('v11-edit-credits')?.value || subjects[idx].credits;

  const dbSubjectId = subjects[idx].dbSubjectId;

  // Sync to DB
  const supabase = window.__AIMEASY_SUPABASE__;
  if (supabase && dbSubjectId) {
    try {
      const { error } = await supabase.from('subjects').update({
        name: nextName,
        code: nextCode,
        branch: nextBranch,
        regulation_code: nextReg,
        semester: nextSem,
        university_name: nextUni,
      }).eq('id', dbSubjectId);
      if (error) {
        showToast('Failed to update subject in DB: ' + error.message, 'red');
        return;
      }
    } catch (e) {
      showToast('DB error: ' + e.message, 'red');
      return;
    }
  }

  subjects[idx] = {
    ...subjects[idx],
    name: nextName,
    code: nextCode,
    branch: nextBranch,
    sem: nextSem,
    reg: nextReg,
    uni: nextUni,
    year: nextYear,
    credits: nextCredits,
  };
  localStorage.setItem('edusync_custom_subjects', JSON.stringify(subjects));
  showToast('✅ Subject updated! Changes reflected everywhere.', 'green');
  v11AdminSubjectsPage();
}

function v11AdminDeleteSubject(id, name) {
  v11CloseAllPopups();
  v11Confirm(
    `Delete subject "<strong>${name}</strong>"?<br><br>This will permanently remove all its units, topics, videos, notes, PYQs, and important questions.`,
    () => {
      const subjects = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
      const subj = subjects.find(s => s.id === id);

      // Sync to DB
      const supabase = window.__AIMEASY_SUPABASE__;
      if (supabase && subj?.dbSubjectId) {
        supabase.from('subjects').delete().eq('id', subj.dbSubjectId).then(({ error }) => {
          if (error) {
            showToast('Failed to delete subject from DB: ' + error.message, 'red');
          }
        });
      }

      localStorage.setItem('edusync_custom_subjects', JSON.stringify(subjects.filter(s => s.id !== id)));
      // Remove all related content
      localStorage.removeItem('edusync_units_' + id);
      // Remove related content (notes/pyqs/iqs/videos that belong to this subject by name)
      if (subj) {
        const n = subj.name;
        ['edusync_admin_notes','edusync_admin_pyqs','edusync_admin_iqs','edusync_admin_videos'].forEach(key => {
          const arr = JSON.parse(localStorage.getItem(key)||'[]');
          localStorage.setItem(key, JSON.stringify(arr.filter(x=>x.subject!==n)));
        });
      }
      showToast('Subject and all related content deleted.', 'red');
      v11AdminSubjectsPage();
    }
  );
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: SUBJECT → UNIT MANAGEMENT PAGE
// ═══════════════════════════════════════════════════════════════
function v11AdminOpenSubject(id) {
  v11CloseAllPopups();
  const subjects = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  const subj = subjects.find(s => s.id === id);
  if (!subj) { showToast('Subject not found', 'red'); return; }
  window._v11AdminSubj = subj;
  v11AdminUnitsPage(subj);
}

function v11AdminUnitsPage(subj) {
  const content = document.getElementById('admin-content');
  if (!content) return;
  const units = v11GetUnits(subj.id, false, subj);

  const adminVideos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]');
  const adminNotes  = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]');
  const adminPYQs   = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]');
  const adminIQs    = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]');

  content.innerHTML = `
  <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
    <button class="v11-back" onclick="v11AdminSubjectsPage()">← Back to Subjects</button>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:10px;">
      <div>
        <h2 style="font-size:1.2rem;font-weight:800;letter-spacing:-.02em;margin-bottom:4px;">📖 ${subj.name} — Units</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <span class="badge badge-primary">${subj.sem||'—'}</span>
          <span class="badge badge-teal">${subj.uni||'JNTUK'}</span>
          <span class="badge badge-lavender">${subj.reg||'R23'}</span>
          <span class="badge badge-amber">${subj.branch||'CSE'}</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="v11AdminAddUnit(${subj.id})">+ Add Unit</button>
    </div>
    <div class="adm-unit-grid">
      ${units.map((u,ui) => {
        const vC = adminVideos.filter(v=>v.subject===subj.name&&parseInt(v.unit)===u.id).length;
        const nC = adminNotes.filter(n=>n.subject===subj.name&&parseInt(n.unit)===u.id).length;
        const pC = adminPYQs.filter(p=>p.subject===subj.name&&parseInt(p.unit)===u.id).length;
        const iC = adminIQs.filter(q=>q.subject===subj.name&&parseInt(q.unit)===u.id).length;
        const tC = (u.topics||[]).length;
        return `<div class="adm-unit-card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
            <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--lavender),var(--primary));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1.1rem;flex-shrink:0;">${u.id}</div>
            <div style="display:flex;gap:4px;" onclick="event.stopPropagation()">
              <button class="v10-dot-btn" title="Edit" onclick="v11AdminEditUnit(${subj.id},${ui})" style="font-size:.8rem;">✏️</button>
              <button class="v10-dot-btn" title="Delete" onclick="v11AdminDeleteUnit(${subj.id},${ui})" style="font-size:.8rem;color:var(--red);">🗑️</button>
            </div>
          </div>
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px;">${u.name}</div>
          <div style="font-size:.74rem;color:var(--text3);margin-bottom:8px;">${tC} topic${tC!==1?'s':''}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
            ${vC?`<span class="badge badge-teal">🎬 ${vC}</span>`:''}
            ${nC?`<span class="badge badge-primary">📄 ${nC}</span>`:''}
            ${pC?`<span class="badge badge-amber">📝 ${pC}</span>`:''}
            ${iC?`<span class="badge badge-lavender">⭐ ${iC}</span>`:''}
          </div>
          <button class="btn btn-ghost btn-sm" onclick="v11AdminUnitDetail(${subj.id},${u.id})" style="width:100%;">Manage Content →</button>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function v11AdminAddUnit(subjId) {
  let units = JSON.parse(localStorage.getItem('edusync_units_' + subjId) || '[]');
  if (!units.length) units = Array.from({length:5}, (_,i)=>({ id:i+1, name:`Unit ${i+1}`, order:i+1, topics:[] }));
  const newId = Math.max(...units.map(u => Number(u.id) || 0)) + 1;
  const name = prompt('Unit name:', `Unit ${newId}`);
  if (!name) return;
  units.push({ id: newId, name: name.trim(), order: newId, topics: [] });
  localStorage.setItem('edusync_units_' + subjId, JSON.stringify(units));
  showToast('✅ Unit added!', 'green');
  v11AdminUnitsPage(window._v11AdminSubj);
}

function v11AdminEditUnit(subjId, idx) {
  const units = JSON.parse(localStorage.getItem('edusync_units_' + subjId) || '[]');
  if (!units[idx]) return;
  const name = prompt('Edit unit name:', units[idx].name);
  if (!name) return;
  units[idx].name = name.trim();
  localStorage.setItem('edusync_units_' + subjId, JSON.stringify(units));
  showToast('✅ Unit updated!', 'green');
  v11AdminUnitsPage(window._v11AdminSubj);
}

function v11AdminDeleteUnit(subjId, idx) {
  v11Confirm('Delete this unit and all its topics?', () => {
    const units = JSON.parse(localStorage.getItem('edusync_units_' + subjId) || '[]');
    units.splice(idx, 1);
    localStorage.setItem('edusync_units_' + subjId, JSON.stringify(units));
    showToast('Unit deleted', 'red');
    v11AdminUnitsPage(window._v11AdminSubj);
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: UNIT DETAIL — TOPICS + FULL CONTENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function v11AdminUnitDetail(subjId, unitId) {
  window._v11AdminSubjId = subjId;
  window._v11AdminUnitId = unitId;
  const subj = window._v11AdminSubj;
  if (!subj) return;
  const content = document.getElementById('admin-content');
  if (!content) return;
  const units = v11GetUnits(subjId, false, subj);
  const unit = units.find(u => u.id === unitId) || { id: unitId, name: `Unit ${unitId}`, topics: [] };

  const adminVideos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]').filter(v=>v.subject===subj.name&&parseInt(v.unit)===unitId);
  const adminNotes  = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]').filter(n=>n.subject===subj.name&&parseInt(n.unit)===unitId);
  const adminPYQs   = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]').filter(p=>p.subject===subj.name&&parseInt(p.unit)===unitId);
  const adminIQs    = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]').filter(q=>q.subject===subj.name&&parseInt(q.unit)===unitId);

  content.innerHTML = `
  <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
    <button class="v11-back" onclick="v11AdminUnitsPage(window._v11AdminSubj)">← Back to Units</button>
    <h2 style="font-size:1.15rem;font-weight:800;margin-bottom:.4rem;">${subj.name} — ${unit.name}</h2>
    <p style="font-size:.79rem;color:var(--text3);margin-bottom:1.2rem;">Full content management for this unit</p>

    <!-- Content Tabs -->
    <div class="v11-tabs">
      <button class="v11-tab on" onclick="v11SwitchTab(this,'v11-topics')">📋 Topics (${(unit.topics||[]).length})</button>
      <button class="v11-tab" onclick="v11SwitchTab(this,'v11-videos')">🎬 Videos (${adminVideos.length})</button>
      <button class="v11-tab" onclick="v11SwitchTab(this,'v11-notes')">📄 Notes (${adminNotes.length})</button>
      <button class="v11-tab" onclick="v11SwitchTab(this,'v11-pyqs')">📝 PYQs (${adminPYQs.length})</button>
      <button class="v11-tab" onclick="v11SwitchTab(this,'v11-iqs')">⭐ Imp. Questions (${adminIQs.length})</button>
    </div>

    <!-- Topics pane -->
    <div class="v11-pane on" id="v11-topics">
      <div class="card">
        <h4 style="margin-bottom:1rem;">Learning Roadmap / Topics</h4>
        <div id="v11-topics-list">
          ${(unit.topics||[]).map((t,ti)=>`
          <div class="v11-item-row">
            <span style="width:22px;height:22px;border-radius:50%;background:var(--primary);color:#fff;font-size:.7rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ti+1}</span>
            <span style="flex:1;">${t.name}</span>
            ${t.url?`<a href="${t.url}" target="_blank" class="badge badge-teal" style="text-decoration:none;">▶ Video</a>`:''}
            <button class="btn btn-danger btn-sm" onclick="v11AdminDeleteTopic(${subjId},${unitId},${ti})">✕</button>
          </div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No topics yet. Add some below.</p>'}
        </div>
        <hr style="margin:1rem 0;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <input class="input" id="v11-topic-name" placeholder="Topic name" style="flex:1;min-width:180px;">
          <input class="input" id="v11-topic-url" placeholder="YouTube URL (optional)" style="flex:1;min-width:220px;">
          <button class="btn btn-primary" onclick="v11AdminAddTopic(${subjId},${unitId})">+ Add Topic</button>
        </div>
      </div>
    </div>

    <!-- Videos pane -->
    <div class="v11-pane" id="v11-videos">
      <div class="card">
        <h4 style="margin-bottom:1rem;">🎬 Upload Video</h4>
        <div class="form-row">
          <div class="input-group"><label>Video Title</label><input class="input" id="v11-vtitle" placeholder="e.g. Unit 1 Introduction"></div>
          <div class="input-group"><label>YouTube URL</label><input class="input" id="v11-vurl" placeholder="https://youtube.com/watch?v=..."></div>
        </div>
        <button class="btn btn-primary" onclick="v11AdminUploadVideo(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">📤 Upload Video</button>
        <hr style="margin:1rem 0;">
        <div id="v11-videos-list">
          ${adminVideos.map(v=>`
          <div class="v11-item-row">
            <span>🎬</span>
            <div style="flex:1;min-width:0;"><div style="font-weight:600;">${v.title}</div><div style="font-size:.72rem;color:var(--primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.url}</div></div>
            <span class="badge badge-green">Live</span>
            <button class="btn btn-danger btn-sm" onclick="v11AdminDeleteVideo(${v.id},${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">✕</button>
          </div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No videos yet.</p>'}
        </div>
      </div>
    </div>

    <!-- Notes pane -->
    <div class="v11-pane" id="v11-notes">
      <div class="card">
        <h4 style="margin-bottom:1rem;">📄 Upload Notes</h4>
        <div class="form-row">
          <div class="input-group"><label>Title</label><input class="input" id="v11-ntitle" placeholder="e.g. Unit 1 Handwritten Notes"></div>
          <div class="input-group"><label>Type</label>
            <select class="select" id="v11-ntype">
              <option value="pdf">PDF</option><option value="doc">DOC</option><option value="link">Link</option>
            </select></div>
        </div>
        <div class="input-group"><label>Google Drive / URL Link</label><input class="input" id="v11-nlink" placeholder="https://drive.google.com/..."></div>
        <button class="btn btn-primary" onclick="v11AdminUploadNote(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">📤 Upload Notes</button>
        <hr style="margin:1rem 0;">
        <div id="v11-notes-list">
          ${adminNotes.map(n=>`
          <div class="v11-item-row">
            <span>${n.type==='pdf'?'📄':'📝'}</span>
            <div style="flex:1;"><div style="font-weight:600;">${n.title}</div><div style="font-size:.72rem;color:var(--text3);">${n.type?.toUpperCase()||'FILE'} · ${n.uploadedAt||''}</div></div>
            <span class="badge badge-green">Live</span>
            <button class="btn btn-danger btn-sm" onclick="v11AdminDeleteNote(${n.id},${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">✕</button>
          </div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No notes yet.</p>'}
        </div>
      </div>
    </div>

    <!-- PYQs pane -->
    <div class="v11-pane" id="v11-pyqs">
      <div class="card">
        <h4 style="margin-bottom:1rem;">📝 Add PYQ</h4>
        <div class="form-row">
          <div class="input-group"><label>Exam Year</label><input class="input" id="v11-pyqyr" placeholder="e.g. 2023" type="number" min="2000" max="2099"></div>
          <div class="input-group"><label>Times Asked</label><input class="input" id="v11-pyqcnt" placeholder="e.g. 3" type="number" min="1" value="1"></div>
        </div>
        <div class="input-group"><label>Question</label><textarea class="input" id="v11-pyqtxt" placeholder="Type the question..." rows="3" style="resize:vertical;"></textarea></div>
        <div class="input-group"><label>Answer (optional)</label><textarea class="input" id="v11-pyqans" placeholder="Answer/explanation..." rows="2" style="resize:vertical;"></textarea></div>
        <button class="btn btn-primary" onclick="v11AdminUploadPYQ(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">📝 Add PYQ</button>
        <hr style="margin:1rem 0;">
        <div id="v11-pyqs-list">
          ${adminPYQs.map(p=>`
          <div class="v11-item-row">
            <span>📅</span>
            <div style="flex:1;min-width:0;"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.question.substring(0,80)}${p.question.length>80?'...':''}</div><div style="font-size:.72rem;color:var(--text3);">Year: ${p.year} · ×${p.count||1}</div></div>
            <span class="badge badge-green">Live</span>
            <button class="btn btn-danger btn-sm" onclick="v11AdminDeletePYQ(${p.id},${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">✕</button>
          </div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No PYQs yet.</p>'}
        </div>
      </div>
    </div>

    <!-- Important Questions pane -->
    <div class="v11-pane" id="v11-iqs">
      <div class="card">
        <h4 style="margin-bottom:1rem;">⭐ Add Important Question</h4>
        <div class="input-group"><label>Question</label><textarea class="input" id="v11-iqtxt" placeholder="Type the important question..." rows="3" style="resize:vertical;"></textarea></div>
        <div class="form-row">
          <div class="input-group"><label>Priority</label>
            <select class="select" id="v11-iqprio">
              <option value="high">🔴 High</option>
              <option value="med" selected>🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select></div>
          <div class="input-group"><label>Tags</label><input class="input" id="v11-iqtags" placeholder="e.g. Unit 1, Memory"></div>
        </div>
        <button class="btn btn-primary" onclick="v11AdminUploadIQ(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">⭐ Add Question</button>
        <hr style="margin:1rem 0;">
        <div id="v11-iqs-list">
          ${adminIQs.map(q=>`
          <div class="v11-item-row">
            <span>${q.priority==='high'?'🔴':q.priority==='low'?'🟢':'🟡'}</span>
            <div style="flex:1;min-width:0;"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${q.question.substring(0,80)}${q.question.length>80?'...':''}</div><div style="font-size:.72rem;color:var(--text3);">${q.priority} priority${q.tags?' · '+q.tags:''}</div></div>
            <span class="badge badge-green">Live</span>
            <button class="btn btn-danger btn-sm" onclick="v11AdminDeleteIQ(${q.id},${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}')">✕</button>
          </div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No important questions yet.</p>'}
        </div>
      </div>
    </div>
  </div>`;
}

function v11SwitchTab(btn, paneId) {
  const container = btn.closest('.v11-tabs').nextElementSibling?.parentElement || btn.closest('div[style]') || document;
  btn.closest('.v11-tabs').querySelectorAll('.v11-tab').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  // Hide all panes in same section
  const allPanes = btn.closest('div[style]') ? btn.closest('div[style]').querySelectorAll('.v11-pane') : document.querySelectorAll('.v11-pane');
  allPanes.forEach(p=>p.classList.remove('on'));
  const target = document.getElementById(paneId);
  if (target) target.classList.add('on');
}

function v11AdminAddTopic(subjId, unitId) {
  const name = document.getElementById('v11-topic-name')?.value.trim();
  const url = document.getElementById('v11-topic-url')?.value.trim();
  if (!name) { showToast('Enter topic name', 'red'); return; }
  let units = JSON.parse(localStorage.getItem('edusync_units_' + subjId) || '[]');
  if (!units.length) {
    units = Array.from({length:5},(_,i)=>({id:i+1,name:`Unit ${i+1}`,topics:[]}));
  }
  const uidx = units.findIndex(u=>u.id===unitId);
  if (uidx === -1) return;
  if (!units[uidx].topics) units[uidx].topics = [];
  units[uidx].topics.push({ name, url: url || '' });
  localStorage.setItem('edusync_units_' + subjId, JSON.stringify(units));
  document.getElementById('v11-topic-name').value = '';
  document.getElementById('v11-topic-url').value = '';
  showToast('✅ Topic added! Visible in student roadmap.', 'green');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminDeleteTopic(subjId, unitId, topicIdx) {
  const units = JSON.parse(localStorage.getItem('edusync_units_' + subjId) || '[]');
  const uidx = units.findIndex(u=>u.id===unitId);
  if (uidx !== -1 && units[uidx].topics) {
    units[uidx].topics.splice(topicIdx, 1);
    localStorage.setItem('edusync_units_' + subjId, JSON.stringify(units));
    showToast('Topic deleted', 'red');
    v11AdminUnitDetail(subjId, unitId);
  }
}

function v11AdminUploadVideo(subjId, unitId, subjName) {
  const title = document.getElementById('v11-vtitle')?.value.trim();
  const url   = document.getElementById('v11-vurl')?.value.trim();
  if (!title || !url) { showToast('Enter title and URL', 'red'); return; }
  const videos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]');
  videos.push({ id:Date.now(), title, url, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:'Admin' });
  localStorage.setItem('edusync_admin_videos', JSON.stringify(videos));
  document.getElementById('v11-vtitle').value='';
  document.getElementById('v11-vurl').value='';
  showToast('✅ Video uploaded! Live for students.', 'green');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminDeleteVideo(vid, subjId, unitId, subjName) {
  const videos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]');
  localStorage.setItem('edusync_admin_videos', JSON.stringify(videos.filter(v=>v.id!==vid)));
  showToast('Video deleted', 'red');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminUploadNote(subjId, unitId, subjName) {
  const title = document.getElementById('v11-ntitle')?.value.trim();
  const type  = document.getElementById('v11-ntype')?.value;
  const link  = document.getElementById('v11-nlink')?.value.trim();
  if (!title) { showToast('Enter title', 'red'); return; }
  const notes = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]');
  notes.push({ id:Date.now(), title, type, link, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:'Admin' });
  localStorage.setItem('edusync_admin_notes', JSON.stringify(notes));
  document.getElementById('v11-ntitle').value='';
  document.getElementById('v11-nlink').value='';
  showToast('✅ Notes uploaded! Live for students.', 'green');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminDeleteNote(nid, subjId, unitId, subjName) {
  const notes = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]');
  localStorage.setItem('edusync_admin_notes', JSON.stringify(notes.filter(n=>n.id!==nid)));
  showToast('Note deleted', 'red');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminUploadPYQ(subjId, unitId, subjName) {
  const year     = document.getElementById('v11-pyqyr')?.value.trim();
  const count    = document.getElementById('v11-pyqcnt')?.value||'1';
  const question = document.getElementById('v11-pyqtxt')?.value.trim();
  const answer   = document.getElementById('v11-pyqans')?.value.trim();
  if (!question||!year) { showToast('Enter question and year', 'red'); return; }
  const pyqs = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]');
  pyqs.push({ id:Date.now(), question, answer, year, count:parseInt(count)||1, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString() });
  localStorage.setItem('edusync_admin_pyqs', JSON.stringify(pyqs));
  document.getElementById('v11-pyqtxt').value='';
  document.getElementById('v11-pyqans').value='';
  document.getElementById('v11-pyqyr').value='';
  showToast('✅ PYQ added! Live for students.', 'green');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminDeletePYQ(pid, subjId, unitId, subjName) {
  const pyqs = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]');
  localStorage.setItem('edusync_admin_pyqs', JSON.stringify(pyqs.filter(p=>p.id!==pid)));
  showToast('PYQ deleted', 'red');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminUploadIQ(subjId, unitId, subjName) {
  const question = document.getElementById('v11-iqtxt')?.value.trim();
  const priority = document.getElementById('v11-iqprio')?.value;
  const tags     = document.getElementById('v11-iqtags')?.value.trim();
  if (!question) { showToast('Enter question', 'red'); return; }
  const iqs = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]');
  iqs.push({ id:Date.now(), question, priority, tags, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString() });
  localStorage.setItem('edusync_admin_iqs', JSON.stringify(iqs));
  document.getElementById('v11-iqtxt').value='';
  document.getElementById('v11-iqtags').value='';
  showToast('✅ Important question added! Live for students.', 'green');
  v11AdminUnitDetail(subjId, unitId);
}

function v11AdminDeleteIQ(qid, subjId, unitId, subjName) {
  const iqs = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]');
  localStorage.setItem('edusync_admin_iqs', JSON.stringify(iqs.filter(q=>q.id!==qid)));
  showToast('Question deleted', 'red');
  v11AdminUnitDetail(subjId, unitId);
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: OVERRIDE switchAdminSection('subjects') → v11
// ═══════════════════════════════════════════════════════════════
(function patchAdminSubjectsSection(){
  setTimeout(() => {
    const _orig = switchAdminSection;
    switchAdminSection = function(section) {
      if (section === 'subjects') {
        closeAdminSidebar && closeAdminSidebar();
        document.querySelectorAll('[id^="admin-nav-"]').forEach(el=>el.classList.remove('active'));
        const navEl = document.getElementById('admin-nav-subjects');
        if (navEl) navEl.classList.add('active');
        const titleEl = document.getElementById('admin-topbar-title');
        if (titleEl) titleEl.textContent = 'All Subjects';
        v11AdminSubjectsPage();
        return;
      }
      _orig(section);
    };
  }, 200);
})();

// ═══════════════════════════════════════════════════════════════
//  CREATOR PORTAL — Subject → Unit → Topic → Upload
//  (Accessed via Teacher role or "Creator" sub-admin)
// ═══════════════════════════════════════════════════════════════
function v11LaunchCreatorPortal() {
  if (typeof launchCreatorScreen === 'function') {
    launchCreatorScreen();
  } else {
    showScreen('screen-subadmin');
    v11CreatorSubjectsPage();
  }
}

function v11CreatorSubjectsPage() {
  const content = document.getElementById('sa-content');
  if (!content) return;
  const custom = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');

  content.innerHTML = `
  <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
    <div style="margin-bottom:1.5rem;">
      <h2 style="font-size:1.3rem;font-weight:800;letter-spacing:-.02em;margin-bottom:4px;">🎨 Creator — Upload Content</h2>
      <p style="font-size:.83rem;color:var(--text2);">Select a subject → unit → topic to upload videos, notes, PYQs, and important questions.</p>
    </div>
    ${custom.length === 0 ? `
    <div style="text-align:center;padding:4rem;color:var(--text3);">
      <div style="font-size:4rem;margin-bottom:1rem;">📚</div>
      <div style="font-weight:700;">No subjects available</div>
      <div style="font-size:.83rem;margin-top:4px;">Ask the Sub Admin or Admin to create subjects first.</div>
    </div>` : `
    <div class="cr-subj-grid">
      ${custom.map(s => `
      <div class="cr-subj-card" onclick="v11CreatorOpenSubject(${s.id})">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
          <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--teal-light),var(--primary-light));display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">📖</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:.92rem;margin-bottom:2px;">${s.name}</div>
            <div style="font-size:.73rem;color:var(--text3);">${s.code||'—'} · ${s.branch||'CSE'} · ${s.sem||'—'}</div>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
          <span class="badge badge-teal">${s.uni||'JNTUK'}</span>
          <span class="badge badge-lavender">${s.reg||'R23'}</span>
        </div>
        <div style="font-size:.75rem;color:var(--teal);font-weight:600;">📤 Click to upload content →</div>
      </div>`).join('')}
    </div>`}
  </div>`;
}

function v11CreatorOpenSubject(subjId) {
  const subjects = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  const subj = subjects.find(s => s.id === subjId);
  if (!subj) return;
  window._v11CrSubj = subj;
  v11CreatorUnitsPage(subj);
}

function v11CreatorUnitsPage(subj) {
  const content = document.getElementById('sa-content');
  if (!content) return;
  const units = v11GetUnits(subj.id, false, subj);

  content.innerHTML = `
  <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
    <button class="v11-back" onclick="v11CreatorSubjectsPage()">← Back to Subjects</button>
    <h2 style="font-size:1.15rem;font-weight:800;margin-bottom:.4rem;">📖 ${subj.name}</h2>
    <p style="font-size:.79rem;color:var(--text3);margin-bottom:1.2rem;">Select a unit to upload content for it</p>
    <div class="adm-unit-grid">
      ${units.map(u => {
        const adminVideos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]').filter(v=>v.subject===subj.name&&parseInt(v.unit)===u.id).length;
        const adminNotes  = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]').filter(n=>n.subject===subj.name&&parseInt(n.unit)===u.id).length;
        return `<div class="adm-unit-card" onclick="v11CreatorUnitDetail(${subj.id},${u.id})">
          <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--teal),var(--primary));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1.1rem;margin-bottom:8px;">${u.id}</div>
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px;">${u.name}</div>
          <div style="font-size:.74rem;color:var(--text3);margin-bottom:6px;">${(u.topics||[]).length} topics</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
            ${adminVideos?`<span class="badge badge-teal">🎬 ${adminVideos}</span>`:''}
            ${adminNotes?`<span class="badge badge-primary">📄 ${adminNotes}</span>`:''}
          </div>
          <div style="font-size:.74rem;color:var(--teal);font-weight:600;">Upload content →</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function v11CreatorUnitDetail(subjId, unitId) {
  window._v11CrSubjId = subjId;
  window._v11CrUnitId = unitId;
  const subj = window._v11CrSubj;
  if (!subj) return;
  const content = document.getElementById('sa-content');
  if (!content) return;
  const units = v11GetUnits(subjId, false, subj);
  const unit = units.find(u=>u.id===unitId) || {id:unitId,name:`Unit ${unitId}`,topics:[]};
  const by = APP.subAdminData?.username || 'Creator';

  const adminVideos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]').filter(v=>v.subject===subj.name&&parseInt(v.unit)===unitId);
  const adminNotes  = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]').filter(n=>n.subject===subj.name&&parseInt(n.unit)===unitId);
  const adminPYQs   = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]').filter(p=>p.subject===subj.name&&parseInt(p.unit)===unitId);
  const adminIQs    = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]').filter(q=>q.subject===subj.name&&parseInt(q.unit)===unitId);

  content.innerHTML = `
  <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
    <button class="v11-back" onclick="v11CreatorUnitsPage(window._v11CrSubj)">← Back to Units</button>
    <h2 style="font-size:1.15rem;font-weight:800;margin-bottom:.4rem;">🎨 ${subj.name} — ${unit.name}</h2>
    <p style="font-size:.79rem;color:var(--text3);margin-bottom:1.2rem;">Upload content — instantly visible to all students</p>

    <!-- Roadmap / Topics (read-only for creator) -->
    ${(unit.topics||[]).length ? `
    <div class="card" style="margin-bottom:1.2rem;border-left:3px solid var(--teal);">
      <h4 style="margin-bottom:.6rem;font-size:.9rem;">📋 Learning Roadmap (${(unit.topics||[]).length} topics)</h4>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${(unit.topics||[]).map(t=>`<span class="tag">${t.name}</span>`).join('')}
      </div>
    </div>` : ''}

    <div class="v11-tabs">
      <button class="v11-tab on" onclick="v11SwitchTab(this,'v11-cr-videos')">🎬 Videos (${adminVideos.length})</button>
      <button class="v11-tab" onclick="v11SwitchTab(this,'v11-cr-notes')">📄 Notes (${adminNotes.length})</button>
      <button class="v11-tab" onclick="v11SwitchTab(this,'v11-cr-pyqs')">📝 PYQs (${adminPYQs.length})</button>
      <button class="v11-tab" onclick="v11SwitchTab(this,'v11-cr-iqs')">⭐ Imp. Questions (${adminIQs.length})</button>
    </div>

    <div class="v11-pane on" id="v11-cr-videos">
      <div class="card">
        <h4 style="margin-bottom:.8rem;">🎬 Add YouTube Video</h4>
        <div class="form-row">
          <div class="input-group"><label>Video Title</label><input class="input" id="v11cr-vtitle" placeholder="e.g. Unit 1 Introduction"></div>
          <div class="input-group"><label>YouTube URL</label><input class="input" id="v11cr-vurl" placeholder="https://youtube.com/watch?v=..."></div>
        </div>
        ${(unit.topics||[]).length ? `
        <div class="input-group"><label>Topic (optional)</label>
          <select class="select" id="v11cr-vtopic">
            <option value="">Select topic</option>
            ${(unit.topics||[]).map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}
          </select></div>` : ''}
        <button class="btn btn-teal" onclick="v11CreatorUploadVideo(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}','${by}')">📤 Upload Video</button>
        <hr style="margin:1rem 0;">
        ${adminVideos.map(v=>`
        <div class="v11-item-row">
          <span>🎬</span>
          <div style="flex:1;min-width:0;"><div style="font-weight:600;">${v.title}</div><div style="font-size:.72rem;color:var(--primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.url}</div></div>
          <span class="badge badge-green">Live</span>
        </div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No videos yet.</p>'}
      </div>
    </div>

    <div class="v11-pane" id="v11-cr-notes">
      <div class="card">
        <h4 style="margin-bottom:.8rem;">📄 Upload Notes</h4>
        <div class="form-row">
          <div class="input-group"><label>Title</label><input class="input" id="v11cr-ntitle" placeholder="e.g. Unit 1 Notes"></div>
          <div class="input-group"><label>Type</label>
            <select class="select" id="v11cr-ntype">
              <option value="pdf">PDF</option><option value="doc">DOC</option><option value="link">Link</option>
            </select></div>
        </div>
        <div class="input-group"><label>Drive / URL Link</label><input class="input" id="v11cr-nlink" placeholder="https://drive.google.com/..."></div>
        <button class="btn btn-teal" onclick="v11CreatorUploadNote(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}','${by}')">📤 Upload</button>
        <hr style="margin:1rem 0;">
        ${adminNotes.map(n=>`<div class="v11-item-row"><span>📄</span><div style="flex:1;"><div style="font-weight:600;">${n.title}</div></div><span class="badge badge-green">Live</span></div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No notes yet.</p>'}
      </div>
    </div>

    <div class="v11-pane" id="v11-cr-pyqs">
      <div class="card">
        <h4 style="margin-bottom:.8rem;">📝 Add PYQ</h4>
        <div class="form-row">
          <div class="input-group"><label>Year</label><input class="input" id="v11cr-pyqyr" placeholder="e.g. 2023" type="number"></div>
          <div class="input-group"><label>Times Asked</label><input class="input" id="v11cr-pyqcnt" placeholder="1" type="number" value="1"></div>
        </div>
        <div class="input-group"><label>Question</label><textarea class="input" id="v11cr-pyqtxt" rows="3" style="resize:vertical;"></textarea></div>
        <div class="input-group"><label>Answer (optional)</label><textarea class="input" id="v11cr-pyqans" rows="2" style="resize:vertical;"></textarea></div>
        <button class="btn btn-teal" onclick="v11CreatorUploadPYQ(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}','${by}')">📝 Add PYQ</button>
        <hr style="margin:1rem 0;">
        ${adminPYQs.map(p=>`<div class="v11-item-row"><span>📅</span><div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">${p.question.substring(0,80)}...</div><span class="badge badge-green">Live</span></div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No PYQs yet.</p>'}
      </div>
    </div>

    <div class="v11-pane" id="v11-cr-iqs">
      <div class="card">
        <h4 style="margin-bottom:.8rem;">⭐ Add Important Question</h4>
        <div class="input-group"><label>Question</label><textarea class="input" id="v11cr-iqtxt" rows="3" style="resize:vertical;"></textarea></div>
        <div class="form-row">
          <div class="input-group"><label>Priority</label>
            <select class="select" id="v11cr-iqprio">
              <option value="high">🔴 High</option>
              <option value="med" selected>🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select></div>
          <div class="input-group"><label>Tags</label><input class="input" id="v11cr-iqtags" placeholder="e.g. Unit 1, Memory"></div>
        </div>
        <button class="btn btn-teal" onclick="v11CreatorUploadIQ(${subjId},${unitId},'${(subj.name||'').replace(/'/g,"\\'")}','${by}')">⭐ Add</button>
        <hr style="margin:1rem 0;">
        ${adminIQs.map(q=>`<div class="v11-item-row"><span>${q.priority==='high'?'🔴':'🟡'}</span><div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">${q.question.substring(0,80)}...</div><span class="badge badge-green">Live</span></div>`).join('') || '<p style="color:var(--text3);font-size:.83rem;">No questions yet.</p>'}
      </div>
    </div>
  </div>`;
}

function v11CreatorUploadVideo(subjId, unitId, subjName, by) {
  const title = document.getElementById('v11cr-vtitle')?.value.trim();
  const url   = document.getElementById('v11cr-vurl')?.value.trim();
  const topic = document.getElementById('v11cr-vtopic')?.value || '';
  if (!title||!url) { showToast('Enter title and URL', 'red'); return; }
  const videos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]');
  videos.push({ id:Date.now(), title, url, subject:subjName, unit:unitId, topic, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_videos', JSON.stringify(videos));
  document.getElementById('v11cr-vtitle').value='';
  document.getElementById('v11cr-vurl').value='';
  showToast('✅ Video uploaded! Instantly live for students.', 'green');
  v11CreatorUnitDetail(subjId, unitId);
}

function v11CreatorUploadNote(subjId, unitId, subjName, by) {
  const title = document.getElementById('v11cr-ntitle')?.value.trim();
  const type  = document.getElementById('v11cr-ntype')?.value;
  const link  = document.getElementById('v11cr-nlink')?.value.trim();
  if (!title) { showToast('Enter title', 'red'); return; }
  const notes = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]');
  notes.push({ id:Date.now(), title, type, link, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_notes', JSON.stringify(notes));
  document.getElementById('v11cr-ntitle').value='';
  document.getElementById('v11cr-nlink').value='';
  showToast('✅ Notes uploaded! Instantly live.', 'green');
  v11CreatorUnitDetail(subjId, unitId);
}

function v11CreatorUploadPYQ(subjId, unitId, subjName, by) {
  const year     = document.getElementById('v11cr-pyqyr')?.value.trim();
  const count    = document.getElementById('v11cr-pyqcnt')?.value||'1';
  const question = document.getElementById('v11cr-pyqtxt')?.value.trim();
  const answer   = document.getElementById('v11cr-pyqans')?.value.trim();
  if (!question||!year) { showToast('Enter question and year', 'red'); return; }
  const pyqs = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]');
  pyqs.push({ id:Date.now(), question, answer, year, count:parseInt(count)||1, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_pyqs', JSON.stringify(pyqs));
  document.getElementById('v11cr-pyqtxt').value='';
  document.getElementById('v11cr-pyqans').value='';
  document.getElementById('v11cr-pyqyr').value='';
  showToast('✅ PYQ added! Instantly live.', 'green');
  v11CreatorUnitDetail(subjId, unitId);
}

function v11CreatorUploadIQ(subjId, unitId, subjName, by) {
  const question = document.getElementById('v11cr-iqtxt')?.value.trim();
  const priority = document.getElementById('v11cr-iqprio')?.value;
  const tags     = document.getElementById('v11cr-iqtags')?.value.trim();
  if (!question) { showToast('Enter question', 'red'); return; }
  const iqs = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]');
  iqs.push({ id:Date.now(), question, priority, tags, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_iqs', JSON.stringify(iqs));
  document.getElementById('v11cr-iqtxt').value='';
  document.getElementById('v11cr-iqtags').value='';
  showToast('✅ Important question added! Instantly live.', 'green');
  v11CreatorUnitDetail(subjId, unitId);
}

// ═══════════════════════════════════════════════════════════════
//  PATCH Sub Admin "curriculum" section → v11 Creator portal
// ═══════════════════════════════════════════════════════════════
// SA curriculum section now maps to 'subjects' (Create Subjects structure)
(function patchSACurriculumSection(){
  setTimeout(() => {
    const _orig = switchSASection;
    switchSASection = function(section) {
      if (section === 'curriculum') {
        // Curriculum nav item redirects to subjects (Create Subjects)
        _orig.call(this, 'subjects');
        return;
      }
      _orig(section);
    };
  }, 300);
})();

// ═══════════════════════════════════════════════════════════════
//  FIX: Student Unit → Content flow
//  Ensure clicking unit cards properly opens the content page
// ═══════════════════════════════════════════════════════════════
(function patchStudentOpenUnit(){
  // Patch openUnit to also look up custom subjects by name
  const _origOpenUnit = typeof openUnit === 'function' ? openUnit : null;
  window.openUnit = function(unitNum, subjectOverride) {
    const subj = subjectOverride || APP.currentSubject;
    if (!subj) return;
    APP.currentUnit = unitNum;

    // Get topics from custom unit data if available
    if (subj.id && !subj.isBuiltin) {
      const stored = JSON.parse(localStorage.getItem('edusync_units_' + subj.id) || '[]');
      if (stored.length) {
        const unitData = stored.find(u => u.id === unitNum);
        if (unitData && unitData.topics && unitData.topics.length) {
          APP._currentUnitTopics = unitData.topics;
        }
      }
    }

    if (_origOpenUnit) return _origOpenUnit(unitNum, subjectOverride);

    // Fallback: manually open unit content page
    document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
    const ucp = document.getElementById('page-unit-content');
    if (ucp) ucp.style.display = 'block';

    // Set breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerHTML = `${subj.name} / <span>Unit ${unitNum}</span>`;
    const title = document.getElementById('topbar-title');
    if (title) title.textContent = `Unit ${unitNum}`;

    // Render content
    renderVideoList(subj.id, unitNum);
    renderNotes(subj.id, unitNum);
    renderPYQ(null, subj.id, unitNum);
    renderIQ(subj.id, unitNum);
    renderPendingUrls && renderPendingUrls();

    // Switch to Videos tab by default
    document.querySelectorAll('.content-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
    const vTab = document.querySelector('.content-tab[onclick*="videos"]') || document.querySelector('.content-tab');
    const vPane = document.getElementById('tab-videos') || document.querySelector('.tab-pane');
    if (vTab) vTab.classList.add('active');
    if (vPane) vPane.classList.add('active');
  };
})();

// ═══════════════════════════════════════════════════════════════
//  Student roadmap must stay database-backed; no local video fallback.
// ═══════════════════════════════════════════════════════════════
const _origRenderVideoList = typeof renderVideoList === 'function' ? renderVideoList : null;
window.renderVideoList = async function(subjectId, unitNum) {
  if (!_origRenderVideoList) return;
  return _origRenderVideoList(subjectId, unitNum);
};


// ═══════════════════════════════════════════════════════════════
//  CREATOR PORTAL — Full sidebar + Choosing + Add Content
// ═══════════════════════════════════════════════════════════════

function toggleCRSidebar() {
  const sb = document.getElementById('cr-sidebar');
  const bd = document.getElementById('cr-sidebar-backdrop');
  if (!sb) return;
  const isOpen = sb.classList.toggle('open');
  if (bd) bd.classList.toggle('open', isOpen);
}
function closeCRSidebar() {
  const sb = document.getElementById('cr-sidebar');
  const bd = document.getElementById('cr-sidebar-backdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.classList.remove('open');
}

function switchCRSection(section) {
  closeCRSidebar();
  document.querySelectorAll('[id^="cr-nav-"]').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('cr-nav-' + section);
  if (navEl) navEl.classList.add('active');
  const titleMap = { dashboard: 'Creator Dashboard', choosing: 'Choosing — Browse Curriculum', addcontent: 'Add Content' };
  const titleEl = document.getElementById('cr-topbar-title');
  if (titleEl) titleEl.textContent = titleMap[section] || 'Creator';

  if (section === 'dashboard') renderCRDashboard();
  else if (section === 'choosing') renderCRChoosing();
  else if (section === 'addcontent') renderCRAddContent();
}

function launchCreatorScreen() {
  const sa = APP.subAdminData || {};
  const crNameEl = document.getElementById('cr-sidebar-name');
  const crInfoEl = document.getElementById('cr-sidebar-info');
  if (crNameEl) crNameEl.textContent = sa.username || 'Creator';
  if (crInfoEl) crInfoEl.textContent = (sa.branch || 'Content') + ' · Creator';
  showScreen('screen-creator');
  const preserved = String(window.__aimeasyPreserveRoleRoute || '');
  const [, section] = preserved.split('/').filter(Boolean);
  switchCRSection(section || 'dashboard');
}

function creatorLogout() {
  localStorage.removeItem('edusync_session_user');
  APP.adminType = null;
  APP.subAdminData = null;
  window._crSelectedSubj = null;
  window._crSelectedUnit = null;
  showScreen('screen-landing');
}

function renderCRDashboard() {
  const content = document.getElementById('cr-content');
  if (!content) return;
  const custom = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  const adminVideos = JSON.parse(localStorage.getItem('edusync_admin_videos') || '[]');
  const adminNotes  = JSON.parse(localStorage.getItem('edusync_admin_notes')  || '[]');
  const adminPYQs   = JSON.parse(localStorage.getItem('edusync_admin_pyqs')   || '[]');
  const adminIQs    = JSON.parse(localStorage.getItem('edusync_admin_iqs')    || '[]');
  const sa = APP.subAdminData || {};
  const myVideos = adminVideos.filter(v => sa.username && v.uploadedBy === sa.username);
  const myNotes  = adminNotes.filter(n  => sa.username && n.uploadedBy  === sa.username);
  const myPYQs   = adminPYQs.filter(p  => sa.username && p.uploadedBy  === sa.username);
  const myIQs    = adminIQs.filter(q   => sa.username && q.uploadedBy  === sa.username);

  content.innerHTML = `
  <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
    <div style="margin-bottom:1.6rem;">
      <h2 style="font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;">👋 Welcome, ${sa.username || 'Creator'}</h2>
      <p style="font-size:0.84rem;color:var(--text2);">Upload videos, notes, PYQs and important questions for the curriculum structure created by Sub Admin.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-bottom:2rem;">
      <div class="card" style="text-align:center;padding:1.4rem 1rem;background:linear-gradient(135deg,var(--teal-light),var(--primary-light));">
        <div style="font-size:2rem;margin-bottom:6px;">📚</div>
        <div style="font-size:1.6rem;font-weight:800;color:var(--primary);">${custom.length}</div>
        <div style="font-size:0.78rem;color:var(--text2);font-weight:600;">Subjects Available</div>
      </div>
      <div class="card" style="text-align:center;padding:1.4rem 1rem;background:linear-gradient(135deg,var(--teal-light),#e6faf7);">
        <div style="font-size:2rem;margin-bottom:6px;">🎬</div>
        <div style="font-size:1.6rem;font-weight:800;color:var(--teal);">${myVideos.length}</div>
        <div style="font-size:0.78rem;color:var(--text2);font-weight:600;">Videos Uploaded</div>
      </div>
      <div class="card" style="text-align:center;padding:1.4rem 1rem;background:linear-gradient(135deg,var(--lavender-light),var(--primary-light));">
        <div style="font-size:2rem;margin-bottom:6px;">📄</div>
        <div style="font-size:1.6rem;font-weight:800;color:var(--lavender);">${myNotes.length}</div>
        <div style="font-size:0.78rem;color:var(--text2);font-weight:600;">Notes Uploaded</div>
      </div>
      <div class="card" style="text-align:center;padding:1.4rem 1rem;background:linear-gradient(135deg,var(--amber-light),#fef9ec);">
        <div style="font-size:2rem;margin-bottom:6px;">📝</div>
        <div style="font-size:1.6rem;font-weight:800;color:var(--amber);">${myPYQs.length}</div>
        <div style="font-size:0.78rem;color:var(--text2);font-weight:600;">PYQs Added</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem;">
      <h3 style="margin-bottom:1rem;font-size:1rem;">🚀 Quick Actions</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="switchCRSection('choosing')">🎯 Browse Curriculum</button>
        <button class="btn btn-teal" onclick="switchCRSection('addcontent')">📤 Add Content</button>
      </div>
    </div>
    ${custom.length === 0 ? `
    <div class="card" style="text-align:center;padding:2rem;background:var(--amber-light);border-color:var(--amber);">
      <div style="font-size:2rem;margin-bottom:6px;">⚠️</div>
      <div style="font-weight:700;color:#b45309;">No Curriculum Found</div>
      <div style="font-size:0.83rem;color:var(--text2);margin-top:4px;">Sub Admin has not created any subjects yet. Please wait for them to set up the curriculum structure.</div>
    </div>` : ''}
  </div>`;
}

function renderCRChoosing(filterVals) {
  const content = document.getElementById('cr-content');
  if (!content) return;
  const custom = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  const f = filterVals || window._crFilter || {};
  window._crFilter = f;

  let filtered = [...custom];
  if (f.uni)    filtered = filtered.filter(s => s.uni === f.uni);
  if (f.reg)    filtered = filtered.filter(s => s.reg === f.reg);
  if (f.sem)    filtered = filtered.filter(s => s.sem === f.sem);
  if (f.branch) filtered = filtered.filter(s => s.branch === f.branch);

  const allSems = ['1-1','1-2','2-1','2-2','3-1','3-2','4-1','4-2'];

  content.innerHTML = `
  <div style="padding:2rem;max-width:1200px;margin:0 auto;width:100%;">
    <div style="margin-bottom:1.2rem;">
      <h2 style="font-size:1.3rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;">🎯 Choosing — Curriculum Browser</h2>
      <p style="font-size:0.82rem;color:var(--text2);">Browse all subjects created by Sub Admin. Select a subject to add content.</p>
    </div>
    <!-- Filters -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.2rem;padding:1rem;background:var(--surface2);border-radius:var(--radius-md);border:1px solid var(--border);">
      <select class="select" style="width:140px;" onchange="window._crFilter=Object.assign(window._crFilter||{},{uni:this.value});renderCRChoosing()">
        <option value="">All Universities</option>
        ${['JNTUK','JNTUH','Andhra University'].map(u=>`<option value="${u}"${f.uni===u?' selected':''}>${u}</option>`).join('')}
      </select>
      <select class="select" style="width:120px;" onchange="window._crFilter=Object.assign(window._crFilter||{},{reg:this.value});renderCRChoosing()">
        <option value="">All Regulations</option>
        ${['R23','R20','R19','R16'].map(r=>`<option value="${r}"${f.reg===r?' selected':''}>${r}</option>`).join('')}
      </select>
      <select class="select" style="width:110px;" onchange="window._crFilter=Object.assign(window._crFilter||{},{sem:this.value});renderCRChoosing()">
        <option value="">All Semesters</option>
        ${allSems.map(s=>`<option value="${s}"${f.sem===s?' selected':''}>${s}</option>`).join('')}
      </select>
      <select class="select" style="width:115px;" onchange="window._crFilter=Object.assign(window._crFilter||{},{branch:this.value});renderCRChoosing()">
        <option value="">All Branches</option>
        ${['CSE','ECE','EEE','IT','AIML','AIDS','MECH','CIVIL'].map(b=>`<option value="${b}"${f.branch===b?' selected':''}>${b}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="window._crFilter={};renderCRChoosing()">Clear</button>
    </div>
    <div style="font-size:0.82rem;color:var(--text3);margin-bottom:1rem;">${filtered.length} subject${filtered.length!==1?'s':''} found</div>
    ${filtered.length === 0 ? `
    <div style="text-align:center;padding:4rem;color:var(--text3);">
      <div style="font-size:3rem;margin-bottom:1rem;">📚</div>
      <div style="font-weight:700;">No subjects found</div>
      <div style="font-size:0.82rem;margin-top:4px;">Try adjusting filters or wait for Sub Admin to create curriculum</div>
    </div>` : `
    <div class="cr-subj-grid">
      ${filtered.map(s => {
        const units = JSON.parse(localStorage.getItem('edusync_units_' + s.id) || '[]');
        const vC = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]').filter(v=>v.subject===s.name).length;
        const nC = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]').filter(n=>n.subject===s.name).length;
        return `
        <div class="cr-subj-card" onclick="crChooseSubject(${s.id})">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
            <div style="width:42px;height:42px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--teal),var(--primary));display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;color:#fff;">📖</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:0.92rem;margin-bottom:2px;">${s.name}</div>
              <div style="font-size:0.73rem;color:var(--text3);">${s.code||'—'} · ${s.branch||'CSE'} · ${s.sem||'—'}</div>
            </div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
            <span class="badge badge-teal">${s.uni||'JNTUK'}</span>
            <span class="badge badge-lavender">${s.reg||'R23'}</span>
            <span class="badge badge-primary">${s.sem||'—'}</span>
            <span class="badge badge-amber">${s.branch||'CSE'}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text3);margin-bottom:8px;">${units.length} units · ${vC} videos · ${nC} notes</div>
          <div style="font-size:0.75rem;color:var(--teal);font-weight:600;">📤 Select to add content →</div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}

function crChooseSubject(subjId) {
  const subjects = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
  const subj = subjects.find(s => s.id === subjId);
  if (!subj) return;
  window._crSelectedSubj = subj;
  window._crSelectedUnit = null;
  switchCRSection('addcontent');
}

function renderCRAddContent() {
  const content = document.getElementById('cr-content');
  if (!content) return;
  const subj = window._crSelectedSubj;

  if (!subj) {
    // Show subject picker
    const custom = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');
    content.innerHTML = `
    <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
      <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:0.5rem;">📤 Add Content</h2>
      <p style="font-size:0.83rem;color:var(--text2);margin-bottom:1.4rem;">Select a subject from the Choosing section, or pick one below:</p>
      ${custom.length === 0 ? `<div style="text-align:center;padding:3rem;color:var(--text3);">No subjects available yet. Ask Sub Admin to create curriculum first.</div>` : `
      <div class="cr-subj-grid">
        ${custom.map(s=>`
        <div class="cr-subj-card" onclick="window._crSelectedSubj=${JSON.stringify(s).replace(/"/g,'&quot;')};window._crSelectedSubj=JSON.parse(this.getAttribute('data-s'));renderCRAddContent()" data-s='${JSON.stringify(s).replace(/'/g,"&#39;")}'>
          <div style="font-weight:700;font-size:0.92rem;margin-bottom:6px;">📖 ${s.name}</div>
          <div style="font-size:0.75rem;color:var(--text3);">${s.code||'—'} · ${s.branch||'CSE'} · ${s.sem}</div>
          <div style="margin-top:8px;font-size:0.75rem;color:var(--teal);font-weight:600;">Select →</div>
        </div>`).join('')}
      </div>`}
    </div>`;
    return;
  }

  const units = v11GetUnits ? v11GetUnits(subj.id, false, subj) : JSON.parse(localStorage.getItem('edusync_units_' + subj.id) || '[]');
  const selUnit = window._crSelectedUnit;
  const by = APP.subAdminData?.username || 'Creator';

  let unitContent = '';
  if (selUnit) {
    const unit = units.find(u => u.id === selUnit) || {id:selUnit, name:`Unit ${selUnit}`, topics:[]};
    const adminVideos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]').filter(v=>v.subject===subj.name&&parseInt(v.unit)===selUnit);
    const adminNotes  = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]').filter(n=>n.subject===subj.name&&parseInt(n.unit)===selUnit);
    const adminPYQs   = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]').filter(p=>p.subject===subj.name&&parseInt(p.unit)===selUnit);
    const adminIQs    = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]').filter(q=>q.subject===subj.name&&parseInt(q.unit)===selUnit);

    unitContent = `
    <div class="card" style="margin-top:1rem;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;">
        <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--teal),var(--primary));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;">${selUnit}</div>
        <div>
          <div style="font-weight:700;font-size:0.95rem;">${unit.name}</div>
          <div style="font-size:0.75rem;color:var(--text3);">${subj.name} · ${(unit.topics||[]).length} topics</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="window._crSelectedUnit=null;renderCRAddContent()">✕ Deselect</button>
      </div>

      <!-- Topic roadmap display -->
      ${(unit.topics||[]).length ? `
      <div style="margin-bottom:1.2rem;">
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text3);margin-bottom:8px;">📋 Topics in this Unit</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${(unit.topics||[]).map((t,i)=>`<span class="tag" style="background:var(--primary-light);color:var(--primary);border-color:var(--primary-mid);">${i+1}. ${t.name}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Content Tabs -->
      <div class="v11-tabs" style="margin-bottom:1rem;">
        <button class="v11-tab on" onclick="v11SwitchTab(this,'cr-ac-videos')">🎬 Videos (${adminVideos.length})</button>
        <button class="v11-tab" onclick="v11SwitchTab(this,'cr-ac-notes')">📄 Notes (${adminNotes.length})</button>
        <button class="v11-tab" onclick="v11SwitchTab(this,'cr-ac-pyq')">📝 PYQs (${adminPYQs.length})</button>
        <button class="v11-tab" onclick="v11SwitchTab(this,'cr-ac-iq')">⭐ Imp. Questions (${adminIQs.length})</button>
      </div>

      <!-- Videos pane -->
      <div class="v11-pane on" id="cr-ac-videos">
        <div class="form-row">
          <div class="input-group"><label>Video Title</label><input class="input" id="crac-vtitle" placeholder="e.g. Unit ${selUnit} Introduction"></div>
          <div class="input-group"><label>YouTube URL</label><input class="input" id="crac-vurl" placeholder="https://youtube.com/watch?v=..."></div>
        </div>
        <div class="input-group"><label>Topic (optional)</label><input class="input" id="crac-vtopic" placeholder="e.g. Introduction to OS"></div>
        <button class="btn btn-teal" onclick="crUploadVideo(${subj.id},${selUnit},'${(subj.name||'').replace(/'/g,"\'")}','${by}')">📤 Upload Video</button>
        <hr style="margin:1rem 0;">
        ${adminVideos.length ? adminVideos.map(v=>`
        <div class="v11-item-row">
          <span>🎬</span>
          <div style="flex:1;min-width:0;"><div style="font-weight:600;">${v.title}</div><div style="font-size:0.72rem;color:var(--primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.url}</div></div>
          <span class="badge badge-green">Live</span>
          <button class="btn btn-danger btn-sm" onclick="crDeleteContent('videos',${v.id},${subj.id},${selUnit})">✕</button>
        </div>`).join('') : '<p style="color:var(--text3);font-size:0.83rem;">No videos yet.</p>'}
      </div>

      <!-- Notes pane -->
      <div class="v11-pane" id="cr-ac-notes">
        <div class="form-row">
          <div class="input-group"><label>Notes Title</label><input class="input" id="crac-ntitle" placeholder="e.g. Unit ${selUnit} Notes"></div>
          <div class="input-group"><label>Type</label>
            <select class="select" id="crac-ntype">
              <option value="pdf">PDF</option><option value="doc">Word Doc</option><option value="link">Link</option>
            </select></div>
        </div>
        <div class="input-group"><label>Link / URL</label><input class="input" id="crac-nlink" placeholder="https://drive.google.com/..." type="url"></div>
        <button class="btn btn-teal" onclick="crUploadNote(${subj.id},${selUnit},'${(subj.name||'').replace(/'/g,"\'")}','${by}')">📤 Upload Notes</button>
        <hr style="margin:1rem 0;">
        ${adminNotes.length ? adminNotes.map(n=>`
        <div class="v11-item-row">
          <span>${n.type==='pdf'?'📄':n.type==='doc'?'📝':'🔗'}</span>
          <div style="flex:1;min-width:0;"><div style="font-weight:600;">${n.title}</div><div style="font-size:0.72rem;color:var(--text3);">${n.type?.toUpperCase()}</div></div>
          <span class="badge badge-green">Live</span>
          <button class="btn btn-danger btn-sm" onclick="crDeleteContent('notes',${n.id},${subj.id},${selUnit})">✕</button>
        </div>`).join('') : '<p style="color:var(--text3);font-size:0.83rem;">No notes yet.</p>'}
      </div>

      <!-- PYQs pane -->
      <div class="v11-pane" id="cr-ac-pyq">
        <div class="form-row">
          <div class="input-group"><label>Year</label><input class="input" id="crac-pyqyr" placeholder="e.g. 2023"></div>
          <div class="input-group"><label>Times Asked</label><input class="input" id="crac-pyqcnt" type="number" value="1" min="1"></div>
        </div>
        <div class="input-group"><label>Question</label><textarea class="input" id="crac-pyqtxt" rows="3" placeholder="Type the PYQ here..." style="resize:vertical;"></textarea></div>
        <div class="input-group"><label>Answer / Hints (optional)</label><textarea class="input" id="crac-pyqans" rows="2" placeholder="Optional answer or hints..." style="resize:vertical;"></textarea></div>
        <button class="btn btn-teal" onclick="crUploadPYQ(${subj.id},${selUnit},'${(subj.name||'').replace(/'/g,"\'")}','${by}')">📝 Add PYQ</button>
        <hr style="margin:1rem 0;">
        ${adminPYQs.length ? adminPYQs.map(p=>`
        <div class="v11-item-row">
          <span>📝</span>
          <div style="flex:1;min-width:0;"><div style="font-weight:600;">${p.question.substring(0,80)}${p.question.length>80?'...':''}</div><div style="font-size:0.72rem;color:var(--text3);">${p.year} · ×${p.count}</div></div>
          <span class="badge badge-green">Live</span>
          <button class="btn btn-danger btn-sm" onclick="crDeleteContent('pyqs',${p.id},${subj.id},${selUnit})">✕</button>
        </div>`).join('') : '<p style="color:var(--text3);font-size:0.83rem;">No PYQs yet.</p>'}
      </div>

      <!-- IQ pane -->
      <div class="v11-pane" id="cr-ac-iq">
        <div class="form-row">
          <div class="input-group"><label>Priority</label>
            <select class="select" id="crac-iqprio">
              <option value="high">🔴 High</option><option value="med">🟡 Medium</option><option value="low">🟢 Low</option>
            </select></div>
          <div class="input-group"><label>Tags (comma sep.)</label><input class="input" id="crac-iqtags" placeholder="e.g. Unit ${selUnit}, Memory"></div>
        </div>
        <div class="input-group"><label>Important Question</label><textarea class="input" id="crac-iqtxt" rows="3" placeholder="Type the important question..." style="resize:vertical;"></textarea></div>
        <button class="btn btn-teal" onclick="crUploadIQ(${subj.id},${selUnit},'${(subj.name||'').replace(/'/g,"\'")}','${by}')">⭐ Add Question</button>
        <hr style="margin:1rem 0;">
        ${adminIQs.length ? adminIQs.map(q=>`
        <div class="v11-item-row">
          <span>${q.priority==='high'?'🔴':q.priority==='med'?'🟡':'🟢'}</span>
          <div style="flex:1;min-width:0;"><div style="font-weight:600;">${q.question.substring(0,80)}${q.question.length>80?'...':''}</div></div>
          <span class="badge badge-green">Live</span>
          <button class="btn btn-danger btn-sm" onclick="crDeleteContent('iqs',${q.id},${subj.id},${selUnit})">✕</button>
        </div>`).join('') : '<p style="color:var(--text3);font-size:0.83rem;">No important questions yet.</p>'}
      </div>
    </div>`;
  }

  content.innerHTML = `
  <div style="padding:2rem;max-width:1100px;margin:0 auto;width:100%;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:1.2rem;">
      <div>
        <h2 style="font-size:1.3rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:2px;">📤 Add Content</h2>
        <p style="font-size:0.82rem;color:var(--text2);">Upload videos, notes, PYQs and important questions for the selected curriculum.</p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="window._crSelectedSubj=null;window._crSelectedUnit=null;renderCRAddContent()">← Change Subject</button>
    </div>

    <!-- Selected subject header -->
    <div class="card" style="background:linear-gradient(135deg,var(--teal-light),var(--primary-light));border-color:var(--primary-mid);margin-bottom:1rem;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:2rem;">📖</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:1rem;margin-bottom:2px;">${subj.name}</div>
          <div style="font-size:0.78rem;color:var(--text2);">${subj.code||'—'} · ${subj.branch||'CSE'} · ${subj.sem||'—'} · ${subj.uni||'JNTUK'} · ${subj.reg||'R23'}</div>
        </div>
        <span class="badge badge-green">✅ Selected</span>
      </div>
    </div>

    <!-- Unit selection -->
    ${!selUnit ? `
    <div class="card">
      <h3 style="font-size:1rem;margin-bottom:1rem;">Select a Unit to upload content:</h3>
      <div class="adm-unit-grid">
        ${units.length === 0 ? '<p style="color:var(--text3);">No units defined for this subject yet. Ask Sub Admin to add units.</p>' :
          units.map(u => {
            const vC = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]').filter(v=>v.subject===subj.name&&parseInt(v.unit)===u.id).length;
            const nC = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]').filter(n=>n.subject===subj.name&&parseInt(n.unit)===u.id).length;
            return `<div class="adm-unit-card" onclick="window._crSelectedUnit=${u.id};renderCRAddContent()" style="cursor:pointer;">
              <div style="width:38px;height:38px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--teal),var(--primary));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;margin-bottom:8px;">${u.id}</div>
              <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${u.name}</div>
              <div style="font-size:0.74rem;color:var(--text3);margin-bottom:6px;">${(u.topics||[]).length} topics</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;">
                ${vC?`<span class="badge badge-teal">🎬 ${vC}</span>`:''}
                ${nC?`<span class="badge badge-primary">📄 ${nC}</span>`:''}
              </div>
              <div style="font-size:0.74rem;color:var(--teal);font-weight:600;margin-top:8px;">Upload content →</div>
            </div>`;
          }).join('')}
      </div>
    </div>` : unitContent}
  </div>`;
}

function crUploadVideo(subjId, unitId, subjName, by) {
  const title = document.getElementById('crac-vtitle')?.value.trim();
  const url   = document.getElementById('crac-vurl')?.value.trim();
  const topic = document.getElementById('crac-vtopic')?.value.trim();
  if (!title || !url) { showToast('Enter title and URL', 'red'); return; }
  const videos = JSON.parse(localStorage.getItem('edusync_admin_videos')||'[]');
  videos.push({ id:Date.now(), title, url, subject:subjName, unit:unitId, topic, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_videos', JSON.stringify(videos));
  showToast('✅ Video uploaded! Instantly live for students.', 'green');
  window._crSelectedUnit = unitId;
  renderCRAddContent();
}

function crUploadNote(subjId, unitId, subjName, by) {
  const title = document.getElementById('crac-ntitle')?.value.trim();
  const type  = document.getElementById('crac-ntype')?.value;
  const link  = document.getElementById('crac-nlink')?.value.trim();
  if (!title) { showToast('Enter title', 'red'); return; }
  const notes = JSON.parse(localStorage.getItem('edusync_admin_notes')||'[]');
  notes.push({ id:Date.now(), title, type, link, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_notes', JSON.stringify(notes));
  showToast('✅ Notes uploaded! Instantly live.', 'green');
  window._crSelectedUnit = unitId;
  renderCRAddContent();
}

function crUploadPYQ(subjId, unitId, subjName, by) {
  const year     = document.getElementById('crac-pyqyr')?.value.trim();
  const count    = document.getElementById('crac-pyqcnt')?.value||'1';
  const question = document.getElementById('crac-pyqtxt')?.value.trim();
  const answer   = document.getElementById('crac-pyqans')?.value.trim();
  if (!question || !year) { showToast('Enter question and year', 'red'); return; }
  const pyqs = JSON.parse(localStorage.getItem('edusync_admin_pyqs')||'[]');
  pyqs.push({ id:Date.now(), question, answer, year, count:parseInt(count)||1, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_pyqs', JSON.stringify(pyqs));
  showToast('✅ PYQ added! Instantly live.', 'green');
  window._crSelectedUnit = unitId;
  renderCRAddContent();
}

function crUploadIQ(subjId, unitId, subjName, by) {
  const question = document.getElementById('crac-iqtxt')?.value.trim();
  const priority = document.getElementById('crac-iqprio')?.value;
  const tags     = document.getElementById('crac-iqtags')?.value.trim();
  if (!question) { showToast('Enter question', 'red'); return; }
  const iqs = JSON.parse(localStorage.getItem('edusync_admin_iqs')||'[]');
  iqs.push({ id:Date.now(), question, priority, tags, subject:subjName, unit:unitId, uploadedAt:new Date().toLocaleString(), uploadedBy:by });
  localStorage.setItem('edusync_admin_iqs', JSON.stringify(iqs));
  showToast('✅ Important question added! Instantly live.', 'green');
  window._crSelectedUnit = unitId;
  renderCRAddContent();
}

function crDeleteContent(type, id, subjId, unitId) {
  const keyMap = { videos:'edusync_admin_videos', notes:'edusync_admin_notes', pyqs:'edusync_admin_pyqs', iqs:'edusync_admin_iqs' };
  const key = keyMap[type];
  if (!key) return;
  const arr = JSON.parse(localStorage.getItem(key)||'[]');
  localStorage.setItem(key, JSON.stringify(arr.filter(x => x.id !== id)));
  showToast('Deleted', 'red');
  window._crSelectedUnit = unitId;
  renderCRAddContent();
}

// ═══════════════════════════════════════════════════════════════
//  PATCH: Teacher role → launches Creator Portal instead
// ═══════════════════════════════════════════════════════════════
// Teacher/Creator Google login disabled — installCriticalFixes.js (Issue 7)

// ═══════════════════════════════════════════════════════════════
//  PATCH: submitAdminLogin — Creator role via Sub Admin login
// ═══════════════════════════════════════════════════════════════
(function patchLoginForCreator() {
  const _orig = window.submitAdminLogin;
  window.submitAdminLogin = function() {
    const userid   = document.getElementById('admin-userid')?.value.trim();
    const password = document.getElementById('admin-password')?.value.trim();
    if (!userid || !password) {
      const errEl = document.getElementById('admin-login-err');
      if (errEl) { errEl.style.display='block'; errEl.textContent='Please fill in all fields.'; }
      return;
    }
    // Check if this sub admin is flagged as creator
    const subAdmins = JSON.parse(localStorage.getItem('edusync_subadmins') || '[]');
    const sa = subAdmins.find(s => s.username === userid && s.password === password);
    if (sa && sa.role === 'content_creator') {
      closeAdminLogin && closeAdminLogin();
      APP.adminType = 'content_creator';
      APP.subAdminData = sa;
      launchCreatorScreen();
      return;
    }
    if (_orig) _orig.call(this);
  };
})();

console.log('[v11] All patches applied: Sub Admin login fix, Admin subject 3-dot menu, Subject→Unit→Content flow, Creator portal, Full content CRUD, Realtime sync.');
