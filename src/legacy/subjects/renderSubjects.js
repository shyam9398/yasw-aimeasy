import { getSubjects } from '../../services/subjectRepository.js';
import { mapDbSubjectToUi, mapLocalStorageSubjectToUi, mergeSubjectSources } from '../../services/subjectAdapter.js';
import { openSubject } from './openSubject.js';

// Make openSubject globally available for the onclick handlers
window.openSubject = openSubject;

async function renderSubjects(arg) {
    const grid = document.getElementById('subjects-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading-spinner"></div>';

    let filters = {};
    // Handle backward compatibility for switchSemester.js
    if (typeof arg === 'string') {
        filters.semester = arg;
    } else if (typeof arg === 'object' && arg !== null) {
        filters = arg;
    }

    // Determine user role and apply specific filters
    const user = window.APP?.userProfile;
    if (user?.role === 'subadmin') {
        filters = { created_by_subadmin_id: user.id };
    } 

    // 1. Load subjects from both sources
    const { data: dbSubjectsRaw, error: dbError } = await getSubjects(filters);
    const localSubjectsRaw = JSON.parse(localStorage.getItem('edusync_custom_subjects') || '[]');

    if (dbError) {
        grid.innerHTML = `<div class="empty-state">Error loading subjects.</div>`;
        return;
    }

    // 2. Map both sources through adapters
    const dbSubjectsUi = dbSubjectsRaw.map(mapDbSubjectToUi);
    const localSubjectsUi = localSubjectsRaw.map(mapLocalStorageSubjectToUi);

    // 3. Merge sources
    let mergedSubjects = mergeSubjectSources(dbSubjectsUi, localSubjectsUi);

    // Apply client-side semester filter if called by legacy switchSemester
    if (typeof arg === 'string' && arg) {
        mergedSubjects = mergedSubjects.filter(s => s.semester === arg);
    }

    // 4. Store merged result in APP.subjects cache
    window.APP = window.APP || {};
    window.APP.subjects = mergedSubjects;

    // 5. Render the merged result
    if (mergedSubjects.length === 0) {
        grid.innerHTML = `<div class="empty-state">No subjects found.</div>`;
        return;
    }

    grid.innerHTML = mergedSubjects.map((subj) => {
        const bg = `var(--${subj.color}-light)`;
        const tx = `var(--${subj.color}-dark)`;

        return `
            <div class="subject-card" onclick="openSubject('${subj.id}')">
                <div class="subject-icon" style="background-color: ${bg}; color: ${tx};">
                    ${subj.icon}
                </div>
                <div class="subject-details">
                    <div class="subject-name">${subj.name}</div>
                    <div class="subject-meta">
                        <span>${subj.code}</span>
                        <span>·</span>
                        <span>${subj.credits} Credits</span>
                    </div>
                </div>
                <div class="subject-units">
                    <span class="badge" style="background:${bg};color:${tx}">${subj.units} Units</span>
                </div>
            </div>
        `;
    }).join('');
}

// Make it globally available for legacy callers
window.renderSubjects = renderSubjects;

// Initial render
renderSubjects();
