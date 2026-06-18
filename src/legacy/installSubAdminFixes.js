/**
 * installSubAdminFixes.js
 *
 * Centralized patch layer for all Sub-Admin module issues.
 * Loaded after installCriticalFixes() — overrides broken functions in
 * legacy-app.js / legacy-patches.js / aimeasy-fixes.js without modifying them.
 */

export function installSubAdminFixes() {
  if (window.__subAdminFixesInstalled) return;
  window.__subAdminFixesInstalled = true;

  // ... (other fixes remain untouched)

  // The `installIsolatedSASubjects` function and its call via setTimeout have been removed.
  // This responsibility is now handled by the primary `renderSubjects.js` module,
  // which correctly filters subjects for Sub-Admins from the start,
  // eliminating the race condition and the need for this legacy override.

  console.log('[SubAdminFixes] Patches installed (Subject isolation removed). ✓');
}
