const STORAGE_KEY = 'cieloobs_data_2023_1100';
const ABOUT_PHOTO_KEY = 'cieloobs_about_photo_2023_1100';

const CATEGORY_META = {
  'Astronomía': { slug: 'astronomia', label: '🌟 Astronomía' },
  'Fenómeno atmosférico': { slug: 'atmosferico', label: '🌤 Atmosférico' },
  'Aves': { slug: 'aves', label: '🦅 Aves' },
  'Aeronave/Objeto artificial': { slug: 'artificial', label: '🛸 Artificial' },
  Otro: { slug: '', label: '🔭 Otro' }
};

const state = {
  observations: [],
  currentFilter: 'all',
  currentObsId: null,
  mediaRecorder: null,
  audioChunks: [],
  audioDataUrl: null,
  obsPhotoDataUrl: null,
  toastTimer: null
};

const elements = {};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  init();
});

function cacheElements() {
  const ids = [
    'toast', 'deleteModal', 'obs-list', 'obs-count', 'filter-row', 'f-titulo', 'f-fecha', 'f-hora',
    'f-categoria', 'f-cielo', 'f-duracion', 'f-gps', 'f-ubicacion-txt', 'f-descripcion',
    'obsPhotoInput', 'obs-photo-preview', 'audioBtn', 'audioLabel', 'recordDot', 'audioPlayback',
    'audioPlayer', 'd-cat', 'd-titulo', 'd-meta', 'd-grid', 'd-desc', 'd-photo-wrap', 'd-audio-wrap',
    'd-ubicacion', 'aboutPhotoInput', 'about-img', 'about-initials', 'stat-total', 'stat-today',
    'stat-photo', 'stat-astro'
  ];

  ids.forEach((id) => {
    elements[toCamelCase(id)] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll('[data-screen-target]').forEach((button) => {
    button.addEventListener('click', () => showScreen(button.dataset.screenTarget));
  });

  elements.filterRow.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) {
      return;
    }
    setFilter(button.dataset.filter, button);
  });

  elements.obsList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-observation-id]');
    if (!card) {
      return;
    }
    openDetail(Number(card.dataset.observationId));
  });

  document.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) {
      return;
    }

    const actions = {
      'capture-gps': captureGPS,
      'toggle-recording': toggleRecording,
      'save-observation': saveObservation,
      'cancel-new': cancelNew,
      'delete-current-observation': deleteCurrentObservation,
      'open-delete-modal': openDeleteModal,
      'close-delete-modal': closeDeleteModal,
      'confirm-delete-all': confirmDeleteAll
    };

    const handler = actions[actionElement.dataset.action];
    if (handler) {
      handler();
    }
  });

  elements.obsPhotoInput.addEventListener('change', handleObservationPhoto);
  elements.aboutPhotoInput.addEventListener('change', handleAboutPhoto);
}

function init() {
  loadData();
  loadAboutPhoto();
  seedDemoDataIfEmpty();
  setDefaultDateTime();
  renderList();
  updateStats();
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.observations = raw ? JSON.parse(raw) : [];
  } catch {
    state.observations = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.observations));
}

function loadAboutPhoto() {
  const savedPhoto = localStorage.getItem(ABOUT_PHOTO_KEY);
  if (!savedPhoto) {
    return;
  }

  elements.aboutImg.src = savedPhoto;
  elements.aboutImg.hidden = false;
  elements.aboutInitials.hidden = true;
}

function setDefaultDateTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  elements.fFecha.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  elements.fHora.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach((button) => button.classList.remove('active'));
  const navMap = {
    'screen-list': 'nav-list',
    'screen-new': 'nav-new',
    'screen-about': 'nav-about',
    'screen-detail': 'nav-list'
  };

  const navId = navMap[screenId];
  if (navId) {
    document.getElementById(navId).classList.add('active');
  }

  window.scrollTo(0, 0);
  if (screenId === 'screen-about') {
    updateStats();
  }
}

function renderList() {
  const filtered = getFilteredObservations();
  elements.obsCount.textContent = `${state.observations.length} registro${state.observations.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    elements.obsList.innerHTML = '<div class="empty-state"><div class="icon">🔭</div><p>No hay observaciones aún.<br>Registra lo que ves en el cielo.</p></div>';
    return;
  }

  elements.obsList.innerHTML = filtered.map((observation) => {
    const category = getCategoryMeta(observation.categoria);
    const locationBadge = observation.lat !== null && observation.lng !== null
      ? '<span>📍 GPS</span>'
      : observation.ubicacion_texto
        ? `<span>📍 ${escapeHtml(observation.ubicacion_texto.slice(0, 20))}</span>`
        : '';

    return `
      <button class="obs-card cat-${category.slug}" type="button" data-observation-id="${observation.id}">
        <div class="obs-title">${escapeHtml(observation.titulo)}</div>
        <div class="obs-meta">
          <span>🕒 ${escapeHtml(observation.fecha)} ${escapeHtml(observation.hora || '')}</span>
          <span class="cat-pill ${category.slug}">${category.label}</span>
          ${observation.foto ? '<span>📷</span>' : ''}
          ${observation.audio ? '<span>🎤</span>' : ''}
          ${locationBadge}
        </div>
      </button>
    `;
  }).join('');
}

function getFilteredObservations() {
  const filtered = state.currentFilter === 'all'
    ? [...state.observations]
    : state.observations.filter((observation) => observation.categoria === state.currentFilter);

  return filtered.sort((left, right) => right.id - left.id);
}

function setFilter(filter, element) {
  state.currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.remove('active'));
  element.classList.add('active');
  renderList();
}

function captureGPS() {
  if (!navigator.geolocation) {
    showToast('GPS no disponible', 'error');
    return;
  }

  showToast('Obteniendo ubicación…');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(5);
      const lng = position.coords.longitude.toFixed(5);
      elements.fGps.value = `${lat}, ${lng}`;
      showToast('Ubicación capturada', 'success');
    },
    () => showToast('No se pudo obtener GPS', 'error'),
    { timeout: 8000 }
  );
}

function handleObservationPhoto(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  readFileAsDataUrl(file).then((dataUrl) => {
    state.obsPhotoDataUrl = dataUrl;
    elements.obsPhotoPreview.src = dataUrl;
    elements.obsPhotoPreview.style.display = 'block';
  });
}

function handleAboutPhoto(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  readFileAsDataUrl(file).then((dataUrl) => {
    localStorage.setItem(ABOUT_PHOTO_KEY, dataUrl);
    elements.aboutImg.src = dataUrl;
    elements.aboutImg.hidden = false;
    elements.aboutInitials.hidden = true;
  });
}

async function toggleRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('El dispositivo no permite grabar audio', 'error');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioChunks = [];
    state.mediaRecorder = new MediaRecorder(stream);

    state.mediaRecorder.addEventListener('dataavailable', (event) => {
      state.audioChunks.push(event.data);
    });

    state.mediaRecorder.addEventListener('stop', async () => {
      const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
      state.audioDataUrl = await blobToDataUrl(blob);
      elements.audioPlayer.src = state.audioDataUrl;
      elements.audioPlayback.hidden = false;
      elements.audioBtn.classList.remove('recording');
      elements.audioLabel.textContent = 'Grabación guardada';
      elements.recordDot.hidden = true;
      stream.getTracks().forEach((track) => track.stop());
    });

    state.mediaRecorder.start();
    elements.audioBtn.classList.add('recording');
    elements.audioLabel.textContent = 'Grabando… (toca para detener)';
    elements.recordDot.hidden = false;
  } catch {
    showToast('No se pudo acceder al micrófono', 'error');
  }
}

function saveObservation() {
  const titulo = elements.fTitulo.value.trim();
  const fecha = elements.fFecha.value;
  const hora = elements.fHora.value;
  const categoria = elements.fCategoria.value;
  const cielo = elements.fCielo.value;
  const duracion = elements.fDuracion.value;
  const gps = elements.fGps.value.trim();
  const ubicacionTexto = elements.fUbicacionTxt.value.trim();
  const descripcion = elements.fDescripcion.value.trim();

  if (!titulo) {
    showToast('El título es requerido', 'error');
    return;
  }

  if (!fecha) {
    showToast('La fecha es requerida', 'error');
    return;
  }

  if (!categoria) {
    showToast('Selecciona una categoría', 'error');
    return;
  }

  const { lat, lng, rawLocation } = parseGpsValue(gps);
  const observation = {
    id: Date.now(),
    titulo,
    fecha,
    hora,
    categoria,
    cielo,
    duracion_min: duracion ? Number.parseInt(duracion, 10) : null,
    lat,
    lng,
    ubicacion_texto: ubicacionTexto || rawLocation,
    descripcion,
    foto: state.obsPhotoDataUrl,
    audio: state.audioDataUrl,
    creado_en: new Date().toISOString()
  };

  state.observations.unshift(observation);
  saveData();
  resetForm();
  renderList();
  updateStats();
  showScreen('screen-list');
  showToast('Observación guardada', 'success');
}

function resetForm() {
  ['fTitulo', 'fDescripcion', 'fGps', 'fUbicacionTxt', 'fDuracion'].forEach((key) => {
    elements[key].value = '';
  });

  elements.fCategoria.value = '';
  elements.fCielo.value = '';
  elements.obsPhotoInput.value = '';
  elements.obsPhotoPreview.src = '';
  elements.obsPhotoPreview.style.display = 'none';
  elements.audioPlayback.hidden = true;
  elements.audioPlayer.src = '';
  elements.audioBtn.classList.remove('recording');
  elements.audioLabel.textContent = 'Iniciar grabación';
  elements.recordDot.hidden = true;

  state.obsPhotoDataUrl = null;
  state.audioDataUrl = null;
  state.audioChunks = [];
  state.mediaRecorder = null;
  setDefaultDateTime();
}

function cancelNew() {
  resetForm();
  showScreen('screen-list');
}

function openDetail(observationId) {
  const observation = state.observations.find((item) => item.id === observationId);
  if (!observation) {
    return;
  }

  state.currentObsId = observationId;
  const category = getCategoryMeta(observation.categoria);
  elements.dCat.innerHTML = `<span class="cat-pill ${category.slug}">${category.label}</span>`;
  elements.dTitulo.textContent = observation.titulo;
  elements.dMeta.innerHTML = `
    <span>🕒 ${escapeHtml(observation.fecha)} ${escapeHtml(observation.hora || '')}</span>
    ${observation.cielo ? `<span>🌤 ${escapeHtml(observation.cielo)}</span>` : ''}
    ${observation.duracion_min ? `<span>⏱ ${observation.duracion_min} min</span>` : ''}
  `;

  const detailCards = [];
  if (observation.lat !== null && observation.lng !== null) {
    detailCards.push(`<div class="detail-meta-item"><div class="label">Latitud</div><div class="value">${observation.lat.toFixed(5)}</div></div>`);
    detailCards.push(`<div class="detail-meta-item"><div class="label">Longitud</div><div class="value">${observation.lng.toFixed(5)}</div></div>`);
  }
  if (observation.duracion_min) {
    detailCards.push(`<div class="detail-meta-item"><div class="label">Duración</div><div class="value">${observation.duracion_min} min</div></div>`);
  }
  if (observation.cielo) {
    detailCards.push(`<div class="detail-meta-item"><div class="label">Cielo</div><div class="value">${escapeHtml(observation.cielo)}</div></div>`);
  }
  detailCards.push(`<div class="detail-meta-item"><div class="label">Registrado</div><div class="value muted-small">${new Date(observation.creado_en).toLocaleString('es-DO')}</div></div>`);
  elements.dGrid.innerHTML = detailCards.join('');

  elements.dDesc.textContent = observation.descripcion || '(Sin descripción)';
  elements.dPhotoWrap.innerHTML = observation.foto ? `<img src="${observation.foto}" class="detail-photo" alt="Foto de la observación">` : '';
  elements.dAudioWrap.innerHTML = observation.audio
    ? `<div class="audio-playback"><audio controls src="${observation.audio}"></audio></div>`
    : '';

  const location = observation.lat !== null && observation.lng !== null
    ? `GPS: ${observation.lat.toFixed(4)}, ${observation.lng.toFixed(4)}`
    : observation.ubicacion_texto || 'Ubicación no especificada';
  elements.dUbicacion.textContent = location;

  showScreen('screen-detail');
}

function deleteCurrentObservation() {
  state.observations = state.observations.filter((observation) => observation.id !== state.currentObsId);
  saveData();
  renderList();
  updateStats();
  showScreen('screen-list');
  showToast('Observación eliminada', 'error');
}

function openDeleteModal() {
  elements.deleteModal.classList.add('open');
}

function closeDeleteModal() {
  elements.deleteModal.classList.remove('open');
}

function confirmDeleteAll() {
  state.observations = [];
  saveData();
  renderList();
  updateStats();
  closeDeleteModal();
  showScreen('screen-list');
  showToast('Todos los datos eliminados', 'error');
}

function updateStats() {
  const today = new Date().toISOString().split('T')[0];
  elements.statTotal.textContent = state.observations.length;
  elements.statToday.textContent = state.observations.filter((item) => item.fecha === today).length;
  elements.statPhoto.textContent = state.observations.filter((item) => item.foto).length;
  elements.statAstro.textContent = state.observations.filter((item) => item.categoria === 'Astronomía').length;
}

function showToast(message, type = '') {
  elements.toast.textContent = message;
  elements.toast.className = `toast show${type ? ` ${type}` : ''}`;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    elements.toast.className = 'toast';
  }, 2800);
}

function seedDemoDataIfEmpty() {
  if (state.observations.length > 0) {
    return;
  }

  const today = new Date().toISOString();
  const day = today.split('T')[0];
  state.observations = [
    {
      id: 1,
      titulo: 'Halo solar',
      fecha: day,
      hora: '14:30',
      categoria: 'Fenómeno atmosférico',
      cielo: 'Parcialmente nublado',
      duracion_min: 25,
      lat: 18.4861,
      lng: -69.9312,
      ubicacion_texto: 'Santo Domingo, D.N.',
      descripcion: 'Arco luminoso completo alrededor del sol. Dirección cenital, con tinte irisado en los bordes internos.',
      foto: null,
      audio: null,
      creado_en: today
    },
    {
      id: 2,
      titulo: 'Lluvia de meteoros Perseidas',
      fecha: day,
      hora: '02:15',
      categoria: 'Astronomía',
      cielo: 'Despejado',
      duracion_min: 90,
      lat: 19.1065,
      lng: -70.2595,
      ubicacion_texto: 'La Vega, La Vega',
      descripcion: 'Aproximadamente 40 meteoros por hora desde el radiante en Perseo, con varias estelas persistentes.',
      foto: null,
      audio: null,
      creado_en: today
    },
    {
      id: 3,
      titulo: 'Bandada de aves migratorias',
      fecha: day,
      hora: '06:45',
      categoria: 'Aves',
      cielo: 'Despejado',
      duracion_min: 8,
      lat: 19.4517,
      lng: -70.697,
      ubicacion_texto: 'Santiago de los Caballeros',
      descripcion: 'Formación en V de unas 200 aves rumbo sur-suroeste, a una altura estimada de 300 metros.',
      foto: null,
      audio: null,
      creado_en: today
    }
  ];

  saveData();
}

function parseGpsValue(value) {
  if (!value) {
    return { lat: null, lng: null, rawLocation: '' };
  }

  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 2) {
    return { lat: null, lng: null, rawLocation: value };
  }

  const lat = Number.parseFloat(parts[0]);
  const lng = Number.parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { lat: null, lng: null, rawLocation: value };
  }

  return { lat, lng, rawLocation: '' };
}

function getCategoryMeta(category) {
  return CATEGORY_META[category] || { slug: '', label: escapeHtml(category || 'Sin categoría') };
}

function escapeHtml(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return readFileAsDataUrl(blob);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}