import fs from 'fs';

const t = fs.readFileSync('src/legacy/legacy-app.js', 'utf8');

const startStr = "  renderApprovalLinksProduction = function renderApprovalLinksCardProduction(owner = 'admin') {";
const endStr = "  renderSAUrlRequests = function renderSAUrlRequestsCardProduction() {";

const start = t.indexOf(startStr);
const end = t.indexOf(endStr);

if (start !== -1 && end !== -1) {
  const codeLines = [
    "  renderApprovalLinksProduction = function renderApprovalLinksCardProduction(owner = 'admin') {",
    "    const content = document.getElementById(owner === 'admin' ? 'admin-content' : 'sa-content');",
    "    if (!content) return;",
    "    const requests = read('edusync_url_requests', []);",
    "    const pending = requests.filter(request => (request.status || 'pending') === 'pending').length;",
    "    const approved = requests.filter(request => request.status === 'approved').length;",
    "    const rejected = requests.filter(request => request.status === 'rejected').length;",
    "    content.innerHTML = `",
    "      <div class=\"admin-dashboard-wrap\">",
    "        <div class=\"admin-section-head\" style=\"margin-bottom: 1.5rem;\">",
    "          <div>",
    "            <h2>URL Approvals</h2>",
    "            <p>Review submitted learning links before they become available.</p>",
    "          </div>",
    "        </div>",
    "        ",
    "        <div class=\"approval-stats-row\">",
    "          <div class=\"stat-card\">",
    "            <span class=\"stat-value text-amber\">\\${esc(pending)}</span>",
    "            <span class=\"stat-label\">Pending Requests</span>",
    "          </div>",
    "          <div class=\"stat-card\">",
    "            <span class=\"stat-value text-green\">\\${esc(approved)}</span>",
    "            <span class=\"stat-label\">Approved Requests</span>",
    "          </div>",
    "          <div class=\"stat-card\">",
    "            <span class=\"stat-value text-red\">\\${esc(rejected)}</span>",
    "            <span class=\"stat-label\">Rejected Requests</span>",
    "          </div>",
    "        </div>",
    "        <div class=\"approval-list-view\">",
    "          \\${requests.length ? requests.map((request, index) => {",
    "            const status = request.status || 'pending';",
    "            return \\`<div class=\"approval-list-card approval-\\${esc(status)}\">\\` +",
    "              \\`<div class=\"approval-info-col\">\\` +",
    "                \\`<div class=\"approval-hierarchy\">\\` +",
    "                  \\`<span class=\"approval-subject\">SUBJECT: \\${esc(request.subject || 'Subject')}</span>\\` +",
    "                  \\`<span class=\"approval-divider\">/</span>\\` +",
    "                  \\`<span class=\"approval-unit\">UNIT: \\${esc(request.unitName || ('Unit ' + (request.unit || '-')))}</span>\\` +",
    "                  \\`<span class=\"approval-divider\">/</span>\\` +",
    "                  \\`<span class=\"approval-topic\">TOPIC: \\${esc(request.topicName || request.topic || 'Topic')}</span>\\` +",
    "                \\`</div>\\` +",
    "                \\`<div class=\"approval-submitter\">\\` +",
    "                  \\`<span class=\"submitter-name\">SUBMITTED BY: <b>\\${esc(request.submittedBy || 'Student')}</b></span>\\` +",
    "                  \\`<span class=\"submitter-date\">ON: \\${esc(request.submittedAt || '-')}</span>\\` +",
    "                  \\`<span class=\"badge \\${status === 'approved' ? 'badge-green' : status === 'rejected' ? 'badge-red' : 'badge-amber'}\">\\${esc(status)}</span>\\` +",
    "                \\`</div>\\` +",
    "                \\`<div class=\"approval-url-row\">\\` +",
    "                  \\`<span class=\"url-label\">URL:</span> <a href=\"\\${esc(request.url || '#')}\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"approval-url-text\">\\${esc(request.url || '-')}</a>\\` +",
    "                \\`</div>\\` +",
    "              \\`</div>\\` +",
    "              \\`<div class=\"approval-actions-col\">\\` +",
    "                \\`<a href=\"\\${esc(request.url || '#')}\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"btn btn-ghost btn-sm\">View Link</a>\\` +",
    "                (status === 'pending' ? \\`\\` +",
    "                \\`<button class=\"btn btn-primary btn-sm\" onclick=\"adminApproveUrl(\\${index})\">Approve</button>\\` +",
    "                \\`<button class=\"btn btn-danger btn-sm\" onclick=\"adminRejectUrl(\\${index})\">Reject</button>\\` +",
    "                \\`\\` : '') +",
    "                \\`<button class=\"btn btn-ghost btn-sm\" disabled style=\"opacity:0.5;cursor:not-allowed;\">Edit</button>\\` +",
    "                \\`<button class=\"btn btn-danger btn-sm\" disabled style=\"opacity:0.5;cursor:not-allowed;\">Delete</button>\\` +",
    "              \\`</div>\\` +",
    "            \\`</div>\\`;",
    "          }).join('') : '<div class=\"empty-state-card\">No URL requests yet.</div>'}",
    "        </div>",
    "      </div>`;",
    "  };"
  ].join('\n');

  fs.writeFileSync('src/legacy/legacy-app.js', t.substring(0, start) + codeLines + '\n' + t.substring(end));
  console.log('Replaced legacy-app.js successfully');
} else {
  console.log('Not found in legacy-app.js', start, end);
}