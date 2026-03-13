const USER = 'ashmaker000';
const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`;
const ACTIVE_TOPICS = ['wip', 'active', 'current', 'in-progress'];
const ACTIVE_DAYS_FALLBACK = 21;
const PINNED_REPOS = ['BeamMP-PropHunt', 'BeamMP-Traffic', 'BeamMP-Tag', 'BeamMP-CnR', 'BeamMP-CarHunt', 'ashmaker000.github.io'];
const THUMBNAILS = {
  "BeamMP-PropHunt": "./assets/thumbs/prophunt.png",
  "BeamMP-Traffic": "./assets/thumbs/traffic.png",
  "ashmaker000.github.io": "./assets/thumbs/portfolio.jpg"
};
const CASE_LINKS = {
  "BeamMP-PropHunt": "./projects/prophunt.html",
  "BeamMP-Traffic": "./projects/traffic.html",
  "ashmaker000.github.io": "./projects/portfolio.html"
};

const VALUE_TAGS = {
  'BeamMP-PropHunt': ['Gameplay','BeamMP','Live'],
  'BeamMP-Traffic': ['Gameplay','Automation','Live'],
  'BeamMP-Tag': ['Gameplay','BeamMP'],
  'BeamMP-CnR': ['Gameplay','Server'],
  'BeamMP-CarHunt': ['Gameplay','Mode'],
  'ashmaker000.github.io': ['Web','Portfolio','UX']
};

const CASE_STUDIES = {
  'BeamMP-PropHunt': {
    problem: 'PropHunt needed stable round flow and fewer mid-game failures.',
    solution: 'Refactored round-state transitions, hardened timers/events, and added guard rails for edge cases.',
    result: 'Smoother rounds, reduced desync incidents, and faster release confidence.'
  },
  'BeamMP-Traffic': {
    problem: 'Server world felt static and needed believable ambient traffic.',
    solution: 'Implemented scripted traffic logic plus compatibility checks across gameplay mods.',
    result: 'More alive multiplayer sessions with maintainable, testable scripts.'
  },
  'ashmaker000.github.io': {
    problem: 'Portfolio lacked hierarchy and made key projects hard to evaluate quickly.',
    solution: 'Added curated highlights, filters/search, case studies, and detail modal UX.',
    result: 'Faster scanning for visitors and stronger first-impression credibility.'
  }
};

const els = {
  meta: document.getElementById('profileMeta'),
  heroStats: document.getElementById('heroStats'),
  caseStudies: document.getElementById('caseStudyList'),
  proofList: document.getElementById('proofList'),
  latestWorkList: document.getElementById('latestWorkList'),
  themeToggle: document.getElementById('themeToggle'),
  pinned: document.getElementById('pinnedList'),
  featured: document.getElementById('featuredList'),
  beamng: document.getElementById('beamngList'),
  web: document.getElementById('webList'),
  tools: document.getElementById('toolsList'),
  all: document.getElementById('allList'),
  search: document.getElementById('repoSearch'),
  filterRow: document.getElementById('filterRow'),
  analyticsHint: document.getElementById('analyticsHint'),
  modal: document.getElementById('repoModal'),
  modalBody: document.getElementById('repoModalBody'),
  modalClose: document.getElementById('repoModalClose'),
};

let allReposCache = [];
let currentFilter = 'all';
let modalLastFocus = null;

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

function track(key) {
  const k = `analytics:${key}`;
  const v = Number(localStorage.getItem(k) || '0') + 1;
  localStorage.setItem(k, String(v));
}

function outboundLinks(repo) {
  const links = [];
  if (repo.homepage) links.push(`<a class="btn" href="${esc(repo.homepage)}" data-track="demo" target="_blank" rel="noreferrer">Demo</a>`);
  if ((repo.description || '').toLowerCase().includes('doc')) links.push(`<a class="btn" href="${esc(repo.html_url)}#readme" data-track="docs" target="_blank" rel="noreferrer">Docs</a>`);
  return links.join('');
}

function badges(repo) {
  const list = [];
  if (repo.language) list.push(`<span class="badge">${esc(repo.language)}</span>`);
  if (isActive(repo)) list.push('<span class="badge active">Active now</span>');
  list.push(`<span class="badge">Updated ${daysAgo(repo.updated_at)}d ago</span>`);
  return `<div class="badges">${list.join('')}</div>`;
}


function repoPreviewImage(repo) {
  const seed = encodeURIComponent(`${repo.name}-${repo.updated_at || ''}`);
  return THUMBNAILS[repo.name] || `https://opengraph.githubassets.com/${seed}/${repo.full_name}`;
}


function valueTags(repo) {
  const tags = VALUE_TAGS[repo.name] || [];
  if (!tags.length) return '';
  return `<div class="value-tags">${tags.map(t => `<span class="value-tag">${esc(t)}</span>`).join('')}</div>`;
}

function card(repo) {
  return `<article class="repo-card">
    <h3><a href="${esc(repo.html_url)}" data-track="repo-open" target="_blank" rel="noreferrer">${esc(repo.name)}</a></h3>
    <div class="desc">${esc(repo.description || 'No description yet.')}</div>
    <div class="meta">★ ${repo.stargazers_count} • Forks ${repo.forks_count} • Open issues ${repo.open_issues_count}</div>
    ${valueTags(repo)}
    ${badges(repo)}
    <div class="card-actions">
      <button class="btn" data-action="details" data-repo="${esc(repo.name)}">Details</button>
      <a class="btn" href="${esc(repo.html_url)}" data-track="repo-open" target="_blank" rel="noreferrer">Open</a>
      ${outboundLinks(repo)}
    </div>
  </article>`;
}

function caseStudyCard(repo) {
  const c = CASE_STUDIES[repo.name];
  if (!c) return card(repo);
  return `<article class="repo-card">
    <img class="repo-thumb" loading="lazy" src="${repoPreviewImage(repo)}" alt="${esc(repo.name)} preview" referrerpolicy="no-referrer" />
    <h3><a href="${esc(repo.html_url)}" data-track="repo-open" target="_blank" rel="noreferrer">${esc(repo.name)}</a></h3>
    <div class="badges"><span class="badge case">Case study</span>${isActive(repo) ? '<span class="badge active">Active</span>' : ''}</div>
    ${valueTags(repo)}
    <div class="meta"><strong>Problem:</strong> ${esc(c.problem)}</div>
    <div class="meta"><strong>Solution:</strong> ${esc(c.solution)}</div>
    <div class="meta"><strong>Result:</strong> ${esc(c.result)}</div>
    <div class="card-actions"><button class="btn" data-action="details" data-repo="${esc(repo.name)}">Details</button>${CASE_LINKS[repo.name] ? `<a class="btn" href="${CASE_LINKS[repo.name]}">Read Case Study</a>` : ""}</div>
  </article>`;
}

function render(el, repos, opts = {}) {
  if (!repos.length) {
    el.innerHTML = `<div class="empty">No repositories match this view yet.</div>`;
    return;
  }
  el.innerHTML = repos.map(r => opts.caseStudy ? caseStudyCard(r) : card(r)).join('');
}

function renderError(message) {
  const html = `<div class="empty">${esc(message)}</div><button class="btn retry-btn" id="retryLoad">Retry</button>`;
  [els.caseStudies, els.pinned, els.featured, els.beamng, els.web, els.tools, els.all].forEach(v => { if (v) v.innerHTML = html; });
  const retry = document.getElementById('retryLoad');
  if (retry) retry.addEventListener('click', () => loadRepos(true));
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
  return ordered.length ? ordered : repos.slice(0, 6);
}

function getCaseStudyRepos(repos) {
  return repos.filter(r => CASE_STUDIES[r.name]).slice(0, 4);
}

function searchRepos(query, repos) {
  const q = query.trim().toLowerCase();
  if (!q) return repos;
  return repos.filter(r => {
    const hay = `${r.name} ${r.description || ''} ${r.language || ''} ${(r.topics || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}

function applyFilter(repos, filter) {
  switch (filter) {
    case 'beamng': return repos.filter(r => bucket(r) === 'beamng');
    case 'web': return repos.filter(r => bucket(r) === 'web');
    case 'tools': return repos.filter(r => bucket(r) === 'tools');
    case 'archived': return repos.filter(r => r.archived);
    default: return repos;
  }
}

function trapFocusInModal(e) {
  if (!els.modal?.classList.contains('open') || e.key !== 'Tab') return;
  const focusables = els.modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const current = document.activeElement;
  if (e.shiftKey && current === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && current === last) {
    e.preventDefault();
    first.focus();
  }
}

function openModal(repo) {
  if (!repo) return;
  const topics = (repo.topics || []).map(t => `<span class="badge">${esc(t)}</span>`).join(' ');
  const c = CASE_STUDIES[repo.name];
  const caseBlock = c ? `<div class="k">Case Study</div><div class="v"><strong>Problem:</strong> ${esc(c.problem)}<br/><strong>Solution:</strong> ${esc(c.solution)}<br/><strong>Result:</strong> ${esc(c.result)}</div>` : '';
  els.modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="k">Repository</div><div class="v"><a href="${esc(repo.html_url)}" target="_blank" rel="noreferrer">${esc(repo.full_name)}</a></div>
      <div class="k">Description</div><div class="v">${esc(repo.description || 'No description yet.')}</div>
      <div class="k">Primary language</div><div class="v">${esc(repo.language || 'Unknown')}</div>
      <div class="k">Homepage</div><div class="v">${repo.homepage ? `<a href="${esc(repo.homepage)}" target="_blank" rel="noreferrer">${esc(repo.homepage)}</a>` : '—'}</div>
      <div class="k">Stats</div><div class="v">★ ${repo.stargazers_count} • Forks ${repo.forks_count} • Open issues ${repo.open_issues_count}</div>
      <div class="k">Updated</div><div class="v">${new Date(repo.updated_at).toLocaleString()} (${daysAgo(repo.updated_at)} days ago)</div>
      <div class="k">Topics</div><div class="v">${topics || 'No topics'}</div>
      ${caseBlock}
    </div>`;
  modalLastFocus = document.activeElement;
  els.modal.classList.add('open');
  els.modal.setAttribute('aria-hidden', 'false');
  els.modal.querySelector('.repo-modal-card')?.setAttribute('tabindex','-1');
  els.modal.querySelector('.repo-modal-card')?.focus();
}

function closeModal() {
  els.modal.classList.remove('open');
  els.modal.setAttribute('aria-hidden', 'true');
  if (modalLastFocus && typeof modalLastFocus.focus === 'function') modalLastFocus.focus();
}

function wireInteractions() {
  if (els.search) {
    els.search.addEventListener('input', () => {
      const filtered = applyFilter(searchRepos(els.search.value, allReposCache), currentFilter);
      render(els.all, filtered);
    });
  }

  if (els.filterRow) {
    els.filterRow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      currentFilter = btn.getAttribute('data-filter') || 'all';
      els.filterRow.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      const filtered = applyFilter(searchRepos(els.search?.value || '', allReposCache), currentFilter);
      render(els.all, filtered);
      track(`filter:${currentFilter}`);
    });
  }

  document.addEventListener('click', (e) => {
    const detailsBtn = e.target.closest('[data-action="details"]');
    if (detailsBtn) {
      const repoName = detailsBtn.getAttribute('data-repo');
      const repo = allReposCache.find(r => r.name.toLowerCase() === String(repoName).toLowerCase());
      openModal(repo);
      track('modal-open');
      return;
    }

    const tracked = e.target.closest('[data-track]');
    if (tracked) track(tracked.getAttribute('data-track'));

    if (e.target?.matches('[data-close="modal"]') || e.target === els.modalClose) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    trapFocusInModal(e);
  });
}

function renderAnalyticsHint(repoCount = 0) {
  const views = Number(localStorage.getItem('analytics:page-view') || '0');
  const opens = Number(localStorage.getItem('analytics:repo-open') || '0');
  const modal = Number(localStorage.getItem('analytics:modal-open') || '0');
  const text = `Live stats: ${repoCount} repos • ${views} visits • ${opens} opens • ${modal} detail views`; 
  if (els.analyticsHint) els.analyticsHint.textContent = text;
  if (els.heroStats) els.heroStats.textContent = text;
}

async function loadRepos(forceNetwork = false) {
  try {
    if (!forceNetwork) {
      const cached = localStorage.getItem('repo-cache:v1');
      if (cached) {
        const repos = JSON.parse(cached);
        if (Array.isArray(repos) && repos.length) {
          allReposCache = repos;
          hydrate(repos);
        }
      }
    }

    const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json, application/vnd.github.mercy-preview+json' } });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const repos = (await res.json()).filter(r => !r.fork).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    allReposCache = repos;
    localStorage.setItem('repo-cache:v1', JSON.stringify(repos));
    hydrate(repos);
  } catch (e) {
    if (!allReposCache.length) {
      renderError(`Failed to load repositories: ${e.message}.`);
      if (els.meta) els.meta.textContent = `GitHub API unavailable. Showing retry option.`;
    }
  }
}

function renderProof() {
  const proof = [
    "BeamMP gameplay systems shipped and iterated weekly",
    "Portfolio UX rebuilt for speed, clarity, and mobile",
    "Automation + reliability-first development workflow"
  ];
  if (els.proofList) els.proofList.innerHTML = proof.map(p => `<div class="proof-item">${p}</div>`).join("");
}

function renderLatestWork(repos) {
  const latest = repos.slice(0,3);
  if (els.latestWorkList) render(els.latestWorkList, latest);
}

function applyTheme(theme) {
  if (theme === "light") document.documentElement.setAttribute("data-theme","light");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem("theme", theme);
}

function wireTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);
  if (els.themeToggle) els.themeToggle.addEventListener("click", () => {
    const next = (localStorage.getItem("theme") || "dark") === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

function hydrate(repos) {
  const active = getActiveRepos(repos);
  const pinned = getPinned(repos);
  const cases = getCaseStudyRepos(repos);

  renderProof();
  renderLatestWork(repos);
  render(els.caseStudies, cases, { caseStudy: true });
  render(els.pinned, pinned);
  render(els.featured, active.slice(0, 8));
  render(els.beamng, repos.filter(r => bucket(r) === 'beamng'));
  render(els.web, repos.filter(r => bucket(r) === 'web'));
  render(els.tools, repos.filter(r => bucket(r) === 'tools'));
  render(els.all, applyFilter(searchRepos(els.search?.value || '', repos), currentFilter));

  const usingTopics = active.some(r => Array.isArray(r.topics) && r.topics.some(t => ACTIVE_TOPICS.includes(String(t).toLowerCase())));
  const modeLabel = usingTopics ? 'topic-tagged active repos' : `recently pushed (${ACTIVE_DAYS_FALLBACK}d)`;
  if (els.meta) els.meta.textContent = `${repos.length} repos loaded • pinned ${pinned.length} • showing ${Math.min(active.length, 8)} active (${modeLabel})`;
  renderAnalyticsHint(repos.length);
}

track('page-view');
wireTheme();
wireInteractions();
loadRepos();
