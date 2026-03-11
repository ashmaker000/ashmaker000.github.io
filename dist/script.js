const USER = 'ashmaker000';
const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`;

const els = {
  meta: document.getElementById('profileMeta'),
  featured: document.getElementById('featuredList'),
  beamng: document.getElementById('beamngList'),
  web: document.getElementById('webList'),
  tools: document.getElementById('toolsList'),
  all: document.getElementById('allList'),
};

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

async function loadRepos() {
  try {
    const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const repos = (await res.json()).filter(r => !r.fork)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    render(els.featured, repos.slice(0, 6));
    render(els.beamng, repos.filter(r => bucket(r) === 'beamng'));
    render(els.web, repos.filter(r => bucket(r) === 'web'));
    render(els.tools, repos.filter(r => bucket(r) === 'tools'));
    render(els.all, repos);

    els.meta.textContent = `${repos.length} repos loaded from github.com/${USER}`;
  } catch (e) {
    Object.values(els).forEach(v => {
      if (v && v !== els.meta) v.innerHTML = '<div class="empty">Failed to load repositories.</div>';
    });
    els.meta.textContent = `Failed to load repositories: ${e.message}`;
  }
}

loadRepos();
