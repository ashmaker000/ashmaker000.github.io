const USER = 'ashmaker000';
const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`;
const ACTIVE_TOPICS = ['wip', 'active', 'current', 'in-progress'];
const ACTIVE_DAYS_FALLBACK = 21;
const PINNED_REPOS = ['BeamMP-PropHunt', 'BeamMP-Traffic', 'BeamMP-Tag', 'BeamMP-CnR', 'BeamMP-CarHunt', 'ashmaker000.github.io'];

const els = {
  meta: document.getElementById('profileMeta'),
  pinned: document.getElementById('pinnedList'),
  featured: document.getElementById('featuredList'),
  beamng: document.getElementById('beamngList'),
  web: document.getElementById('webList'),
  tools: document.getElementById('toolsList'),
  all: document.getElementById('allList'),
  search: document.getElementById('repoSearch'),
  modal: document.getElementById('repoModal'),
  modalBody: document.getElementById('repoModalBody'),
  modalClose: document.getElementById('repoModalClose'),
};

let allReposCache = [];

const has = (s, arr) => arr.some(k => (s || '').toLowerCase().includes(k));

function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function daysAgo(dateString) {
  const ms = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function isActive(repo) {
  const topics = Array.isArray(repo.topics) ? repo.topics.map(t => String(t).toLowerCase()) : [];
  if (topics.some(t => ACTIVE_TOPICS.includes(t))) return true;
  return daysAgo(repo.pushed_at || repo.updated_at) <= ACTIVE_DAYS_FALLBACK;
}

function bucket(repo) {
  const text = `${repo.name} ${repo.description || ''}`.toLowerCase();
  if (has(text, ['beamng', 'beammp', 'mod', 'map'])) return 'beamng';
  if (has(text, ['bot', 'discord', 'telegram', 'web', 'site', 'automation', 'n8n', 'api'])) return 'web';
  return 'tools';
}

function badges(repo) {
  const list = [];
  if (repo.language) list.push(`<span class="badge">${esc(repo.language)}</span>`);
  if (isActive(repo)) list.push('<span class="badge active">Active now</span>');
  list.push(`<span class="badge">Updated ${daysAgo(repo.updated_at)}d ago</span>`);
  return `<div class="badges">${list.join('')}</div>`;
}

function card(repo) {
  return `<article class="repo-card">
    <h3><a href="${esc(repo.html_url)}" target="_blank" rel="noreferrer">${esc(repo.name)}</a></h3>
    <div class="desc">${esc(repo.description || 'No description yet.')}</div>
    <div class="meta">★ ${repo.stargazers_count} • Forks ${repo.forks_count} • Open issues ${repo.open_issues_count}</div>
    ${badges(repo)}
    <div class="card-actions">
      <button class="btn" data-action="details" data-repo="${esc(repo.name)}">Details</button>
      <a class="btn" href="${esc(repo.html_url)}" target="_blank" rel="noreferrer">Open</a>
    </div>
  </article>`;
}

function render(el, repos) {
  if (!repos.length) {
    el.innerHTML = '<div class="empty">No repositories in this section.</div>';
    return;
  }
  el.innerHTML = repos.map(card).join('');
}

function getActiveRepos(repos) {
  const byTopic = repos.filter(r => {
    const topics = Array.isArray(r.topics) ? r.topics.map(t => String(t).toLowerCase()) : [];
    return topics.some(t => ACTIVE_TOPICS.includes(t));
  });
  if (byTopic.length) return byTopic;

  return repos.filter(r => {
    const pushed = new Date(r.pushed_at || r.updated_at).getTime();
    const recentCutoff = Date.now() - (ACTIVE_DAYS_FALLBACK * 24 * 60 * 60 * 1000);
    return Number.isFinite(pushed) && pushed >= recentCutoff;
  });
}

function getPinned(repos) {
  const map = new Map(repos.map(r => [r.name.toLowerCase(), r]));
  const ordered = PINNED_REPOS.map(name => map.get(name.toLowerCase())).filter(Boolean);
  if (ordered.length) return ordered;
  return repos.slice(0, 4);
}

function searchRepos(query, repos) {
  const q = query.trim().toLowerCase();
  if (!q) return repos;
  return repos.filter(r => {
    const hay = `${r.name} ${r.description || ''} ${r.language || ''} ${(r.topics || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}

function openModal(repo) {
  if (!repo) return;
  const topics = (repo.topics || []).map(t => `<span class="badge">${esc(t)}</span>`).join(' ');
  els.modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="k">Repository</div><div class="v"><a href="${esc(repo.html_url)}" target="_blank" rel="noreferrer">${esc(repo.full_name)}</a></div>
      <div class="k">Description</div><div class="v">${esc(repo.description || 'No description yet.')}</div>
      <div class="k">Primary language</div><div class="v">${esc(repo.language || 'Unknown')}</div>
      <div class="k">Homepage</div><div class="v">${repo.homepage ? `<a href="${esc(repo.homepage)}" target="_blank" rel="noreferrer">${esc(repo.homepage)}</a>` : '—'}</div>
      <div class="k">Stats</div><div class="v">★ ${repo.stargazers_count} • Forks ${repo.forks_count} • Open issues ${repo.open_issues_count}</div>
      <div class="k">Updated</div><div class="v">${new Date(repo.updated_at).toLocaleString()} (${daysAgo(repo.updated_at)} days ago)</div>
      <div class="k">Topics</div><div class="v">${topics || 'No topics'}</div>
    </div>`;
  els.modal.classList.add('open');
  els.modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  els.modal.classList.remove('open');
  els.modal.setAttribute('aria-hidden', 'true');
}

function wireSearch() {
  if (!els.search) return;
  els.search.addEventListener('input', () => {
    const filtered = searchRepos(els.search.value, allReposCache);
    render(els.all, filtered);
  });
}

function wireModal() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="details"]');
    if (btn) {
      const repoName = btn.getAttribute('data-repo');
      const repo = allReposCache.find(r => r.name.toLowerCase() === String(repoName).toLowerCase());
      openModal(repo);
      return;
    }

    if (e.target?.matches('[data-close="modal"]') || e.target === els.modalClose) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

async function loadRepos() {
  try {
    const res = await fetch(API, {
      headers: { Accept: 'application/vnd.github+json, application/vnd.github.mercy-preview+json' }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const repos = (await res.json())
      .filter(r => !r.fork)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    allReposCache = repos;

    const active = getActiveRepos(repos);
    const pinned = getPinned(repos);

    render(els.pinned, pinned);
    render(els.featured, active.slice(0, 8));
    render(els.beamng, repos.filter(r => bucket(r) === 'beamng'));
    render(els.web, repos.filter(r => bucket(r) === 'web'));
    render(els.tools, repos.filter(r => bucket(r) === 'tools'));
    render(els.all, repos);

    const usingTopics = active.some(r => Array.isArray(r.topics) && r.topics.some(t => ACTIVE_TOPICS.includes(String(t).toLowerCase())));
    const modeLabel = usingTopics ? 'topic-tagged active repos' : `recently pushed (${ACTIVE_DAYS_FALLBACK}d)`;
    els.meta.textContent = `${repos.length} repos loaded • pinned ${pinned.length} • showing ${Math.min(active.length, 8)} active (${modeLabel})`;
  } catch (e) {
    [els.pinned, els.featured, els.beamng, els.web, els.tools, els.all].forEach(v => {
      if (v) v.innerHTML = '<div class="empty">Failed to load repositories.</div>';
    });
    els.meta.textContent = `Failed to load repositories: ${e.message}`;
  }
}

wireSearch();
wireModal();
loadRepos();
