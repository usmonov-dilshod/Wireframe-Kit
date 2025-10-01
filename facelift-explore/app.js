const state = {
  allTechniques: [],
  filtered: [],
  query: '',
  filters: {
    type: '',
    area: '',
    maxDowntimeDays: 30,
    minDurationYears: 0,
    anesthesia: ''
  }
};

const els = {
  cards: document.getElementById('cards'),
  resultsCount: document.getElementById('results-count'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  typeSelect: document.getElementById('type-select'),
  areaSelect: document.getElementById('area-select'),
  downtimeRange: document.getElementById('downtime-range'),
  downtimeOutput: document.getElementById('downtime-output'),
  durationRange: document.getElementById('duration-range'),
  durationOutput: document.getElementById('duration-output'),
  anesthesiaSelect: document.getElementById('anesthesia-select'),
  resetFilters: document.getElementById('reset-filters'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-desc'),
  modalBadges: document.getElementById('modal-badges')
};

async function fetchTechniques(){
  const res = await fetch('./data/techniques.json');
  if(!res.ok) throw new Error('Не удалось загрузить данные');
  const data = await res.json();
  state.allTechniques = data;
  applyFiltersAndRender();
}

function applyFiltersAndRender(){
  const q = state.query.trim().toLowerCase();
  const f = state.filters;

  state.filtered = state.allTechniques.filter(t => {
    const matchesQuery = q === '' || [t.name, t.aliases?.join(' '), t.summary]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
    const matchesType = !f.type || t.type === f.type;
    const matchesArea = !f.area || t.areas?.includes(f.area);
    const matchesDowntime = t.recovery?.daysMax != null ? t.recovery.daysMax <= f.maxDowntimeDays : true;
    const matchesDuration = t.effectDuration?.yearsMin != null ? t.effectDuration.yearsMin >= f.minDurationYears : true;
    const matchesAnesthesia = !f.anesthesia || t.anesthesia?.includes(f.anesthesia);
    return matchesQuery && matchesType && matchesArea && matchesDowntime && matchesDuration && matchesAnesthesia;
  });

  renderCards();
}

function renderCards(){
  const { filtered } = state;
  els.cards.innerHTML = '';
  els.resultsCount.textContent = `${filtered.length} результатов`;

  const tpl = document.getElementById('card-template');
  const frag = document.createDocumentFragment();
  filtered.forEach(t => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    node.querySelector('.card-title').textContent = t.name;
    node.querySelector('.card-sub').textContent = t.summary || '';

    const pillRow = node.querySelector('.pill-row');
    const pills = [];
    if(t.type){ pills.push(createPill(t.type)); }
    if(t.areas && t.areas.length){ pills.push(createPill(labelArea(t.areas[0]))); }
    if(t.recovery?.daysMax != null){ pills.push(createPill(`Восст. ≤ ${t.recovery.daysMax} д`)); }
    if(t.effectDuration?.yearsMin != null){ pills.push(createPill(`Эффект ≥ ${t.effectDuration.yearsMin} г`)); }
    pills.forEach(p => pillRow.appendChild(p));

    const button = node.querySelector('.card-click');
    button.addEventListener('click', () => openModal(t));
    card.dataset.id = t.id;
    frag.appendChild(node);
  });
  els.cards.appendChild(frag);
}

function createPill(text){
  const span = document.createElement('span');
  span.className = 'pill';
  span.textContent = text;
  return span;
}

function labelArea(area){
  const map = { forehead:'Лоб/брови', midface:'Средняя зона', lower_face:'Нижняя треть', neck:'Шея' };
  return map[area] || area;
}

function openModal(t){
  els.modalTitle.textContent = t.name;
  els.modalBadges.innerHTML = '';
  const badges = [];
  if(t.type){ badges.push(`Тип: ${labelType(t.type)}`); }
  if(t.anesthesia?.length){ badges.push(`Анестезия: ${t.anesthesia.map(labelAnesthesia).join(', ')}`); }
  if(t.duration){ badges.push(`Процедура: ${t.duration}`); }
  if(t.recovery){
    const rec = t.recovery;
    if(rec.daysMin != null && rec.daysMax != null){ badges.push(`Восстановление: ${rec.daysMin}-${rec.daysMax} д`); }
  }
  badges.forEach(b => {
    const s = document.createElement('span'); s.className = 'badge'; s.textContent = b; els.modalBadges.appendChild(s);
  });

  els.modalBody.innerHTML = '';
  if(t.description){
    const p = document.createElement('p'); p.textContent = t.description; els.modalBody.appendChild(p);
  }
  if(t.indications?.length){
    const h = document.createElement('h4'); h.textContent = 'Показания'; els.modalBody.appendChild(h);
    const ul = document.createElement('ul');
    t.indications.forEach(i => { const li = document.createElement('li'); li.textContent = i; ul.appendChild(li); });
    els.modalBody.appendChild(ul);
  }
  if(t.risks?.length){
    const h = document.createElement('h4'); h.textContent = 'Риски'; els.modalBody.appendChild(h);
    const ul = document.createElement('ul');
    t.risks.forEach(i => { const li = document.createElement('li'); li.textContent = i; ul.appendChild(li); });
    els.modalBody.appendChild(ul);
  }
  if(t.alt?.length){
    const h = document.createElement('h4'); h.textContent = 'Альтернативы'; els.modalBody.appendChild(h);
    const ul = document.createElement('ul');
    t.alt.forEach(i => { const li = document.createElement('li'); li.textContent = i; ul.appendChild(li); });
    els.modalBody.appendChild(ul);
  }

  els.modal.hidden = false;
  trapFocus(els.modal);
}

function closeModal(){
  els.modal.hidden = true;
  releaseFocus();
}

function labelType(v){
  const map = { surgical:'Хирургическая', minimally_invasive:'Малоинвазивная', non_surgical:'Безоперационная' };
  return map[v] || v;
}
function labelAnesthesia(v){
  const map = { local:'местная', sedation:'седация', general:'общая' };
  return map[v] || v;
}

function setupEvents(){
  els.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    state.query = els.searchInput.value;
    applyFiltersAndRender();
  });

  els.typeSelect.addEventListener('change', () => { state.filters.type = els.typeSelect.value; applyFiltersAndRender(); });
  els.areaSelect.addEventListener('change', () => { state.filters.area = els.areaSelect.value; applyFiltersAndRender(); });

  els.downtimeRange.addEventListener('input', () => {
    state.filters.maxDowntimeDays = Number(els.downtimeRange.value);
    els.downtimeOutput.textContent = `≤ ${state.filters.maxDowntimeDays}`;
    applyFiltersAndRender();
  });
  els.durationRange.addEventListener('input', () => {
    state.filters.minDurationYears = Number(els.durationRange.value);
    els.durationOutput.textContent = `≥ ${state.filters.minDurationYears}`;
    applyFiltersAndRender();
  });
  els.anesthesiaSelect.addEventListener('change', () => { state.filters.anesthesia = els.anesthesiaSelect.value; applyFiltersAndRender(); });
  els.resetFilters.addEventListener('click', () => {
    state.query = '';
    els.searchInput.value = '';
    state.filters = { type:'', area:'', maxDowntimeDays:30, minDurationYears:0, anesthesia:'' };
    els.typeSelect.value = '';
    els.areaSelect.value = '';
    els.downtimeRange.value = 30; els.downtimeOutput.textContent = '≤ 30';
    els.durationRange.value = 0; els.durationOutput.textContent = '≥ 0';
    els.anesthesiaSelect.value = '';
    applyFiltersAndRender();
  });

  els.modal.addEventListener('click', e => {
    if(e.target.hasAttribute('data-close')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !els.modal.hidden) closeModal();
  });
}

let focusPrev = null;
function trapFocus(container){
  focusPrev = document.activeElement;
  const focusable = container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  function onKey(e){
    if(e.key !== 'Tab') return;
    if(e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
    else if(!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
  }
  container.addEventListener('keydown', onKey);
  container.dataset.trap = '1';
  first?.focus();
}
function releaseFocus(){
  if(focusPrev){ focusPrev.focus(); focusPrev = null; }
}

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  fetchTechniques().catch(err => {
    els.cards.innerHTML = `<div style="color:#ee99a0">Ошибка загрузки данных: ${err.message}</div>`;
  });
});

