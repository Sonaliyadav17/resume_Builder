/* script.js — Clean, modular, commented */

// ------------------------
// Utilities
// -------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const saveToLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const loadFromLocal = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
};

// -------------------------
// App Constants & State
// -------------------------
const STORAGE_KEY = 'resume_builder_v1';
const state = {
  theme: 'blue',
  photoData: '', // base64
};

// Default theme values
const THEMES = {
  blue: { primary: '#3b82f6', accent: '#2563eb' },
  classic: { primary: '#374151', accent: '#4b5563' },
  green: { primary: '#059669', accent: '#047857' },
};

// -------------------------
// DOM References
// -------------------------
const form = document.getElementById('resumeForm');
const resumePreview = document.getElementById('resumePreview');

const addEducationBtn = document.getElementById('addEducationBtn');
const educationEntries = document.getElementById('educationEntries');

const addProjectBtn = document.getElementById('addProjectBtn');
const projectEntries = document.getElementById('projectEntries');

const saveJsonBtn = document.getElementById('saveJsonBtn');
const loadJsonInput = document.getElementById('loadJsonInput');

const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const printBtn = document.getElementById('printBtn');

const photoUpload = document.getElementById('photoUpload');
const themeButtons = document.getElementById('themeButtons');

// Show/hide toggles
const toggleSummary = document.getElementById('toggleSummary');
const toggleProjects = document.getElementById('toggleProjects');

// Throttle helper to limit preview renders
function throttle(fn, wait = 200) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// -------------------------
// Dynamic entry helpers
// -------------------------
function createEducationEntry(data = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'entry education-entry';
  wrapper.innerHTML = `
    <input data-field="degree" class="control" placeholder="Degree / Specialization" value="${escapeHtml(data.degree || '')}">
    <input data-field="institution" class="control" placeholder="Institution" value="${escapeHtml(data.institution || '')}">
    <input data-field="eduDates" class="control" placeholder="Dates (e.g., 2019 - 2020)" value="${escapeHtml(data.eduDates || '')}">
    <button type="button" class="remove-entry">Remove</button>
  `;
  wrapper.querySelector('.remove-entry').addEventListener('click', () => {
    wrapper.remove();
    renderPreviewThrottled();
  });
  return wrapper;
}

function createProjectEntry(data = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'entry project-entry';
  wrapper.innerHTML = `
    <input data-field="projName" class="control" placeholder="Project name" value="${escapeHtml(data.projName || '')}">
    <input data-field="projLink" class="control" placeholder="Project link (optional)" value="${escapeHtml(data.projLink || '')}">
    <textarea data-field="projDesc" class="control" rows="3" placeholder="- Project details...">${escapeHtml(data.projDesc || '')}</textarea>
    <button type="button" class="remove-entry">Remove</button>
  `;
  wrapper.querySelector('.remove-entry').addEventListener('click', () => {
    wrapper.remove();
    renderPreviewThrottled();
  });
  return wrapper;
}

function escapeHtml(s) {
  return s ? String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') : '';
}

// -------------------------
// Collect data from form
// -------------------------
function collectFormData() {
  const data = {
    name: $('#name').value.trim(),
    title: $('#title').value.trim(),
    email: $('#email').value.trim(),
    phone: $('#phone').value.trim(),
    location: $('#location').value.trim(),
    linkedin: $('#linkedin').value.trim(),
    summary: $('#summary').value.trim(),
    exp: {
      title: $('#exp-title').value.trim(),
      company: $('#exp-company').value.trim(),
      dates: $('#exp-dates').value.trim(),
      description: $('#exp-desc').value.trim(),
    },
    skills: $('#skills').value.trim(),
    showSummary: toggleSummary.checked,
    showProjects: toggleProjects.checked,
    theme: state.theme,
    photoData: state.photoData || '',
    education: [],
    projects: []
  };

  // collect education
  $$('.education-entry', educationEntries).forEach(entry => {
    const obj = {};
    $$( '[data-field]', entry).forEach(inp => {
      obj[inp.getAttribute('data-field')] = inp.value.trim();
    });
    // only push if at least one field exists
    if (Object.values(obj).some(v => v)) data.education.push(obj);
  });

  // collect projects
  $$('.project-entry', projectEntries).forEach(entry => {
    const obj = {};
    $$( '[data-field]', entry).forEach(inp => {
      obj[inp.getAttribute('data-field')] = inp.value.trim();
    });
    if (Object.values(obj).some(v => v)) data.projects.push(obj);
  });

  return data;
}

// -------------------------
// Render resume preview
// -------------------------
function formatListToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return `<ul class="list-tight">${lines.map(l => `<li>${escapeHtml(l.replace(/^[\-\*\u2022\s]+/, ''))}</li>`).join('')}</ul>`;
}

function renderPreview() {
  const d = collectFormData();

  // header
  let html = `<div class="resume-header">`;
  html += `<div style="display:flex;gap:16px;align-items:center;justify-content:center;">`;
  if (d.photoData) {
    html += `<img src="${d.photoData}" alt="Profile photo" class="profile-photo" style="margin-right:10px;">`;
  }
  html += `<div style="text-align:center">`;
  if (d.name) html += `<div class="resume-name">${escapeHtml(d.name)}</div>`;
  if (d.title) html += `<div class="resume-title">${escapeHtml(d.title)}</div>`;
  html += `</div></div>`;

  // contact row
  html += `<div class="mt-3 text-sm text-slate-600" style="text-align:center">`;
  const contactItems = [];
  if (d.location) contactItems.push(escapeHtml(d.location));
  if (d.phone) contactItems.push(escapeHtml(d.phone));
  if (d.email) contactItems.push(escapeHtml(d.email));
  if (d.linkedin) {
    const display = d.linkedin.replace(/^https?:\/\//, '');
    contactItems.push(`<a href="${escapeHtml(d.linkedin)}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline">${escapeHtml(display)}</a>`);
  }
  html += contactItems.join(' • ');
  html += `</div></div>`; // header end

  // summary
  if (d.showSummary && d.summary) {
    html += `<div class="resume-section"><h3>PROFESSIONAL SUMMARY</h3><p class="text-sm mt-2">${escapeHtml(d.summary)}</p></div>`;
  }

  // experience
  if (d.exp && (d.exp.title || d.exp.company || d.exp.description)) {
    html += `<div class="resume-section"><h3>EXPERIENCE</h3>`;
    html += `<div class="mt-2">`;
    html += `<div class="flex justify-between items-start"><div><strong>${escapeHtml(d.exp.title || '')}</strong>${d.exp.company ? ` <span style="display:block;font-weight:600;color:var(--primary)">${escapeHtml(d.exp.company)}</span>`: ''}</div>`;
    html += `<div style="font-style:italic;color:#6b7280">${escapeHtml(d.exp.dates || '')}</div></div>`;
    if (d.exp.description) html += formatListToHtml(d.exp.description);
    html += `</div></div>`;
  }

  // projects
  if (d.showProjects && d.projects.length) {
    html += `<div class="resume-section"><h3>KEY PROJECTS</h3>`;
    d.projects.forEach(proj => {
      html += `<div class="mt-2"><div style="display:flex;justify-content:space-between"><strong>${escapeHtml(proj.projName || '')}</strong>`;
      if (proj.projLink) html += `<a href="${escapeHtml(proj.projLink)}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600">Link</a>`;
      html += `</div>`;
      if (proj.projDesc) html += formatListToHtml(proj.projDesc);
      html += `</div>`;
    });
    html += `</div>`;
  }

  // skills
  if (d.skills) {
    const skills = d.skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skills.length) {
      html += `<div class="resume-section"><h3>TECHNICAL SKILLS</h3><div class="mt-2">`;
      html += skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('');
      html += `</div></div>`;
    }
  }

  // education
  if (d.education.length) {
    html += `<div class="resume-section"><h3>EDUCATION</h3>`;
    d.education.forEach(edu => {
      html += `<div class="mt-2"><div style="display:flex;justify-content:space-between"><strong>${escapeHtml(edu.degree || '')}</strong><div style="font-style:italic;color:#6b7280">${escapeHtml(edu.eduDates || '')}</div></div>`;
      if (edu.institution) html += `<div style="color:var(--muted);font-weight:600">${escapeHtml(edu.institution)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  resumePreview.innerHTML = html;
  applyThemeToPreview();
  // autosave to local
  saveToLocal(STORAGE_KEY, collectFormData());
}

// throttle the preview for performance
const renderPreviewThrottled = throttle(renderPreview, 170);

// -------------------------
// Theme handling
// -------------------------
function applyThemeToPreview() {
  const theme = THEMES[state.theme] || THEMES.blue;
  document.documentElement.style.setProperty('--primary', theme.primary);
  document.documentElement.style.setProperty('--accent', theme.accent);
  // update active state on theme buttons
  $$('.theme-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === state.theme));
}

// -------------------------
// Events wiring
// -------------------------
function wireFormInputs() {
  // generic input change listener
  form.addEventListener('input', renderPreviewThrottled);

  // add education
  addEducationBtn.addEventListener('click', () => {
    educationEntries.appendChild(createEducationEntry({}));
    renderPreviewThrottled();
  });

  // add project
  addProjectBtn.addEventListener('click', () => {
    projectEntries.appendChild(createProjectEntry({}));
    renderPreviewThrottled();
  });

  // save JSON
  saveJsonBtn.addEventListener('click', () => {
    const data = collectFormData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (data.name ? data.name.replace(/\s+/g, '_') : 'resume') + '_data.json';
    link.click();
  });

  // load JSON
  loadJsonInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        populateFormFromData(obj);
        renderPreview();
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(f);
  });

  // PDF download
  downloadPdfBtn.addEventListener('click', () => {
    // adjust options for html2pdf
    const opt = {
      margin:       [5,5,5,5],
      filename:     `${($('#name').value || 'resume').replace(/\s+/g,'_')}_resume.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    // create a clone to avoid layout issues
    const element = resumePreview.cloneNode(true);
    element.style.width = '210mm';
    element.style.padding = '15mm';
    // open save
    html2pdf().set(opt).from(element).save();
  });

  // Print
  printBtn.addEventListener('click', () => window.print());

  // Theme buttons
  $$('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.theme = btn.dataset.theme;
      applyThemeToPreview();
      renderPreviewThrottled();
    });
  });

  // photo upload
  photoUpload.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.photoData = ev.target.result;
      renderPreview();
    };
    reader.readAsDataURL(f);
  });

  // toggles
  toggleSummary.addEventListener('change', renderPreviewThrottled);
  toggleProjects.addEventListener('change', renderPreviewThrottled);
}

// -------------------------
// Populate & restore
// -------------------------
function populateFormFromData(data) {
  if (!data) return;
  $('#name').value = data.name || '';
  $('#title').value = data.title || '';
  $('#email').value = data.email || '';
  $('#phone').value = data.phone || '';
  $('#location').value = data.location || '';
  $('#linkedin').value = data.linkedin || '';
  $('#summary').value = data.summary || '';
  $('#exp-title').value = data.exp?.title || '';
  $('#exp-company').value = data.exp?.company || '';
  $('#exp-dates').value = data.exp?.dates || '';
  $('#exp-desc').value = data.exp?.description || '';
  $('#skills').value = data.skills || '';
  toggleSummary.checked = data.showSummary !== false;
  toggleProjects.checked = data.showProjects !== false;
  state.theme = data.theme || state.theme;
  state.photoData = data.photoData || '';

  // rebuild dynamic entries
  educationEntries.innerHTML = '';
  if (Array.isArray(data.education) && data.education.length) {
    data.education.forEach(ed => educationEntries.appendChild(createEducationEntry(ed)));
  } else {
    // keep at least one blank entry
    educationEntries.appendChild(createEducationEntry({degree:'', institution:'', eduDates:''}));
  }

  projectEntries.innerHTML = '';
  if (Array.isArray(data.projects) && data.projects.length) {
    data.projects.forEach(p => projectEntries.appendChild(createProjectEntry(p)));
  } else {
    projectEntries.appendChild(createProjectEntry({projName:'', projLink:'', projDesc:''}));
  }
}

// -------------------------
// Initialization
// -------------------------
function init() {
  // wire events
  wireFormInputs();

  // initial sample entries already in HTML; ensure remove buttons work
  $$('.education-entry').forEach(e => {
    const btn = e.querySelector('.remove-entry');
    if (btn) {
      btn.addEventListener('click', () => { e.remove(); renderPreviewThrottled(); });
    }
  });
  $$('.project-entry').forEach(e => {
    const btn = e.querySelector('.remove-entry');
    if (btn) {
      btn.addEventListener('click', () => { e.remove(); renderPreviewThrottled(); });
    }
  });

  // load from local storage if available
  const saved = loadFromLocal(STORAGE_KEY);
  if (saved) {
    populateFormFromData(saved);
  } else {
    // ensure entries are wired if no saved data
    // make sure initial remove buttons exist
    $$('.education-entry').forEach(entry => {
      const btn = entry.querySelector('.remove-entry');
      if (btn) btn.classList.remove('hidden');
    });
    $$('.project-entry').forEach(entry => {
      const btn = entry.querySelector('.remove-entry');
      if (btn) btn.classList.remove('hidden');
    });
  }

  applyThemeToPreview();
  renderPreview();
}

// run
init();

