---
name: interfaces-crud
description: >-
  Guía de buenas prácticas y patrones de diseño para el desarrollo de interfaces de usuario CRUD interactivas con HTML5 semántico, CSS3 moderno y JavaScript Vanilla (sin frameworks). Úsalo al diseñar o implementar vistas, formularios, tablas y tarjetas dinámicas, validaciones en cliente, accesibilidad, feedback visual y consumo de APIs mediante Fetch.
---

# Skill: Buenas Prácticas para Interfaces CRUD (HTML5 + CSS3 + Vanilla JavaScript)

Esta Skill define los principios y directrices técnicas para construir interfaces web dinámicas, accesibles y mantenibles en el frontend utilizando exclusivamente tecnologías web nativas (sin frameworks como React, Vue o Angular).

---

## 1. Estructura Semántica HTML5 y Accesibilidad (a11y)

1. **Jerarquía y elementos semánticos:**
   * Utilizar `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` en lugar de `<div>` anidados indiscriminados.
   * Encabezados ordenados jerárquicamente (`<h1>`, `<h2>`, `<h3>`).

2. **Formularios accesibles:**
   * Cada campo de entrada (`<input>`, `<select>`, `<textarea>`) debe estar explícitamente vinculado a una etiqueta `<label>` mediante el atributo `for` coincidiendo con el `id` del input.
   * Utilizar atributos nativos de validación: `required`, `minlength`, `maxlength`, `pattern`, `type="text|number|date"`.
   * Agrupar controles relacionados con `<fieldset>` y `<legend>` cuando sea pertinente.

3. **Navegación e interacción:**
   * Usar botones reales (`<button type="button">` o `<button type="submit">`) para acciones interactivas, nunca elementos `<div>` o `<span>` con evento de clic.
   * Estados interactivos visibles (`:hover`, `:focus-visible`, `:active`) con contraste suficiente para navegación mediante teclado.

---

## 2. CSS3 Moderno y Diseño Responsivo

1. **Variables CSS (Custom Properties):**
   * Centralizar paleta de colores, tipografías, espaciados y radios de borde en `:root`.
   * Colores de estado estandarizados:
     * Operativo / Éxito: Verde (ej. `#10b981`).
     * Averiado / Crítico: Rojo (ej. `#ef4444`).
     * En Mantenimiento / Progreso: Amarillo/Naranja (ej. `#f59e0b`).
     * Información / Neutro: Azul/Gris (ej. `#3b82f6` / `#6b7280`).

2. **Diseño flexible y adaptable:**
   * Implementar layouts usando CSS Grid para paneles/dashboards y Flexbox para barras de navegación, botones y tarjetas.
   * Media queries limpias (`@media (max-width: 768px)`) que aseguren legibilidad en pantallas móviles y de escritorio.
   * En tablas de datos, habilitar contenedor con `overflow-x: auto` o adaptar a formato de tarjetas en dispositivos estrechos.

3. **Componentes visuales clave:**
   * **Badges / Etiquetas:** Elementos compactos con fondo sutil y texto coloreado para reflejar `estado` y `prioridad`.
   * **Modales / Diálogos:** Capas superpuestas centradas con fondo semitransparente (backdrop) y botón de cierre claro.
   * **Mensajes flotantes (Toast):** Alertas visuales temporales no invasivas para confirmar éxito o alertar de errores.

---

## 3. Arquitectura y Código JavaScript Vanilla (ES6+)

1. **Separación de responsabilidades:**
   * `api.js`: Módulo aislado que centraliza todas las llamadas HTTP (Fetch) hacia la API REST.
   * `app.js` / módulos de vista: Controladores del DOM que gestionan eventos, renderizan plantillas y manipulan la interfaz.

2. **Gestión de Formularios (Creación y Edición):**
   * Prevenir siempre la recarga tradicional con `e.preventDefault()`.
   * Reutilizar un único formulario modal para **Creación** y **Edición**, diferenciando el modo mediante un campo oculto (`<input type="hidden" id="edit-id">`) y cambiando el texto del botón y título.
   * Limpiar y restablecer formularios tras un guardado exitoso (`form.reset()`).

3. **Confirmación en Operaciones Críticas (Eliminación):**
   * Antes de ejecutar peticiones `DELETE`, solicitar confirmación explícita al usuario (mediante modal o diálogo de confirmación) indicando el nombre del elemento que se va a eliminar.

4. **Prevención de XSS y manipulación segura del DOM:**
   * Evitar concatenar texto de usuario directamente en `innerHTML`.
   * Emplear `element.textContent`, `element.setAttribute()` o funciones de escape seguras al inyectar cadenas dinámicas en el DOM.

---

## 4. Comunicación con la API mediante Fetch API

1. **Patrón asíncrono con `async/await`:**
   * Todas las llamadas a la API deben estructurarse con `try...catch` para manejar fallos de red o errores HTTP.

2. **Manejo estricto de respuestas y cabeceras:**
   ```javascript
   async function apiRequest(url, options = {}) {
     const defaultHeaders = {
       'Content-Type': 'application/json',
       'Accept': 'application/json'
     };

     const response = await fetch(url, {
       ...options,
       headers: { ...defaultHeaders, ...options.headers }
     });

     const data = await response.json();

     if (!response.ok || !data.success) {
       throw new Error(data.error || `Error HTTP ${response.status}`);
     }

     return data.data;
   }
   ```

3. **Feedback visual y Estados de Carga:**
   * Deshabilitar botones de envío (`btn.disabled = true`) y mostrar indicador de carga durante peticiones asíncronas para evitar dobles envíos.
   * Mostrar mensajes de estado vacío (Empty State) cuando una tabla o lista no tenga registros ("No hay incidencias registradas").
   * Mostrar notificaciones flotantes de éxito ("Instalación creada correctamente") o error detallado tras cada operación.
