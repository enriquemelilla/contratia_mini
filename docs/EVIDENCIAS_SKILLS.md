# Evidencias de Creación y Utilización de Skills Personalizadas (Requisito 2)

**Proyecto:** Contratia Mini  
**Materia / Módulo:** Desarrollo de Aplicaciones Web (DAW)  
**Fecha:** 23 de noviembre de 2026  
**Requisito evaluado:** Requisito 2 - *Creación y utilización de al menos una Skill personalizada para asistir en el desarrollo con Antigravity*.

---

## 1. Registro de Detección y Acción Correctora

Durante la revisión del enunciado tras finalizar la **Fase 1** (Estructura del Proyecto y Base de Datos), se identificó que el **Requisito 2** no había sido contemplado en la planificación inicial. 

* **Acción adoptada:** Se incorporó de inmediato la **Fase 1B: Creación de Skills Personalizadas** antes de abordar la Fase 2 (Backend y API REST).
* **Decisión técnica:** En lugar de crear únicamente una Skill mínima, se crearon **dos Skills especializadas y reutilizables**, una para cada capa del ciclo de desarrollo restante (Backend REST y Frontend Vanilla).

---

## 2. Ubicación y Descubrimiento en Antigravity

De acuerdo con la documentación y arquitectura oficial del sistema de personalización de Antigravity (`agy-customizations`), las Skills a nivel de proyecto deben ubicarse en la raíz del repositorio bajo el directorio `.agents/skills/`:

```text
contratia_mini/
├── .agents/
│   └── skills/
│       ├── api-rest/
│       │   └── SKILL.md            <-- Skill para Backend y API REST
│       └── interfaces-crud/
│           └── SKILL.md            <-- Skill para Frontend Vanilla e Interfaces CRUD
├── data/
├── docs/
│   └── EVIDENCIAS_SKILLS.md        <-- Este documento de evidencias
├── src/
├── package.json
└── PLAN.md
```

### Justificación de la ruta elegida:
* **Ámbito del proyecto (Workspace Scope):** Al residir en `.agents/skills/` dentro del repositorio, las skills se versionan en Git junto con el código fuente, garantizando que cualquier desarrollador (o el profesor al corregir la entrega) disponga de las mismas directrices y herramientas sin necesidad de configuraciones globales en su máquina.
* **Descubrimiento automático y Divulgación Progresiva (Progressive Disclosure):** Antigravity inspecciona la carpeta `.agents/skills/` al iniciar la sesión o evaluar el contexto, leyendo el bloque de metadatos YAML (*frontmatter*) de cada `SKILL.md` para activarlas dinámicamente cuando el flujo de trabajo lo requiera.

---

## 3. Ficha Técnica de las Skills Creadas

### 🔹 Skill 1: `api-rest`
* **Ruta:** `.agents/skills/api-rest/SKILL.md`
* **Identificador (`name`):** `api-rest`
* **Propósito:** Estandarizar el diseño, implementación y seguridad de endpoints HTTP con Node.js, Express y SQLite.
* **Directrices establecidas en la Skill:**
  1. Nomenclatura RESTful estricta (recursos en plural, endpoints semánticos).
  2. Uso riguroso de verbos HTTP (`GET`, `POST`, `PUT`, `DELETE`) y códigos de estado (`200`, `201`, `400`, `404`, `409`, `500`).
  3. Formato envoltorio uniforme de respuestas JSON (`{ success, data, error }`).
  4. Prevención absoluta de inyección SQL mediante sentencias preparadas y parámetros vinculados (`prepare(?).run(...)`).
  5. Manejo de integridad referencial SQLite (`PRAGMA foreign_keys = ON;`, captura de errores de clave foránea y unicidad).
  6. Transacciones atómicas (`BEGIN` / `COMMIT` / `ROLLBACK`) para operaciones acopladas (ej. avería crítica actualiza estado de equipo a `AVERIADO`).
  7. Middleware centralizado de gestión de errores y rutas 404 en Express.

### 🔹 Skill 2: `interfaces-crud`
* **Ruta:** `.agents/skills/interfaces-crud/SKILL.md`
* **Identificador (`name`):** `interfaces-crud`
* **Propósito:** Estandarizar la construcción de pantallas web accesibles, interactivas y responsivas usando exclusivamente HTML5, CSS3 y JavaScript nativo.
* **Directrices establecidas en la Skill:**
  1. Estructura HTML5 semántica y accesibilidad (labels vinculados, botones con tipo explícito, estados de foco y teclado).
  2. CSS modular y responsive con variables CSS (`:root`), paleta estandarizada para estados (operativo en verde, averiado en rojo, en mantenimiento en amarillo) y diseño responsive con Flexbox y CSS Grid.
  3. Arquitectura cliente desacoplada: módulo `api.js` para consumo de red vs `app.js` para control del DOM.
  4. Patrón Fetch con `async/await`, control de `res.ok` y deshabilitación de botones para prevenir dobles envíos.
  5. Formularios reutilizables para creación y edición (`e.preventDefault()`, reseteo limpio).
  6. Confirmación previa para operaciones destructivas (`DELETE`).
  7. Feedback visual continuo al usuario mediante notificaciones temporales tipo Toast y estados vacíos ("Empty States").

---

## 4. Evidencias de Validación Técnica

Se ha verificado la correcta sintaxis y formato de los archivos mediante la siguiente comprobación automatizada:

1. **Frontmatter YAML válido:** Ambos archivos cuentan con los campos obligatorios `name` (en minúsculas y con guiones) y `description` descriptivo en tercera persona.
2. **Estructura de encabezados Markdown:** Jerarquía clara (`#`, `##`, `###`) con ejemplos de código en JavaScript, SQL y CSS.
3. **Persistencia en el control de versiones:** El directorio `.agents/` no está excluido en el `.gitignore`, permitiendo su trazabilidad completa en Git.

---

## 5. Plan de Utilización de las Skills en las Siguientes Fases

| Fase del Proyecto | Skill Utilizada | Aplicación Concreta |
| :--- | :--- | :--- |
| **Fase 2: Backend y API REST** | `api-rest` | Los controladores de instalaciones, equipos e incidencias, así como el middleware de Express, se implementarán siguiendo al pie de la letra las pautas de códigos HTTP, respuestas JSON, transacciones SQLite y prevención de inyección SQL de esta Skill. |
| **Fase 3: Interfaz de Usuario (HTML/CSS)** | `interfaces-crud` | El diseño de `index.html` y los estilos CSS se crearán aplicando las directrices de accesibilidad semántica, paleta de colores de estados y componentes visuales (tablas, cards, badges, modales). |
| **Fase 4: Integración Cliente-Servidor** | `interfaces-crud` y `api-rest` | Los scripts de JavaScript Vanilla (`api.js`, `app.js`) consumirán los endpoints utilizando el cliente Fetch robusto, manejo de errores, toasts y confirmaciones destructivas definidos en las Skills. |
| **Fase 5: Pruebas y Validación** | Ambas | La lista de comprobación de criterios de aceptación contrastará el código final con las directrices de ambas Skills. |
