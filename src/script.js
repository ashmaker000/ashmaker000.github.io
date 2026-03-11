const USER = 'ashmaker000';
const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`;

const el = {
  meta: document.getElementById('profileMeta'),
  featured: document.querySelector('[data-bucket="featured"]'),
  beamng: document.querySelector('[data-bucket="beamng"]'),
  web: document.querySelector('[data-bucket="web"]'),
  tools: document.querySelector('[data-bucket="tools"]'),
  all: document.querySelector('[data-bucket="all"]'),
  tpl: document.getElementById('repoCardTemplate')
};

const has = (s, arr) => arr.some(k => (s || '').toLowerCase().includes(k));

function bucket(repo) {
  const text = `${repo.name} ${repo.description || ''}`.toLowerCase();
  if (has(text, ['beamng', 'beammp', 'mod', 'map'])) return 'beamng';
  if (has(text, ['bot', 'discord', 'telegram', 'web', 'site', 'api', 'automation', 'n8n'])) return 'web';
  if (has(text, ['tool', 'script', 'cli', 'python', 'lua', 'util'])) return 'tools';
  return 'tools';
}

function card(repo) {
  const node = el.tpl.content.firstElementChild.cloneNode(true);
  const link = node.querySelector('h3 a');
  link.href = repo.html_url;
  link.textContent = repo.name;
  node.querySelector('.desc').textContent = repo.description || 'No description yet.';

  const chips = node.querySelector('.chips');
  [repo.language, repo.private ? 'private' : 'public', repo.archived ? 'archived' : 'active']
    .filter(Boolean)
    .forEach(c => {
      const tag = document.createElement('span');
      tag.textContent = c;
      chips.appendChild(tag);
    });

  node.querySelector('.stats').textContent = `★ ${repo.stargazers_count}  ·  Forks ${repo.forks_count}  ·  Updated ${new Date(repo.updated_at).toLocaleDateString()}`;
  return node;
}

function renderList(target, repos) {
  target.innerHTML = '';
  if (!repos.length) {
    target.innerHTML = '<div class="empty">No repositories in this section yet.</div>';
    return;
  }
  repos.forEach(r => target.appendChild(card(r)));
}

async function main() {
  try {
    const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    const repos = await res.json();

    const active = repos.filter(r => !r.fork).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    const featured = active.slice(0, 6);
    const beamng = active.filter(r => bucket(r) === 'beamng');
    const web = active.filter(r => bucket(r) === 'web');
    const tools = active.filter(r => bucket(r) === 'tools');

    renderList(el.featured, featured);
    renderList(el.beamng, beamng);
    renderList(el.web, web);
    renderList(el.tools, tools);
    renderList(el.all, active);

    el.meta.textContent = `${active.length} repositories loaded • last refresh ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    el.meta.textContent = `Failed to load repos: ${err.message}`;
    [el.featured, el.beamng, el.web, el.tools, el.all].forEach(t => t.innerHTML = '<div class="empty">Unable to load repos right now.</div>');
  }
}

main();
