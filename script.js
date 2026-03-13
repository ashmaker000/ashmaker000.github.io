const USER = 'ashmaker000';
const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`;
const ACTIVE_TOPICS = ['wip', 'active', 'current', 'in-progress'];
const ACTIVE_DAYS_FALLBACK = 21;

const els = {
  meta: document.getElementById('profileMeta'),
  featured: document.getElementById('featuredList'),
  beamng: document.getElementById('beamngList'),
  web: document.getElementById('webList'),
  tools: document.getElementById('toolsList'),
  all: document.getElementById('allList'),
  search: document.getElementById('repoSearch'),
};

let allReposCache = [];

const has = (s, arr) => arr.some(k => (s || '').toLowerCase().includes(k));

function bucket(repo) {
  const text = `${repo.name} ${repo.description || ''}`.toLowerCase();
  if (has(text, ['beamng', 'beammp', 'mod', 'map'])) return 'beamng';
  if (has(text, ['bot', 'discord', 'telegram', 'web', 'site', 'automation', 'n8n', 'api'])) return 'web';
  return 'tools';
}

function card(repo) {
  return `<article class="repo-card">
    <h3><a href="${repo.html_url}" target="_blank" rel="noreferrer">${repo.name}</a></h3>
    <div class="desc">${repo.description || 'No description yet.'}</div>
    <div class="meta">${repo.language || 'Unknown'} • ★ ${repo.stargazers_count} • Updated ${new Date(repo.updated_at).toLocaleDateString()}</div>
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
  const now = Date.now();
  const recentCutoff = now - (ACTIVE_DAYS_FALLBACK * 24 * 60 * 60 * 1000);

  const byTopic = repos.filter(r => {
    const topics = Array.isArray(r.topics) ? r.topics.map(t => String(t).toLowerCase()) : [];
    return topics.some(t => ACTIVE_TOPICS.includes(t));
  });

  if (byTopic.length) return byTopic;

  return repos.filter(r => {
    const pushed = new Date(r.pushed_at || r.updated_at).getTime();
    return Number.isFinite(pushed) && pushed >= recentCutoff;
  });
}

function searchRepos(query, repos) {
  const q = query.trim().toLowerCase();
  if (!q) return repos;
  return repos.filter(r => {
    const hay = `${r.name} ${r.description || ''} ${r.language || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

function wireSearch() {
  if (!els.search) return;
  els.search.addEventListener('input', () => {
    const filtered = searchRepos(els.search.value, allReposCache);
    render(els.all, filtered);
  });
}

async function loadRepos() {
  try {
    const res = await fetch(API, {
      headers: {
        Accept: 'application/vnd.github+json, application/vnd.github.mercy-preview+json'
      }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const repos = (await res.json())
      .filter(r => !r.fork)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    allReposCache = repos;

    const active = getActiveRepos(repos);

    render(els.featured, active.slice(0, 8));
    render(els.beamng, repos.filter(r => bucket(r) === 'beamng'));
    render(els.web, repos.filter(r => bucket(r) === 'web'));
    render(els.tools, repos.filter(r => bucket(r) === 'tools'));
    render(els.all, repos);

    const usingTopics = active.some(r => Array.isArray(r.topics) && r.topics.some(t => ACTIVE_TOPICS.includes(String(t).toLowerCase())));
    const modeLabel = usingTopics ? 'topic-tagged active repos' : `recently pushed (${ACTIVE_DAYS_FALLBACK}d)`;
    els.meta.textContent = `${repos.length} repos loaded • showing ${Math.min(active.length, 8)} currently active (${modeLabel})`;
  } catch (e) {
    Object.values(els).forEach(v => {
      if (v && v !== els.meta && v !== els.search) v.innerHTML = '<div class="empty">Failed to load repositories.</div>';
    });
    els.meta.textContent = `Failed to load repositories: ${e.message}`;
  }
}

wireSearch();
loadRepos();
