/**
 * ============================================================================
 * CONTRATIA MINI - CONTROLADOR PRINCIPAL DEL DOM Y VISTAS
 * Guiado por: .agents/skills/interfaces-crud/SKILL.md y api-rest/SKILL.md
 * ============================================================================
 */

import { api } from './api.js';

// --- Estado global de la aplicación cliente ---
const state = {
  currentView: 'dashboard',
  instalaciones: [],
  equipos: [],
  incidencias: [],
  pendingDeleteAction: null
};

// --- Utilidades Generales y Seguridad ---
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Notificaciones Flotantes (Toasts)
 * @param {string} message - Mensaje legible
 * @param {'success'|'error'|'info'} type - Tipo de notificación
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  const iconMap = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast__icon">${iconMap[type] || '🔔'}</span>
    <span class="toast__message">${escapeHtml(message)}</span>
    <button class="toast__close" type="button" aria-label="Cerrar">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast__close');
  closeBtn.addEventListener('click', () => toast.remove());

  container.appendChild(toast);

  // Auto-eliminación tras 3.5 segundos
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 3500);
}

// --- Gestor Accesible de Modales ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  // Foco en el primer input accesible
  const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea, button');
  if (firstInput) firstInput.focus();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';

  const form = modal.querySelector('form');
  if (form) {
    form.reset();
    const hiddenId = form.querySelector('input[type="hidden"]');
    if (hiddenId) hiddenId.value = '';
  }
}

function setupModalEventListeners() {
  document.querySelectorAll('.modal').forEach(modal => {
    // Cerrar al pulsar elementos con [data-close-modal] (botón X, backdrop, botón cancelar)
    modal.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => closeModal(modal.id));
    });
  });

  // Cerrar con tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not([hidden])').forEach(modal => {
        closeModal(modal.id);
      });
    }
  });
}

// --- Diálogo de Confirmación de Eliminación ---
function requestDeleteConfirmation(message, onConfirmCallback) {
  const modal = document.getElementById('modal-confirmar');
  const msgEl = document.getElementById('modal-confirmar-mensaje');
  const confirmBtn = document.getElementById('btn-confirmar-eliminar');

  msgEl.textContent = message;
  state.pendingDeleteAction = onConfirmCallback;

  openModal('modal-confirmar');
}

// --- Renderizado de Badges de Estado y Prioridad ---
function getEstadoEquipoBadge(estado) {
  const labels = {
    OPERATIVO: 'Operativo',
    AVERIADO: 'Averiado',
    EN_MANTENIMIENTO: 'En Mantenimiento'
  };
  const modifier = estado ? estado.toLowerCase().replace('_', '-') : 'operativo';
  return `<span class="badge badge--${modifier}">${escapeHtml(labels[estado] || estado)}</span>`;
}

function getPrioridadBadge(prioridad) {
  const labels = {
    CRITICA: 'Crítica',
    ALTA: 'Alta',
    MEDIA: 'Media',
    BAJA: 'Baja'
  };
  const modifier = prioridad ? prioridad.toLowerCase() : 'media';
  return `<span class="badge badge--${modifier}">${escapeHtml(labels[prioridad] || prioridad)}</span>`;
}

function getEstadoIncidenciaBadge(estado) {
  const labels = {
    ABIERTA: 'Abierta',
    EN_PROGRESO: 'En Progreso',
    RESUELTA: 'Resuelta',
    CERRADA: 'Cerrada'
  };
  const modifierMap = {
    ABIERTA: 'abierta',
    EN_PROGRESO: 'progreso',
    RESUELTA: 'resuelta',
    CERRADA: 'cerrada'
  };
  const modifier = modifierMap[estado] || 'abierta';
  return `<span class="badge badge--${modifier}">${escapeHtml(labels[estado] || estado)}</span>`;
}

// ============================================================================
// 1. CONTROLADOR DE VISTA: DASHBOARD
// ============================================================================
async function loadDashboard() {
  try {
    const stats = await api.dashboard.getStats();

    // Actualizar tarjetas de métricas
    document.getElementById('stat-instalaciones').textContent = stats.totales.instalaciones;
    document.getElementById('stat-equipos-total').textContent = stats.totales.equipos;
    document.getElementById('stat-equipos-operativos-text').textContent = 
      `${stats.equiposPorEstado.OPERATIVO || 0} operativos · ${stats.equiposPorEstado.EN_MANTENIMIENTO || 0} en mant.`;
    document.getElementById('stat-equipos-averiados').textContent = stats.equiposPorEstado.AVERIADO || 0;
    document.getElementById('stat-incidencias-activas').textContent = stats.totales.incidencias_activas;
    document.getElementById('stat-incidencias-criticas-text').textContent = 
      `${stats.totales.incidencias_criticas} de prioridad alta o crítica`;

    // Renderizar tabla de últimas incidencias
    const tbody = document.getElementById('tbody-dashboard-incidencias');
    if (!stats.ultimasIncidencias || stats.ultimasIncidencias.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="data-table__td">
            <div class="empty-state">
              <div class="empty-state__icon">✨</div>
              <div class="empty-state__title">No hay incidencias reportadas</div>
              <p class="empty-state__text">Todas las instalaciones y equipos funcionan con normalidad.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = stats.ultimasIncidencias.map(inc => `
      <tr class="data-table__row">
        <td class="data-table__td" style="white-space: nowrap;">${formatDate(inc.fecha_reporte)}</td>
        <td class="data-table__td"><strong>${escapeHtml(inc.instalacion_nombre)}</strong></td>
        <td class="data-table__td">${escapeHtml(inc.equipo_nombre)}</td>
        <td class="data-table__td">${escapeHtml(inc.titulo)}</td>
        <td class="data-table__td">${getPrioridadBadge(inc.prioridad)}</td>
        <td class="data-table__td">${getEstadoIncidenciaBadge(inc.estado)}</td>
      </tr>
    `).join('');

  } catch (error) {
    showToast(`Error al cargar métricas del panel: ${error.message}`, 'error');
  }
}

// ============================================================================
// 2. CONTROLADOR DE VISTA: INSTALACIONES
// ============================================================================
async function loadInstalaciones() {
  try {
    const instalaciones = await api.instalaciones.getAll();
    state.instalaciones = instalaciones;
    renderInstalacionesTable(instalaciones);
    populateInstalacionesSelects();
  } catch (error) {
    showToast(`Error al cargar instalaciones: ${error.message}`, 'error');
  }
}

function renderInstalacionesTable(instalaciones) {
  const tbody = document.getElementById('tbody-instalaciones');
  if (!instalaciones || instalaciones.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="data-table__td">
          <div class="empty-state">
            <div class="empty-state__icon">🏛️</div>
            <div class="empty-state__title">No hay instalaciones registradas</div>
            <p class="empty-state__text">Haga clic en "Nueva Instalación" para dar de alta el primer edificio o centro.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = instalaciones.map(inst => `
    <tr class="data-table__row">
      <td class="data-table__td">
        <strong>${escapeHtml(inst.nombre)}</strong>
      </td>
      <td class="data-table__td">${escapeHtml(inst.direccion)}</td>
      <td class="data-table__td"><span class="badge" style="background:#e0e7ff; color:#3730a3;">${escapeHtml(inst.tipo)}</span></td>
      <td class="data-table__td"><strong>${inst.total_equipos || 0}</strong> equipos</td>
      <td class="data-table__td">
        ${inst.incidencias_activas > 0 
          ? `<span class="badge badge--critica">${inst.incidencias_activas} activa(s)</span>` 
          : `<span class="badge badge--resuelta">Sin averías</span>`}
      </td>
      <td class="data-table__td data-table__td--actions">
        <button class="btn btn--outline btn--sm" data-action="ver-instalacion" data-id="${inst.id}">👁️ Ver</button>
        <button class="btn btn--outline btn--sm" data-action="editar-instalacion" data-id="${inst.id}">✏️ Editar</button>
        <button class="btn btn--danger btn--sm" data-action="eliminar-instalacion" data-id="${inst.id}">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function showInstalacionDetalle(id) {
  try {
    const data = await api.instalaciones.getById(id);
    const content = document.getElementById('modal-detalle-content');
    
    document.getElementById('modal-detalle-title').textContent = data.nombre;

    let equiposHtml = '';
    if (!data.equipos || data.equipos.length === 0) {
      equiposHtml = '<p class="empty-state__text" style="padding: 16px 0;">No hay equipos asignados a esta instalación.</p>';
    } else {
      equiposHtml = `
        <table class="data-table" style="margin-top: 12px;">
          <thead class="data-table__head">
            <tr>
              <th class="data-table__th">Equipo</th>
              <th class="data-table__th">Código Serie</th>
              <th class="data-table__th">Categoría</th>
              <th class="data-table__th">Estado</th>
            </tr>
          </thead>
          <tbody class="data-table__body">
            ${data.equipos.map(eq => `
              <tr class="data-table__row">
                <td class="data-table__td"><strong>${escapeHtml(eq.nombre)}</strong></td>
                <td class="data-table__td"><code>${escapeHtml(eq.codigo_serie)}</code></td>
                <td class="data-table__td">${escapeHtml(eq.tipo_equipo)}</td>
                <td class="data-table__td">${getEstadoEquipoBadge(eq.estado)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        <p><strong>📍 Dirección:</strong> ${escapeHtml(data.direccion)}</p>
        <p><strong>🏷️ Uso / Tipo:</strong> ${escapeHtml(data.tipo)}</p>
        <p><strong>📅 Fecha de Alta:</strong> ${formatDate(data.created_at)}</p>
      </div>
      <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 16px 0;">
      <h4 style="font-size: 1rem; font-weight: 700;">Equipos Instalados (${data.equipos ? data.equipos.length : 0})</h4>
      <div class="data-table-wrapper">${equiposHtml}</div>
    `;

    openModal('modal-detalle-instalacion');
  } catch (error) {
    showToast(`Error al obtener detalle de la instalación: ${error.message}`, 'error');
  }
}

// ============================================================================
// 3. CONTROLADOR DE VISTA: EQUIPOS
// ============================================================================
async function loadEquipos() {
  try {
    const instFilter = document.getElementById('filter-equipo-instalacion').value;
    const estadoFilter = document.getElementById('filter-equipo-estado').value;

    const filters = {};
    if (instFilter) filters.instalacion_id = instFilter;
    if (estadoFilter) filters.estado = estadoFilter;

    const equipos = await api.equipos.getAll(filters);
    state.equipos = equipos;
    renderEquiposTable(equipos);
    populateEquiposSelects();
  } catch (error) {
    showToast(`Error al cargar equipos: ${error.message}`, 'error');
  }
}

function renderEquiposTable(equipos) {
  const tbody = document.getElementById('tbody-equipos');
  if (!equipos || equipos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="data-table__td">
          <div class="empty-state">
            <div class="empty-state__icon">⚙️</div>
            <div class="empty-state__title">No hay equipos encontrados</div>
            <p class="empty-state__text">Ajuste los filtros o registre un nuevo equipo técnico.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = equipos.map(eq => `
    <tr class="data-table__row">
      <td class="data-table__td">
        <strong>${escapeHtml(eq.nombre)}</strong>
      </td>
      <td class="data-table__td"><code>${escapeHtml(eq.codigo_serie)}</code></td>
      <td class="data-table__td">${escapeHtml(eq.instalacion_nombre || '—')}</td>
      <td class="data-table__td">${escapeHtml(eq.tipo_equipo)}</td>
      <td class="data-table__td">${getEstadoEquipoBadge(eq.estado)}</td>
      <td class="data-table__td data-table__td--actions">
        <button class="btn btn--outline btn--sm" data-action="editar-equipo" data-id="${eq.id}">✏️ Editar</button>
        <button class="btn btn--danger btn--sm" data-action="eliminar-equipo" data-id="${eq.id}">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================================
// 4. CONTROLADOR DE VISTA: INCIDENCIAS
// ============================================================================
async function loadIncidencias() {
  try {
    const estadoFilter = document.getElementById('filter-incidencia-estado').value;
    const prioridadFilter = document.getElementById('filter-incidencia-prioridad').value;

    const filters = {};
    if (estadoFilter) filters.estado = estadoFilter;
    if (prioridadFilter) filters.prioridad = prioridadFilter;

    const incidencias = await api.incidencias.getAll(filters);
    state.incidencias = incidencias;
    renderIncidenciasTable(incidencias);
  } catch (error) {
    showToast(`Error al cargar incidencias: ${error.message}`, 'error');
  }
}

function renderIncidenciasTable(incidencias) {
  const tbody = document.getElementById('tbody-incidencias');
  if (!incidencias || incidencias.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="data-table__td">
          <div class="empty-state">
            <div class="empty-state__icon">🛠️</div>
            <div class="empty-state__title">No hay incidencias que coincidan</div>
            <p class="empty-state__text">No se encontraron averías con los filtros seleccionados.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = incidencias.map(inc => `
    <tr class="data-table__row">
      <td class="data-table__td" style="white-space: nowrap;">${formatDate(inc.fecha_reporte)}</td>
      <td class="data-table__td">
        <strong>${escapeHtml(inc.titulo)}</strong>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(inc.descripcion)}</p>
        ${inc.fecha_resolucion ? `<small style="color: #065f46;">✔ Resuelta el ${formatDate(inc.fecha_resolucion)}</small>` : ''}
      </td>
      <td class="data-table__td">
        <strong>${escapeHtml(inc.equipo_nombre)}</strong> (${escapeHtml(inc.equipo_codigo)})
        <div style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(inc.instalacion_nombre)}</div>
      </td>
      <td class="data-table__td">${getPrioridadBadge(inc.prioridad)}</td>
      <td class="data-table__td">${getEstadoIncidenciaBadge(inc.estado)}</td>
      <td class="data-table__td data-table__td--actions">
        ${['ABIERTA', 'EN_PROGRESO'].includes(inc.estado) ? `
          <button class="btn btn--outline btn--sm" data-action="resolver-incidencia" data-id="${inc.id}" title="Marcar como resuelta">✅ Resolver</button>
        ` : ''}
        <button class="btn btn--outline btn--sm" data-action="editar-incidencia" data-id="${inc.id}">✏️</button>
        <button class="btn btn--danger btn--sm" data-action="eliminar-incidencia" data-id="${inc.id}">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// Acción Rápida: Resolver Incidencia en un clic
async function resolverIncidenciaRapido(id) {
  try {
    const inc = state.incidencias.find(item => item.id === id);
    if (!inc) return;

    await api.incidencias.update(id, {
      equipo_id: inc.equipo_id,
      titulo: inc.titulo,
      descripcion: inc.descripcion,
      prioridad: inc.prioridad,
      estado: 'RESUELTA'
    });

    showToast(`Incidencia "${inc.titulo}" resuelta con éxito`, 'success');
    await loadIncidencias();
    await loadEquipos();
    await loadDashboard();
  } catch (error) {
    showToast(`Error al resolver incidencia: ${error.message}`, 'error');
  }
}

// ============================================================================
// 5. POBLACIÓN DE SELECTORES DEPENDIENTES
// ============================================================================
function populateInstalacionesSelects() {
  const selectFiltro = document.getElementById('filter-equipo-instalacion');
  const selectModal = document.getElementById('equipo-instalacion-id');

  const currentFiltroVal = selectFiltro.value;
  const currentModalVal = selectModal.value;

  const optionsHtml = state.instalaciones.map(inst => `
    <option value="${inst.id}">${escapeHtml(inst.nombre)} (${escapeHtml(inst.tipo)})</option>
  `).join('');

  selectFiltro.innerHTML = '<option value="">Todas las instalaciones</option>' + optionsHtml;
  selectModal.innerHTML = '<option value="">Seleccione una instalación...</option>' + optionsHtml;

  selectFiltro.value = currentFiltroVal;
  selectModal.value = currentModalVal;
}

function populateEquiposSelects() {
  const selectModalInc = document.getElementById('incidencia-equipo-id');
  const currentVal = selectModalInc.value;

  const optionsHtml = state.equipos.map(eq => `
    <option value="${eq.id}">[${escapeHtml(eq.instalacion_nombre)}] ${escapeHtml(eq.nombre)} (${escapeHtml(eq.codigo_serie)})</option>
  `).join('');

  selectModalInc.innerHTML = '<option value="">Seleccione el equipo afectado...</option>' + optionsHtml;
  selectModalInc.value = currentVal;
}

// ============================================================================
// 6. GESTIÓN DE FORMULARIOS Y ENVÍO ASÍNCRONO
// ============================================================================
function setupForms() {
  // --- Formulario Instalación ---
  const formInst = document.getElementById('form-instalacion');
  formInst.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-instalacion');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const id = document.getElementById('instalacion-id').value;
    const payload = {
      nombre: document.getElementById('instalacion-nombre').value.trim(),
      direccion: document.getElementById('instalacion-direccion').value.trim(),
      tipo: document.getElementById('instalacion-tipo').value.trim()
    };

    try {
      if (id) {
        await api.instalaciones.update(id, payload);
        showToast('Instalación actualizada correctamente', 'success');
      } else {
        await api.instalaciones.create(payload);
        showToast('Instalación creada correctamente', 'success');
      }
      closeModal('modal-instalacion');
      await loadInstalaciones();
      await loadDashboard();
    } catch (error) {
      showToast(`Error al guardar: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Instalación';
    }
  });

  // --- Formulario Equipo ---
  const formEq = document.getElementById('form-equipo');
  formEq.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-equipo');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const id = document.getElementById('equipo-id').value;
    const payload = {
      instalacion_id: document.getElementById('equipo-instalacion-id').value,
      nombre: document.getElementById('equipo-nombre').value.trim(),
      codigo_serie: document.getElementById('equipo-codigo-serie').value.trim(),
      tipo_equipo: document.getElementById('equipo-tipo').value.trim(),
      estado: document.getElementById('equipo-estado').value
    };

    try {
      if (id) {
        await api.equipos.update(id, payload);
        showToast('Equipo actualizado correctamente', 'success');
      } else {
        await api.equipos.create(payload);
        showToast('Equipo registrado correctamente', 'success');
      }
      closeModal('modal-equipo');
      await loadEquipos();
      await loadInstalaciones();
      await loadDashboard();
    } catch (error) {
      showToast(`Error al guardar equipo: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Equipo';
    }
  });

  // --- Formulario Incidencia ---
  const formInc = document.getElementById('form-incidencia');
  formInc.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-incidencia');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const id = document.getElementById('incidencia-id').value;
    const payload = {
      equipo_id: document.getElementById('incidencia-equipo-id').value,
      titulo: document.getElementById('incidencia-titulo').value.trim(),
      descripcion: document.getElementById('incidencia-descripcion').value.trim(),
      prioridad: document.getElementById('incidencia-prioridad').value,
      estado: document.getElementById('incidencia-estado').value
    };

    try {
      if (id) {
        await api.incidencias.update(id, payload);
        showToast('Incidencia actualizada correctamente', 'success');
      } else {
        await api.incidencias.create(payload);
        showToast('Avería reportada con éxito', 'success');
      }
      closeModal('modal-incidencia');
      await loadIncidencias();
      await loadEquipos();
      await loadInstalaciones();
      await loadDashboard();
    } catch (error) {
      showToast(`Error al registrar incidencia: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Registrar Incidencia';
    }
  });

  // --- Botón de confirmación de borrado en modal ---
  const btnConfirmDelete = document.getElementById('btn-confirmar-eliminar');
  btnConfirmDelete.addEventListener('click', async () => {
    if (typeof state.pendingDeleteAction === 'function') {
      btnConfirmDelete.disabled = true;
      try {
        await state.pendingDeleteAction();
        closeModal('modal-confirmar');
      } catch (err) {
        showToast(`Error al eliminar: ${err.message}`, 'error');
      } finally {
        btnConfirmDelete.disabled = false;
        state.pendingDeleteAction = null;
      }
    }
  });
}

// ============================================================================
// 7. DELEGACIÓN DE EVENTOS EN TABLAS Y BOTONES
// ============================================================================
function setupTableActions() {
  // Delegación de eventos en tabla Instalaciones
  document.getElementById('tbody-instalaciones').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);

    if (action === 'ver-instalacion') {
      showInstalacionDetalle(id);
    } else if (action === 'editar-instalacion') {
      const inst = state.instalaciones.find(i => i.id === id);
      if (inst) {
        document.getElementById('modal-instalacion-title').textContent = 'Editar Instalación';
        document.getElementById('instalacion-id').value = inst.id;
        document.getElementById('instalacion-nombre').value = inst.nombre;
        document.getElementById('instalacion-direccion').value = inst.direccion;
        document.getElementById('instalacion-tipo').value = inst.tipo;
        openModal('modal-instalacion');
      }
    } else if (action === 'eliminar-instalacion') {
      const inst = state.instalaciones.find(i => i.id === id);
      const nombre = inst ? inst.nombre : `ID ${id}`;
      requestDeleteConfirmation(
        `¿Eliminar la instalación "${nombre}"? ADVERTENCIA: Se eliminarán en cascada todos sus equipos e incidencias asociadas.`,
        async () => {
          await api.instalaciones.delete(id);
          showToast(`Instalación "${nombre}" eliminada`, 'success');
          await loadInstalaciones();
          await loadEquipos();
          await loadIncidencias();
          await loadDashboard();
        }
      );
    }
  });

  // Delegación de eventos en tabla Equipos
  document.getElementById('tbody-equipos').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);

    if (action === 'editar-equipo') {
      const eq = state.equipos.find(item => item.id === id);
      if (eq) {
        document.getElementById('modal-equipo-title').textContent = 'Editar Equipo Técnico';
        document.getElementById('equipo-id').value = eq.id;
        document.getElementById('equipo-instalacion-id').value = eq.instalacion_id;
        document.getElementById('equipo-nombre').value = eq.nombre;
        document.getElementById('equipo-codigo-serie').value = eq.codigo_serie;
        document.getElementById('equipo-tipo').value = eq.tipo_equipo;
        document.getElementById('equipo-estado').value = eq.estado;
        openModal('modal-equipo');
      }
    } else if (action === 'eliminar-equipo') {
      const eq = state.equipos.find(item => item.id === id);
      const nombre = eq ? eq.nombre : `ID ${id}`;
      requestDeleteConfirmation(
        `¿Eliminar el equipo "${nombre}"? Se borrará también su historial de averías asociado.`,
        async () => {
          await api.equipos.delete(id);
          showToast(`Equipo "${nombre}" eliminado`, 'success');
          await loadEquipos();
          await loadIncidencias();
          await loadDashboard();
        }
      );
    }
  });

  // Delegación de eventos en tabla Incidencias
  document.getElementById('tbody-incidencias').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);

    if (action === 'resolver-incidencia') {
      resolverIncidenciaRapido(id);
    } else if (action === 'editar-incidencia') {
      const inc = state.incidencias.find(item => item.id === id);
      if (inc) {
        document.getElementById('modal-incidencia-title').textContent = 'Editar Incidencia';
        document.getElementById('incidencia-id').value = inc.id;
        document.getElementById('incidencia-equipo-id').value = inc.equipo_id;
        document.getElementById('incidencia-titulo').value = inc.titulo;
        document.getElementById('incidencia-descripcion').value = inc.descripcion;
        document.getElementById('incidencia-prioridad').value = inc.prioridad;
        document.getElementById('incidencia-estado').value = inc.estado;
        openModal('modal-incidencia');
      }
    } else if (action === 'eliminar-incidencia') {
      const inc = state.incidencias.find(item => item.id === id);
      const titulo = inc ? inc.titulo : `ID ${id}`;
      requestDeleteConfirmation(
        `¿Eliminar definitivamente la incidencia "${titulo}"?`,
        async () => {
          await api.incidencias.delete(id);
          showToast(`Incidencia "${titulo}" eliminada`, 'success');
          await loadIncidencias();
          await loadEquipos();
          await loadDashboard();
        }
      );
    }
  });
}

// ============================================================================
// 8. NAVEGACIÓN Y CONFIGURACIÓN INICIAL
// ============================================================================
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tabs__btn');
  const sections = document.querySelectorAll('.view-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.dataset.view;
      if (targetView === state.currentView) return;

      // Actualizar estado de botones
      tabs.forEach(t => {
        t.classList.remove('nav-tabs__btn--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('nav-tabs__btn--active');
      tab.setAttribute('aria-selected', 'true');

      // Actualizar secciones
      sections.forEach(sec => {
        sec.classList.remove('view-section--active');
        sec.setAttribute('hidden', '');
      });

      const activeSection = document.getElementById(`view-${targetView}`);
      if (activeSection) {
        activeSection.classList.add('view-section--active');
        activeSection.removeAttribute('hidden');
      }

      state.currentView = targetView;

      // Cargar datos según la pestaña activa
      if (targetView === 'dashboard') loadDashboard();
      if (targetView === 'instalaciones') loadInstalaciones();
      if (targetView === 'equipos') loadEquipos();
      if (targetView === 'incidencias') loadIncidencias();
    });
  });

  // Botón directo desde el dashboard para ir a incidencias
  document.getElementById('btn-goto-incidencias').addEventListener('click', () => {
    document.getElementById('tab-incidencias').click();
  });

  // Botón refrescar dashboard
  document.getElementById('btn-refresh-dashboard').addEventListener('click', () => {
    loadDashboard();
    showToast('Datos actualizados', 'info');
  });

  // Botones de alta para abrir modales limpios
  document.getElementById('btn-nueva-instalacion').addEventListener('click', () => {
    document.getElementById('modal-instalacion-title').textContent = 'Nueva Instalación';
    document.getElementById('form-instalacion').reset();
    document.getElementById('instalacion-id').value = '';
    openModal('modal-instalacion');
  });

  document.getElementById('btn-nuevo-equipo').addEventListener('click', () => {
    document.getElementById('modal-equipo-title').textContent = 'Nuevo Equipo Técnico';
    document.getElementById('form-equipo').reset();
    document.getElementById('equipo-id').value = '';
    populateInstalacionesSelects();
    openModal('modal-equipo');
  });

  document.getElementById('btn-nueva-incidencia').addEventListener('click', () => {
    document.getElementById('modal-incidencia-title').textContent = 'Reportar Avería o Incidencia';
    document.getElementById('form-incidencia').reset();
    document.getElementById('incidencia-id').value = '';
    populateEquiposSelects();
    openModal('modal-incidencia');
  });

  // Filtros reactivos
  document.getElementById('filter-equipo-instalacion').addEventListener('change', loadEquipos);
  document.getElementById('filter-equipo-estado').addEventListener('change', loadEquipos);
  document.getElementById('filter-incidencia-estado').addEventListener('change', loadIncidencias);
  document.getElementById('filter-incidencia-prioridad').addEventListener('change', loadIncidencias);
}

// --- Inicialización al cargar el DOM ---
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupModalEventListeners();
  setupForms();
  setupTableActions();

  // Carga inicial coordinada de todas las entidades
  await Promise.all([
    loadInstalaciones(),
    loadEquipos(),
    loadIncidencias(),
    loadDashboard()
  ]);
});
