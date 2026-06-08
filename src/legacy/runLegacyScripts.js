const LEGACY_SCRIPT_ID = 'aimeasy-legacy-runtime';

function installInlineHandlerFallbacks() {
  const ensure = (name, fallback) => {
    if (typeof window[name] !== 'function' && typeof fallback === 'function') {
      window[name] = fallback;
    }
    if (typeof globalThis[name] !== 'function' && typeof window[name] === 'function') {
      globalThis[name] = window[name];
    }
  };

  ensure('selectRoleAndNavigate', function selectRoleAndNavigateFallback(role) {
    console.log(`[ROLE CLICK] ${role === 'content_creator' ? 'Creator' : role === 'student' ? 'Student' : role}`);
    if (window.APP) window.APP.role = role;
    document.querySelectorAll('.role-card').forEach((card) => card.classList.remove('selected'));
    const cardId = role === 'content_creator' ? 'role-creator' : `role-${role}`;
    document.getElementById(cardId)?.classList.add('selected');
    if (typeof window.proceedWithRole === 'function') {
      window.setTimeout(() => window.proceedWithRole(), 220);
    }
  });

  ensure('toggleAdminDropdown', function toggleAdminDropdownFallback(event) {
    event?.stopPropagation?.();
    const dropdown = document.getElementById('admin-dropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('open', !dropdown.classList.contains('open'));
  });

  ensure('switchAdminSection', function switchAdminSectionFallback(section = 'dashboard') {
    window.closeAdminSidebar?.();
    document.querySelectorAll('[id^="admin-nav-"]').forEach((item) => item.classList.remove('active'));
    document.getElementById(`admin-nav-${section}`)?.classList.add('active');
    const title = document.getElementById('admin-topbar-title');
    if (title) {
      title.textContent = ({
        dashboard: 'Admin Dashboard',
        create: 'Create & Manage',
        subjects: 'All Subjects',
        approvals: 'URL Approvals',
      })[section] || 'Admin';
    }
    window.renderAdminSection?.(section);
  });

  ['showScreen', 'showLoading', 'hideLoading'].forEach((name) => ensure(name));

  console.log('[CHECK]', {
    selectRoleAndNavigate: typeof window.selectRoleAndNavigate,
    switchAdminSection: typeof window.switchAdminSection,
    toggleAdminDropdown: typeof window.toggleAdminDropdown,
  });
}

export function runLegacyScripts(scripts) {
  if (document.getElementById(LEGACY_SCRIPT_ID)) {
    installInlineHandlerFallbacks();
    return () => {};
  }

  const holder = document.createElement('div');
  holder.id = LEGACY_SCRIPT_ID;
  holder.hidden = true;
  document.body.appendChild(holder);

  scripts.forEach((source, index) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.dataset.legacyIndex = String(index);
    script.textContent = source;
    holder.appendChild(script);
  });

  window.setTimeout(() => {
    installInlineHandlerFallbacks();
    window.dispatchEvent(new Event('load'));
  }, 0);

  return () => {
    holder.remove();
  };
}
