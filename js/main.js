/* A2S2 2027. Content is fetched from data/*.json at runtime, so this page must
   be served over HTTP — opening index.html via file:// will leave the Dates,
   Program, and Organizers sections empty. See README.md.

   All paths here are relative on purpose: that is what lets this site be
   served from the /2027/ subpath. The only absolute URL on the page is the
   nav brand's link back to the landing site. */

/* Social links are keyed by `label` against this map. A label that is not
   listed here is silently dropped, so add the icon before adding the link. */
const ICONS = {
  'X':              `<i class="fa-brands fa-x-twitter" aria-label="X"></i>`,
  'Bluesky':        `<i class="fa-brands fa-bluesky" aria-label="Bluesky"></i>`,
  'Mastodon':       `<i class="fa-brands fa-mastodon" aria-label="Mastodon"></i>`,
  'LinkedIn':       `<i class="fa-brands fa-linkedin" aria-label="LinkedIn"></i>`,
  'GitHub':         `<i class="fa-brands fa-github" aria-label="GitHub"></i>`,
  'Google Scholar': `<i class="ai ai-google-scholar-square" aria-label="Google Scholar"></i>`,
  'ORCID':          `<i class="ai ai-orcid-square" aria-label="ORCID"></i>`,
};

const EXT_LINK = 'target="_blank" rel="noopener noreferrer"';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

function iconsFor(links) {
  return (links || []).reduce((html, l) => {
    const icon = ICONS[l.label];
    return icon && l.url
      ? html + `<a href="${l.url}" class="org-icon" ${EXT_LINK} title="${l.label}">${icon}</a>`
      : html;
  }, '');
}

/* Organizer order is shuffled on every page load so no one is permanently
   first. The PRNG (mulberry32) is seeded from the current time; the 🔀 button
   reshuffles with a fresh seed and 🔤 sorts A–Z by last name. */

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffled(list, seed) {
  const rand = mulberry32(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const lastName = org => org.name.trim().split(/\s+/).pop();

function sortedAZ(list) {
  return [...list].sort((a, b) =>
    lastName(a).localeCompare(lastName(b)) || a.name.localeCompare(b.name));
}

function renderOrganizers(grid, organizers) {
  grid.innerHTML = organizers.map(org => {
    const nameHtml = org.website
      ? `<a href="${org.website}" class="org-card-name" ${EXT_LINK}>${org.name}</a>`
      : `<span class="org-card-name">${org.name}</span>`;
    // Email is stored split across two fields in organizers.json to prevent
    // simple scrapers from harvesting full addresses from the raw source.
    // Assembled here at render time so mailto: links still work normally.
    const emailHtml = (org.email_user && org.email_domain)
      ? `<a href="mailto:${org.email_user}@${org.email_domain}" class="org-card-email">${org.email_user}@${org.email_domain}</a>`
      : '';
    const icons = iconsFor(org.links);
    const photoHtml = org.photo
      ? `<img src="${org.photo}" alt="${org.name}" class="org-card-photo">`
      : '';
    return `<div class="org-card">
      ${photoHtml}
      <div class="org-card-info">
        ${nameHtml}
        <span class="org-card-affil">${org.affiliation}</span>
        ${emailHtml}
        ${icons ? `<span class="org-card-icons">${icons}</span>` : ''}
      </div>
    </div>`;
  }).join('');
  // A missing headshot degrades to a text-only card rather than a broken image.
  grid.querySelectorAll('.org-card-photo').forEach(img =>
    img.addEventListener('error', () => { img.style.display = 'none'; })
  );
}

async function loadOrganizers() {
  const grid = document.getElementById('org-grid');
  const buttons = document.querySelectorAll('.org-order-btn');
  try {
    const { organizers } = await fetchJSON('data/organizers.json');
    const apply = order => {
      renderOrganizers(grid, order === 'az' ? sortedAZ(organizers) : shuffled(organizers, Date.now()));
      buttons.forEach(b => b.setAttribute('aria-pressed', b.dataset.order === order));
    };
    buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.order)));
    apply('shuffle');
  } catch {
    grid.innerHTML = '<p class="data-error">Could not load organizer data.</p>';
  }
}

/* dates.json and program.json each carry an `enabled` flag. While it is false
   the placeholder rows are ignored and a notice renders instead, so the real
   schedule can be committed ahead of time and published by flipping one bool. */

async function loadDates() {
  const container = document.getElementById('dates-content');
  try {
    const data = await fetchJSON('data/dates.json');
    if (!data.enabled) {
      container.innerHTML = '<p class="tba-notice">CHI 2027 takes place May 10&ndash;14, 2027 in Pittsburgh, PA. The workshop date and submission deadlines will be announced soon.</p>';
      return;
    }
    container.innerHTML = `<table>
      <thead><tr><th>Event</th><th>Date</th></tr></thead>
      <tbody>${data.dates.map(d => `
        <tr>
          <td>${d.event}</td>
          <td>${d.date}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch {
    container.innerHTML = '<p class="data-error">Could not load dates.</p>';
  }
}

async function loadProgram() {
  const container = document.getElementById('program-content');
  try {
    const data = await fetchJSON('data/program.json');
    if (!data.enabled) {
      container.innerHTML = '<p class="tba-notice">The workshop program will be announced soon.</p>';
      return;
    }
    container.innerHTML = `<table>
      <thead><tr><th>Time</th><th>Session</th></tr></thead>
      <tbody>${data.sessions.map(s => {
        const badge = `<span class="prog-type">${s.type}</span>`;
        const speakerHtml = s.speaker ? ` <span class="prog-speaker">— ${s.speaker}</span>` : '';
        return `<tr>
          <td class="prog-time">${s.time}</td>
          <td>${s.title}${speakerHtml}${badge}</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
  } catch {
    container.innerHTML = '<p class="data-error">Could not load program.</p>';
  }
}

Promise.all([loadOrganizers(), loadDates(), loadProgram()]).catch(console.error);

/* ---- Mobile nav ---- */

const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.getElementById('nav-links');

const closeNav = () => {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', false);
};

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.addEventListener('click', e => {
  if (e.target.closest('a')) closeNav();
});

document.addEventListener('click', e => {
  if (!navLinks.classList.contains('open')) return;
  if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) closeNav();
});

/* ---- Hero: let the backronym initials settle in when scrolled into view.
   Plays at most twice, then stops observing. CSS suppresses it entirely
   under prefers-reduced-motion. ---- */

const heroSubtitle = document.querySelector('.hero-subtitle');
if (heroSubtitle && 'IntersectionObserver' in window) {
  let plays = 0;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        heroSubtitle.classList.remove('is-revealing');
        void heroSubtitle.offsetWidth;
        heroSubtitle.classList.add('is-revealing');
        plays++;
        if (plays >= 2) observer.disconnect();
      } else {
        heroSubtitle.classList.remove('is-revealing');
      }
    });
  }, { threshold: 0.6 });
  observer.observe(heroSubtitle);
}
