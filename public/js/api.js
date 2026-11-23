/**
 * ============================================================================
 * CONTRATIA MINI - CLIENTE API REST (Fetch Client)
 * Guiado por: .agents/skills/api-rest/SKILL.md e interfaces-crud/SKILL.md
 * ============================================================================
 */

const API_BASE = '/api';

/**
 * Función centralizada para realizar peticiones HTTP a la API REST
 * @param {string} endpoint - Ruta del endpoint (ej. '/instalaciones')
 * @param {object} options - Opciones de fetch (method, body, headers...)
 * @returns {Promise<any>} - Datos desempaquetados del envelope { success, data }
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  // Serializar body si se pasa un objeto
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const result = await response.json().catch(() => null);

    if (!response.ok || !result || result.success === false) {
      const errorMessage = (result && result.error) || `Error HTTP ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = result ? result.details : null;
      throw error;
    }

    return result.data;
  } catch (error) {
    console.error(`[API Error] en ${options.method || 'GET'} ${url}:`, error.message);
    throw error;
  }
}

/**
 * Métodos estructurados por entidad
 */
export const api = {
  // --- Dashboard ---
  dashboard: {
    getStats: () => apiRequest('/dashboard/stats')
  },

  // --- Instalaciones ---
  instalaciones: {
    getAll: () => apiRequest('/instalaciones'),
    getById: (id) => apiRequest(`/instalaciones/${id}`),
    create: (data) => apiRequest('/instalaciones', {
      method: 'POST',
      body: data
    }),
    update: (id, data) => apiRequest(`/instalaciones/${id}`, {
      method: 'PUT',
      body: data
    }),
    delete: (id) => apiRequest(`/instalaciones/${id}`, {
      method: 'DELETE'
    })
  },

  // --- Equipos ---
  equipos: {
    getAll: (filters = {}) => {
      const query = new URLSearchParams();
      if (filters.instalacion_id) query.append('instalacion_id', filters.instalacion_id);
      if (filters.estado) query.append('estado', filters.estado);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return apiRequest(`/equipos${qs}`);
    },
    getById: (id) => apiRequest(`/equipos/${id}`),
    create: (data) => apiRequest('/equipos', {
      method: 'POST',
      body: data
    }),
    update: (id, data) => apiRequest(`/equipos/${id}`, {
      method: 'PUT',
      body: data
    }),
    delete: (id) => apiRequest(`/equipos/${id}`, {
      method: 'DELETE'
    })
  },

  // --- Incidencias ---
  incidencias: {
    getAll: (filters = {}) => {
      const query = new URLSearchParams();
      if (filters.estado) query.append('estado', filters.estado);
      if (filters.prioridad) query.append('prioridad', filters.prioridad);
      if (filters.equipo_id) query.append('equipo_id', filters.equipo_id);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return apiRequest(`/incidencias${qs}`);
    },
    getById: (id) => apiRequest(`/incidencias/${id}`),
    create: (data) => apiRequest('/incidencias', {
      method: 'POST',
      body: data
    }),
    update: (id, data) => apiRequest(`/incidencias/${id}`, {
      method: 'PUT',
      body: data
    }),
    delete: (id) => apiRequest(`/incidencias/${id}`, {
      method: 'DELETE'
    })
  }
};
