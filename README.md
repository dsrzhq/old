# Bitácora · demo navegable

Demostración pública del prototipo de **BITÁCORA** — la app de control de obra, inversión,
costo unitario y nómina para un arquitecto-constructor de Ontario.

**En vivo:** <https://dsrzhq.github.io/old/>

> **No es la app real.** No hay backend, no hay login y no se mueve dinero: la cámara y la IA
> están simuladas y **todos los datos son de ejemplo** (2 obras ficticias de Ontario, CAD).
> El aviso "Demo · datos de ejemplo" aparece en la esquina inferior izquierda.

## Qué contiene

Sitio estático, sin build ni dependencias: `index.html` + `assets/` (HTML, CSS y JS clásico).
6 pantallas navegables por hash:

| Pantalla | URL |
|---|---|
| Hoy | [`#/hoy`](https://dsrzhq.github.io/old/#/hoy) |
| Captura de factura | [`#/captura`](https://dsrzhq.github.io/old/#/captura) |
| Por clasificar | [`#/clasificar`](https://dsrzhq.github.io/old/#/clasificar) |
| Obra (presupuesto vs real) | [`#/obra`](https://dsrzhq.github.io/old/#/obra) |
| Nómina de la semana | [`#/nomina`](https://dsrzhq.github.io/old/#/nomina) |
| Margen | [`#/margen`](https://dsrzhq.github.io/old/#/margen) |

Diseño con tokens del sistema "Náutica" (azul marino `#04224D`, rojo `#ED1C24`), tipografías
Archivo Black / Montserrat / Inter y criterios de accesibilidad AA. Importes en centavos
enteros; el formato se aplica solo al presentar.

## Para verlo en el iPhone

Abrir la URL en **Safari** → Compartir → **Agregar a pantalla de inicio**.

## Qué no está en este repositorio

El documento de requerimientos, la matriz de requisitos, el modelo de datos, las preguntas de
validación y la propuesta comercial son material de trabajo **confidencial** y no se publican.
Este repositorio contiene únicamente el prototipo de demostración.

---

Preparado por DSRZ · 30 de octubre de 2026 · Dominio de la beta previsto: `old.dsrzhq.com`
