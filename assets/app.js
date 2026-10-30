/* ============================================================================
   BITÁCORA · APP (vanilla JS, sin frameworks, sin build, sin módulos ES)
   - Rutas por hash: #/hoy, #/captura, #/clasificar, #/obra, #/nomina, #/margen
   - Shell único: 5 destinos + FAB de 64 px (cap. 6.2)
   - Toda cifra se calcula en centavos enteros y se formatea al presentar.
   - Los datos se insertan escapados (esc) para no inyectar HTML.
   - La IA propone y Diego confirma: nada se borra, todo tiene Deshacer.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.BitacoraData;
  var F = window.BitacoraFormato;
  var P = D.parametros;

  var phone = document.getElementById('phone');
  var app = document.getElementById('app');
  var tabbar = document.getElementById('tabbar');
  var fab = document.getElementById('fab');
  var sheetRoot = document.getElementById('sheet-root');
  var toastRoot = document.getElementById('toast-root');
  var offlineBanner = document.getElementById('offline-banner');
  var offlineTexto = document.getElementById('offline-texto');

  var MODO_QA = /[?&]qa=1/.test(location.search);
  var RUTAS = ['hoy', 'captura', 'clasificar', 'obra', 'nomina', 'margen'];
  var SEMAFORO = {
    ok: { palabra: 'Vas bien', icono: 'check', clase: 'ok' },
    ojo: { palabra: 'Ojo', icono: 'ojo', clase: 'warn' },
    alerta: { palabra: 'Alerta', icono: 'alerta', clase: 'danger' }
  };
  var DESTINOS = [
    { id: 'hoy', etiqueta: 'Hoy', icono: 'hoy', ruta: '#/hoy' },
    { id: 'obras', etiqueta: 'Obras', icono: 'obras', ruta: '#/obra' },
    { id: 'gastos', etiqueta: 'Gastos', icono: 'gastos', ruta: '#/clasificar' },
    { id: 'equipo', etiqueta: 'Equipo', icono: 'equipo', ruta: '#/nomina' },
    { id: 'mas', etiqueta: 'Más', icono: 'mas', ruta: null }
  ];
  var DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  /* -------------------------------------------------------------- utilidades */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ico(nombre, clase) {
    return '<svg class="' + (clase || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + nombre + '"></use></svg>';
  }
  function dinero(cents) { return F.dinero(cents); }
  function dineroSigno(cents) { return (cents > 0 ? '+' : '') + F.dinero(cents); }
  function pct(ppm, opciones) { return F.porcentaje(ppm, opciones); }
  function pctDe(parte, base, opciones) { return F.porcentajeDe(parte, base, opciones); }
  function moneyPlain(cents) { return F.dinero(cents).replace('$', ''); }
  function iniciales(nombre) {
    var partes = String(nombre).trim().split(/\s+/);
    return (partes[0].charAt(0) + (partes[1] ? partes[1].charAt(0) : '')).toUpperCase();
  }
  function buscarObra(id) {
    for (var i = 0; i < D.obras.length; i++) { if (D.obras[i].id === id) return D.obras[i]; }
    return null;
  }
  function buscarPartida(obraId, partidaId) {
    var o = buscarObra(obraId);
    if (!o) return null;
    for (var i = 0; i < o.partidas.length; i++) { if (o.partidas[i].id === partidaId) return o.partidas[i]; }
    return null;
  }
  function nombrePartida(obraId, partidaId) {
    var p = buscarPartida(obraId, partidaId);
    return p ? p.nombre : 'Sin partida';
  }
  function desvioPpm(p) {
    if (!p.presupuestoCents) return 0;
    return Math.round(((p.gastadoCents - p.presupuestoCents) * 1000000) / p.presupuestoCents);
  }
  function partidasPorDesvio(o) {
    return o.partidas.slice().sort(function (a, b) { return desvioPpm(b) - desvioPpm(a); });
  }
  function formatoHoras(mitades) { return String(mitades / 2).replace('.', ','); }
  function hhmm(mitades) { return formatoHoras(mitades) + ' h'; }

  /* ---------------------------------------------------------------- estado */
  var estado = {
    ruta: 'hoy',
    params: {},
    offline: false,
    pendientes: 1,
    panel: null,
    ultimoFoco: null,
    toast: null,
    clasificar: { resueltas: {} },
    nomina: {
      personas: clonarPersonas(),
      metodo: 'e-transfer',
      pagada: false
    },
    captura: {
      fase: 'camara',
      errorSim: false,
      sinSenal: false,
      guardada: false,
      proveedor: 'Home Depot Canada',
      fecha: D.hoy.fecha,
      numero: 'HD-90112',
      obraId: 'maple',
      partidaId: 'estructura',
      subtotalCents: 107280,
      totalCents: 121226,
      catalogo: null,
      confianzaBaja: 'total'
    }
  };

  function clonarPersonas() {
    return D.nomina.personas.map(function (p) {
      var c = {};
      Object.keys(p).forEach(function (k) { c[k] = p[k]; });
      if (p.modalidad === 'hora') {
        c.horasMitades = p.horasPorDia.map(function (h) { return Math.round(h * 2); });
      } else {
        c.cantidadMitades = Math.round(p.cantidad * 2);
      }
      return c;
    });
  }
  function personaPorId(id) {
    var lista = estado.nomina.personas;
    for (var i = 0; i < lista.length; i++) { if (lista[i].id === id) return lista[i]; }
    return null;
  }
  function buscoFactura(id) {
    for (var i = 0; i < D.facturas.length; i++) { if (D.facturas[i].id === id) return D.facturas[i]; }
    return null;
  }

  /* ------------------------------------------------------- cálculos (nómina) */
  function calcPersona(p) {
    if (p.modalidad === 'hora') {
      var totalMit = p.horasMitades.reduce(function (a, b) { return a + b; }, 0);
      var lim = P.overtime.horasSemanales * 2;
      var regMit = Math.min(totalMit, lim);
      var otMit = Math.max(0, totalMit - lim);
      var bruto = Math.round((p.tarifaHoraCents * (regMit * 2 + otMit * 3)) / 4);
      return { brutoCents: bruto, horasMitades: totalMit, regMit: regMit, otMit: otMit };
    }
    var brutoU = Math.round((p.tarifaUnidadCents * p.cantidadMitades) / 2);
    return { brutoCents: brutoU, horasMitades: 0, regMit: 0, otMit: 0 };
  }
  function calcNomina() {
    var brutoTotal = 0;
    var brutoEmpleados = 0;
    var bloqueado = null;
    var pagable = 0;
    var cantidadPagable = 0;
    var detalle = [];
    estado.nomina.personas.forEach(function (p) {
      var c = calcPersona(p);
      detalle.push({ persona: p, calc: c });
      brutoTotal += c.brutoCents;
      if (p.empleado) brutoEmpleados += c.brutoCents;
      if (p.wsibVigente) { pagable += c.brutoCents; cantidadPagable++; } else { bloqueado = p; }
    });
    var carga = P.cargaPatronal.map(function (t) {
      return { id: t.id, nombre: t.nombre, ppm: t.ppm, montoCents: Math.round((brutoEmpleados * t.ppm) / 1000000) };
    });
    var cargaTotal = carga.reduce(function (a, b) { return a + b.montoCents; }, 0);
    return {
      detalle: detalle,
      brutoTotalCents: brutoTotal,
      brutoEmpleadosCents: brutoEmpleados,
      carga: carga,
      cargaTotalCents: cargaTotal,
      costoTotalCents: brutoTotal + cargaTotal,
      bloqueado: bloqueado,
      pagableCents: pagable,
      cantidadPagable: cantidadPagable,
      cantidadTotal: estado.nomina.personas.length,
      horasExtraMitades: detalle.reduce(function (a, d) { return a + d.calc.otMit; }, 0)
    };
  }

  /* ------------------------------------------------------------- render base */
  function render(conservarScroll) {
    var scroll = conservarScroll ? app.scrollTop : 0;
    var html = '';
    switch (estado.ruta) {
      case 'captura': html = pantallaCaptura(); break;
      case 'clasificar': html = pantallaClasificar(); break;
      case 'obra': html = pantallaObra(); break;
      case 'nomina': html = pantallaNomina(); break;
      case 'margen': html = pantallaMargen(); break;
      case 'hoy': default: html = pantallaHoy(); break;
    }
    app.setAttribute('data-ruta', estado.ruta);
    if (phone) { phone.classList.toggle('modo-captura', estado.ruta === 'captura'); }
    app.innerHTML = html;
    app.scrollTop = scroll;
    renderNav();
    renderPanel();
    renderToast();
    renderOffline();
  }

  function renderNav() {
    var activo = rutaActiva();
    tabbar.innerHTML = DESTINOS.map(function (d) {
      var esActivo = d.id === activo;
      return '<button class="tab" type="button" data-accion="' + (d.id === 'mas' ? 'abrir-mas' : 'ir') + '"'
        + (d.ruta ? ' data-ruta="' + d.ruta + '"' : '')
        + (esActivo ? ' aria-current="page"' : '') + '>'
        + ico(d.icono)
        + '<span class="tab-label">' + esc(d.etiqueta) + '</span></button>';
    }).join('');
  }
  function rutaActiva() {
    if (estado.panel && estado.panel.tipo === 'mas') return 'mas';
    switch (estado.ruta) {
      case 'hoy': return 'hoy';
      case 'obra':
      case 'margen': return 'obras';
      case 'clasificar':
      case 'captura': return 'gastos';
      case 'nomina': return 'equipo';
      default: return '';
    }
  }
  function renderOffline() {
    if (!offlineBanner) return;
    offlineBanner.hidden = !estado.offline;
    if (estado.offline && offlineTexto) {
      offlineTexto.textContent = estado.pendientes + (estado.pendientes === 1 ? ' cambio esperando' : ' cambios esperando');
    }
  }

  /* --------------------------------------------------------------- topbar */
  function topbar(opciones) {
    opciones = opciones || {};
    if (opciones.home) {
      return '<header class="topbar"><span class="wordmark">Bitácora</span><span class="topbar-spacer"></span>'
        + '<button class="icon-btn" type="button" data-accion="cuenta" aria-label="Tu cuenta: Diego Bermúdez">'
        + '<span class="avatar" aria-hidden="true">DB</span></button></header>';
    }
    var destino = opciones.volver || '#/hoy';
    var etiqueta = opciones.volverLabel || 'Hoy';
    return '<header class="topbar">'
      + '<button class="icon-btn" type="button" data-accion="ir" data-ruta="' + esc(destino) + '" aria-label="Volver a ' + esc(etiqueta) + '">' + ico('flecha-izq') + '</button>'
      + '<span class="topbar-spacer"></span><span class="wordmark">Bitácora</span></header>';
  }

  /* ----------------------------------------------------------- piezas comunes */
  function chipSemaforo(sem) {
    var s = SEMAFORO[sem] || SEMAFORO.ok;
    return '<span class="chip chip--' + s.clase + '">' + ico(s.icono) + esc(s.palabra) + '</span>';
  }
  function chipDesvio(p) {
    var d = desvioPpm(p);
    var abs = Math.abs(d);
    var palabra, clase, icono;
    if (d > 150000) { palabra = 'Alerta'; clase = 'danger'; icono = 'alerta'; }
    else if (d > 100000) { palabra = 'Ojo'; clase = 'warn'; icono = 'ojo'; }
    else if (d > 0) { palabra = 'Pasada'; clase = 'quiet'; icono = 'sube'; }
    else if (d === 0) { palabra = 'Justa'; clase = 'quiet'; icono = 'igual'; }
    else { palabra = 'Bajo'; clase = 'ok'; icono = 'baja'; }
    return '<span class="chip chip--' + clase + '">' + ico(icono)
      + esc(palabra + ' ' + (d > 0 ? '+' : '') + pct(d, { min: 1, max: 1 })) + '</span>';
  }
  function barra(porcentaje, clase, etiqueta, valorAhora) {
    var w = Math.max(0, Math.min(100, porcentaje));
    return '<div class="bar" role="progressbar" aria-label="' + esc(etiqueta) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(valorAhora) + '">'
      + '<span class="bar-fill' + (clase ? ' bar-fill--' + clase : '') + '" style="width:' + w + '%"></span></div>';
  }
  function alerta(a) {
    var sev = a.severidad;
    var contenido = '<span class="alert-ico alert-ico--' + sev + '">' + ico(sev === 'ok' ? 'check' : sev === 'warn' ? 'ojo' : 'alerta') + '</span>'
      + '<span class="alert-body">'
      + '<span class="alert-word alert-word--' + sev + '">' + esc(a.palabra) + '</span>'
      + '<span class="alert-title">' + esc(a.titulo) + '</span>'
      + '<span class="alert-detail">' + esc(a.detalle) + '</span>'
      + '</span>';
    if (a.ruta) {
      return '<button class="alert" type="button" data-alerta="' + esc(a.id) + '" data-accion="ir" data-ruta="' + esc(a.ruta) + '" aria-label="' + esc(a.palabra + ': ' + a.titulo + '. ' + a.accion) + '">'
        + contenido + '<span class="alert-chevron">' + ico('chevron') + '</span></button>';
    }
    return '<div class="alert" data-alerta="' + esc(a.id) + '">' + contenido + '</div>';
  }

  /* ================================================================ HOY */
  function pantallaHoy() {
    var h = D.hoy;
    var html = topbar({ home: true });
    html += '<div class="page-head">'
      + '<p class="eyebrow">' + esc(F.fechaLarga(h.fecha)) + ' · Semana ' + h.semana + '</p>'
      + '<h1 class="page-title">Hoy</h1>'
      + '<p class="page-sub">' + esc(h.saludo) + ' · <strong>' + D.obras.length + ' obras activas</strong></p>'
      + '</div><div class="screen-content">';

    /* Los 3 números de Hoy (P-03: visibles sin scroll) */
    html += '<section class="section" aria-label="Tu semana">'
      + '<div class="card kpi-card">'
      + filaKpi({
        label: 'Por pagar esta semana', monto: h.porPagar.montoCents,
        estado: 'warn', icono: 'reloj', veredicto: 'Vence hoy'
      })
      + filaKpi({
        label: 'Por cobrar', monto: h.porCobrar.montoCents,
        estado: 'ok', icono: 'check', veredicto: 'Vence el 12 nov'
      })
      + filaKpi({
        label: 'Gastos sin clasificar', monto: h.sinClasificar.montoCents,
        estado: 'warn', icono: 'alerta', veredicto: h.sinClasificar.cantidad + ' facturas · 5 min',
        ruta: '#/clasificar'
      })
      + '</div></section>';

    /* Máximo 3 alertas visibles · color + ícono + palabra */
    html += '<section class="section" aria-labelledby="t-alertas">'
      + '<div class="section-head"><h2 class="section-title" id="t-alertas">Necesita tu atención</h2></div>'
      + '<div class="card alert-card">' + h.alertas.map(alerta).join('') + '</div></section>';

    /* 2 tarjetas de obra con semáforo, 2 números y barra de avance */
    html += '<section class="section" aria-labelledby="t-obras">'
      + '<div class="section-head"><h2 class="section-title" id="t-obras">Tus obras</h2><span class="section-note">' + D.obras.length + ' activas</span></div>'
      + D.obras.map(tarjetaObra).join('')
      + '</section>';

    html += '</div>';
    return html;
  }

  function filaKpi(o) {
    var tag = o.ruta ? 'button' : 'span';
    var attrs = o.ruta ? ' type="button" data-accion="ir" data-ruta="' + esc(o.ruta) + '"' : '';
    var clase = 'kpi-row' + (o.ruta ? '' : ' kpi-row--static');
    var veredicto = '<span class="kpi-verdict kpi-verdict--' + o.estado + '">' + ico(o.icono) + esc(o.veredicto)
      + (o.ruta ? ico('chevron') : '') + '</span>';
    var contenido = '<span class="kpi-label">' + esc(o.label) + '</span>'
      + '<span class="kpi-num' + (o.chico ? ' kpi-num--sm' : '') + '">' + esc(dinero(o.monto)) + '</span>'
      + veredicto;
    if (tag === 'button') {
      return '<button class="' + clase + '"' + attrs + ' aria-label="' + esc(o.label + ': ' + dinero(o.monto) + '. ' + o.veredicto) + '">' + contenido + '</button>';
    }
    return '<span class="' + clase + '">' + contenido + '</span>';
  }

  function tarjetaObra(o) {
    var avance = Math.round(o.avancePpm / 10000);
    var gastadoPpm = Math.round((o.gastadoCents / o.presupuestoCents) * 1000000);
    var claseBarra = o.semaforo === 'ok' ? 'ok' : o.semaforo === 'ojo' ? 'warn' : 'danger';
    return '<a class="obra-card" href="' + (o.id === 'maple' ? '#/obra' : '#/obra') + '" data-accion="abrir-obra" data-obra="' + o.id + '"'
      + ' aria-label="Abrir ' + esc(o.nombre) + '. Avance ' + avance + ' por ciento">'
      + '<span class="obra-head"><span class="obra-name">' + esc(o.nombre) + '</span>' + chipSemaforo(o.semaforo) + '</span>'
      + '<span class="obra-meta">' + esc([o.ciudad, o.tipo, o.contrato, o.contratoCcdc].join(' · ')) + '</span>'
      + '<span class="obra-stats">'
      + '<span class="obra-stat"><span class="obra-stat-label">Presupuesto</span><span class="obra-stat-value">' + esc(dinero(o.presupuestoCents)) + '</span></span>'
      + '<span class="obra-stat"><span class="obra-stat-label">Gastado</span><span class="obra-stat-value">' + esc(dinero(o.gastadoCents)) + '</span></span>'
      + '</span>'
      + barra(avance, claseBarra, 'Avance de ' + o.nombre, avance)
      + '<span class="obra-foot"><span>Avance <strong>' + avance + ' %</strong></span><span>Gastado <strong class="'
      + (gastadoPpm > 1000000 ? 'text-danger' : '') + '">' + Math.round(gastadoPpm / 10000) + ' %</strong> del presupuesto</span></span>'
      + '</a>';
  }

  /* =============================================================== OBRA */
  function pantallaObra() {
    var o = buscarObra('maple');
    var partidas = partidasPorDesvio(o);
    var avance = Math.round(o.avancePpm / 10000);
    var gastadoPpm = Math.round((o.gastadoCents / o.presupuestoCents) * 1000000);
    var faltaPagar = o.gastadoCents - o.pagadoCents;
    var html = topbar({ volver: '#/hoy', volverLabel: 'Hoy' });
    html += '<div class="page-head">'
      + '<p class="eyebrow">Obra · ' + esc(o.ciudad) + '</p>'
      + '<h1 class="page-title">' + esc(o.nombre) + '</h1>'
      + '<div class="chip-row">' + chipSemaforo(o.semaforo)
      + '<span class="chip chip--quiet">' + esc(o.tipo) + '</span>'
      + '<span class="chip chip--quiet">' + esc(o.contrato) + ' · ' + esc(o.contratoCcdc) + '</span></div>'
      + '</div><div class="screen-content">';

    html += '<section class="section" aria-labelledby="t-numeros">'
      + '<div class="section-head"><h2 class="section-title" id="t-numeros">Los números de la obra</h2></div>'
      + '<div class="card kpi-card">'
      + filaKpi({ label: 'Presupuesto', monto: o.presupuestoCents, estado: 'ok', icono: 'igual', veredicto: 'Aprobado' })
      + filaKpi({ label: 'Comprometido', monto: o.comprometidoCents, estado: 'warn', icono: 'doc', veredicto: 'PO firmados' })
      + filaKpi({ label: 'Gastado', monto: o.gastadoCents, estado: 'danger', icono: 'alerta', veredicto: Math.round(gastadoPpm / 10000) + ' % del presupuesto' })
      + '<span class="kpi-row kpi-row--static kpi-row--pagado">'
      + '<span class="kpi-label">Pagado</span>'
      + '<span class="kpi-num kpi-num--sm">' + esc(dinero(o.pagadoCents)) + '</span>'
      + '<span class="kpi-verdict">' + ico('reloj') + 'Falta pagar ' + esc(dinero(faltaPagar)) + '</span></span>'
      + '</div></section>';

    html += '<div class="card card-pad mt-3">'
      + '<div class="bar-row"><span>Avance de obra</span><strong>' + avance + ' %</strong></div>'
      + barra(avance, 'ok', 'Avance de obra', avance)
      + '<div class="bar-row mt-3"><span>Gastado del presupuesto</span><strong class="text-danger">' + Math.round(gastadoPpm / 10000) + ' %</strong></div>'
      + barra(100, 'danger', 'Gastado del presupuesto', 100)
      + '</div>';

    html += '<div class="actions-stack mt-3">'
      + '<button class="btn btn--primary" type="button" data-accion="ir" data-ruta="#/margen">Ver si esta obra gana dinero</button>'
      + '<button class="btn btn--secondary" type="button" data-accion="avance-obra">Registrar avance</button>'
      + '</div>';

    html += '<section class="section" aria-labelledby="t-holdback">'
      + '<div class="notice"><span class="notice-ico">' + ico('lock') + '</span><div class="notice-body">'
      + '<p class="notice-title">Holdback retenido · ' + esc(dinero(o.holdback.retenidoCents)) + '</p>'
      + '<p class="notice-text">Es el 10 % de lo facturado. Próxima liberación: <strong>' + esc(F.fechaCorta(o.holdback.proximaLiberacion)) + '</strong>. Aviso 14 días después del aniversario del contrato; el pago sale hasta 60 días después del aviso.</p>'
      + '</div></div></section>';

    html += '<section class="section" aria-labelledby="t-partidas">'
      + '<div class="section-head"><h2 class="section-title" id="t-partidas">Partidas · de peor a mejor</h2><span class="section-note">' + partidas.length + ' partidas</span></div>'
      + partidas.map(function (p) { return tarjetaPartida(p); }).join('')
      + '</section>';

    html += '</div>';
    return html;
  }

  function tarjetaPartida(p) {
    var desvio = p.gastadoCents - p.presupuestoCents;
    return '<div class="partida"><button class="partida-btn" type="button" data-accion="ver-partida" data-partida="' + p.id + '"'
      + ' aria-label="Ver desglose de ' + esc(p.nombre) + '">'
      + '<span class="partida-top"><span class="partida-name">' + esc(p.nombre) + '</span>' + chipDesvio(p) + '</span>'
      + '<span class="partida-grid">'
      + numeroPartida('Presupuesto', p.presupuestoCents)
      + numeroPartida('Comprometido', p.compromisoCents)
      + numeroPartida('Gastado', p.gastadoCents)
      + numeroPartida('Pagado', p.pagadoCents)
      + '</span>'
      + '<span class="partida-hint">Desvío <strong>' + esc(dineroSigno(desvio)) + '</strong></span>'
      + '</button></div>';
  }
  function numeroPartida(etiqueta, cents) {
    return '<span class="partida-num"><span class="partida-num-label">' + esc(etiqueta) + '</span>'
      + '<span class="partida-num-val">' + esc(dinero(cents)) + '</span></span>';
  }

  /* ============================================================= CLASIFICAR */
  function pantallaClasificar() {
    var total = D.facturas.length;
    var hechas = Object.keys(estado.clasificar.resueltas).length;
    var pendientes = D.facturas.filter(function (f) { return !estado.clasificar.resueltas[f.id]; });
    var html = topbar({ volver: '#/hoy', volverLabel: 'Hoy' });
    html += '<div class="page-head">'
      + '<p class="eyebrow">Gastos · Bandeja</p>'
      + '<h1 class="page-title">Por clasificar</h1>'
      + '<p class="page-sub">' + (hechas === total
        ? 'Nada pendiente. Todo lo de esta semana quedó en su partida.'
        : 'Toca una factura y elige la partida. Yo propongo; tú confirmas.') + '</p>'
      + '</div><div class="screen-content">';

    html += '<div class="card contador-card mt-3">'
      + '<div class="contador-top"><span class="contador-num"><b>' + hechas + '</b> de ' + total + ' clasificadas</span>'
      + '<span class="contador-restante">' + (total - hechas) + ' por hacer</span></div>'
      + barra((hechas / total) * 100, hechas === total ? 'ok' : '', 'Facturas clasificadas', hechas)
      + '</div>';

    if (hechas === total) {
      html += '<div class="empty">'
        + '<div class="empty-ico">' + ico('check') + '</div>'
        + '<h2 class="empty-title">Todo clasificado</h2>'
        + '<p class="empty-text">Te aviso cuando llegue una nueva.</p>'
        + '<div class="empty-ejemplo"><strong>Así se verá la próxima:</strong> foto, proveedor, monto y la partida que propongo. Tú confirmas con un toque.</div>'
        + '<button class="btn btn--primary" type="button" data-accion="ir" data-ruta="#/hoy">Volver a Hoy</button>'
        + '</div>';
    } else {
      html += '<div class="flat-list mt-3">' + pendientes.map(filaFactura).join('') + '</div>';
      html += '<p class="param-version mt-3">Nada se borra: si te equivocas, tienes 10 segundos para deshacer.</p>';
    }
    html += '</div>';
    return html;
  }

  function filaFactura(f) {
    var dup = !!f.duplicadoDe;
    var sug = f.sugerencias[0];
    var obra = buscarObra(sug.obraId);
    var partida = buscarPartida(sug.obraId, sug.partidaId);
    var conf = pct(sug.confianzaPpm, { min: 0, max: 0 });
    var hint = dup
      ? 'Parece la misma factura del martes.'
      : 'IA: ' + (obra ? obra.nombre : '') + ' · ' + (partida ? partida.nombre : '') + ' · ' + conf;
    return '<button class="factura-card' + (dup ? ' factura-card--duplicado' : '') + '" type="button"'
      + ' data-accion="abrir-clasificar" data-factura="' + f.id + '"'
      + ' aria-label="' + esc(f.proveedor + ', ' + dinero(f.montoCents) + '. ' + (dup ? 'Posible duplicado. ' : '') + hint) + '">'
      + '<span class="factura-top"><span class="data-title">' + esc(f.proveedor) + '</span>'
      + '<span class="data-amount">' + esc(dinero(f.montoCents)) + '</span></span>'
      + '<span class="data-meta">' + esc(F.fechaSinAnio(f.fecha)) + ' · Factura ' + esc(f.numero) + '</span>'
      + (dup ? '<span class="chip chip--danger mt-2">' + ico('alerta') + 'Posible duplicado</span>' : '')
      + '<span class="factura-hint-ia">' + ico('sparkle') + '<span>' + esc(hint) + '</span></span>'
      + '</button>';
  }

  /* ================================================================ NÓMINA */
  function pantallaNomina() {
    var c = calcNomina();
    var total = c.cantidadTotal;
    var version = P.version;
    var html = topbar({ volver: '#/hoy', volverLabel: 'Hoy' });

    html += '<div class="sticky-banner">' + ico('info')
      + '<div><strong>Cálculo propuesto</strong> — confirma con tu contador. <span>La app no mueve dinero.</span></div></div>';

    html += '<div class="page-head">'
      + '<p class="eyebrow">Equipo · Semana ' + D.nomina.semana + '</p>'
      + '<h1 class="page-title">Nómina</h1>'
      + '<p class="page-sub">' + esc(D.nomina.periodo) + ' · ' + total + ' personas</p>'
      + '</div><div class="screen-content">';

    html += '<div class="param-version mt-1"><span>Parámetros <strong>' + esc(version) + '</strong></span>'
      + '<span class="chip chip--quiet">HST ' + esc(pct(P.hst.ppm)) + '</span></div>';

    html += '<section class="section" aria-labelledby="t-total">'
      + '<div class="card kpi-card">'
      + filaKpi({
        label: 'Bruto de la semana', monto: c.brutoTotalCents,
        estado: 'ok', icono: 'check', veredicto: total + ' personas · ' + formatoHoras(c.horasExtraMitades) + ' h extra'
      })
      + filaKpi({
        label: 'Te cuesta la semana', monto: c.costoTotalCents,
        estado: 'warn', icono: 'info', veredicto: 'Carga patronal ' + dinero(c.cargaTotalCents) + ' (' + pctDe(c.cargaTotalCents, c.brutoEmpleadosCents, { min: 2, max: 2 }) + ')'
      })
      + '</div></section>';

    html += '<section class="section" aria-labelledby="t-personas">'
      + '<div class="section-head"><h2 class="section-title" id="t-personas">Personas · ' + total + '</h2><span class="section-note">Toca para ajustar</span></div>'
      + c.detalle.map(function (d) { return filaPersona(d.persona, d.calc); }).join('')
      + '</section>';

    if (!estado.nomina.pagada) {
      html += '<div class="actions-stack mt-3">'
        + '<button class="btn btn--primary" type="button" data-accion="revisar-pago">'
        + 'Revisar y pagar · ' + esc(dinero(c.pagableCents)) + '</button>'
        + '<p class="param-version">' + c.cantidadPagable + ' de ' + total + ' personas. ' + (c.bloqueado ? esc(c.bloqueado.nombre) + ' queda fuera: WSIB vencido.' : '') + '</p>'
        + '</div>';
    } else {
      html += '<div class="notice mt-3"><span class="notice-ico text-ok">' + ico('check') + '</span><div class="notice-body">'
        + '<p class="notice-title">Pago registrado · ' + esc(dinero(c.pagableCents)) + '</p>'
        + '<p class="notice-text">' + c.cantidadPagable + ' personas · ' + esc(metodoEtiqueta(estado.nomina.metodo)) + '. Comprobantes guardados. La app no mueve dinero.</p>'
        + '</div></div>';
    }

    html += '<p class="param-version mt-3">Cálculo propuesto con los parámetros ' + esc(version) + ' (HST ' + esc(pct(P.hst.ppm)) + ' · overtime ' + P.overtime.horasSemanales + ' h · holdback ' + esc(pct(P.holdback.ppm)) + '). El neto por persona se calcula con las tablas de CRA y el TD1 de cada una: confírmalo con tu contador.</p>';

    html += '</div>';
    return html;
  }

  function metodoEtiqueta(m) {
    return { 'e-transfer': 'e-transfer', cheque: 'cheque', efectivo: 'efectivo' }[m] || m;
  }

  function filaPersona(p, c) {
    var bloqueado = !p.wsibVigente;
    var chipMod = { hora: 'Hora', destajo: 'Destajo', jornal: 'Jornal' }[p.modalidad];
    var meta;
    if (p.modalidad === 'hora') {
      meta = hhmm(c.horasMitades) + ' · ' + dinero(p.tarifaHoraCents) + '/h';
    } else {
      meta = p.cantidad + ' ' + p.unidad + ' × ' + dinero(p.tarifaUnidadCents);
    }
    var metaHtml = esc(meta) + (c.otMit > 0 ? ' · <span class="text-warn">' + esc(formatoHoras(c.otMit)) + ' h extra</span>' : '');
    var chips = '<span class="chip chip--quiet">' + esc(chipMod) + '</span>';
    if (bloqueado) { chips += '<span class="chip chip--danger">' + ico('alerta') + 'Bloqueado</span>'; }

    var fila = '<button class="persona" type="button" data-accion="ver-persona" data-persona="' + p.id + '"'
      + ' aria-label="Ver horas de ' + esc(p.nombre) + (bloqueado ? ', pago bloqueado por WSIB vencido' : '') + '">'
      + '<span class="persona-avatar">' + esc(iniciales(p.nombre)) + '</span>'
      + '<span class="persona-main">'
      + '<span class="persona-nombre">' + esc(p.nombre) + chips + '</span>'
      + '<span class="persona-meta">' + metaHtml + '</span>'
      + '</span>'
      + '<span class="persona-monto">' + esc(dinero(c.brutoCents)) + '<small>' + (bloqueado ? 'no se paga' : 'bruto') + '</small></span>'
      + '</button>';

    if (!bloqueado) { return fila; }

    return '<div class="persona-card persona-card--bloqueada">' + fila
      + '<div class="persona-bloqueo">' + ico('alerta')
      + '<div><strong>Pago bloqueado</strong>: WSIB vencido el ' + esc(F.fechaCorta(p.wsibVence)) + '.<span>El clearance vale 90 días. Sube el documento vigente y este pago se desbloquea. Los otros pagos siguen.</span></div></div>'
      + '<button class="btn btn--secondary btn--sm" type="button" data-accion="nomina-doc" data-persona="' + p.id + '">Ver documento</button>'
      + '</div>';
  }

  /* ================================================================= MARGEN */
  function pantallaMargen() {
    var m = D.margen;
    var o = buscarObra(m.obraId);
    var escenarios = m.escenarios.slice().sort(function (a, b) { return a.margenCents - b.margenCents; });
    var peor = escenarios[0];
    var mejor = escenarios[escenarios.length - 1];
    var peorPpm = Math.round((peor.margenCents * 1000000) / m.precioCents);
    var mejorPpm = Math.round((mejor.margenCents * 1000000) / m.precioCents);
    var presPpm = Math.round((m.margenPresupuestadoCents * 1000000) / m.precioCents);
    var realPpm = Math.round((m.margenRealCents * 1000000) / m.precioCents);
    var minimo = P.minimoMargenPpm;
    var escala = 120000; /* 12 % para dibujar el rango */
    var partidas = partidasPorDesvio(o);
    var maxDesvio = Math.max.apply(null, partidas.map(function (p) { return Math.abs(desvioPpm(p)); })) || 1;
    var html = topbar({ volver: '#/obra', volverLabel: 'Obra' });

    html += '<div class="page-head">'
      + '<p class="eyebrow">Obra · ' + esc(o.nombre) + '</p>'
      + '<h1 class="page-title">Margen</h1>'
      + '<p class="page-sub">¿Esta obra gana dinero? ' + esc(m.titulo) + ': los números del ejemplo de la cocina, con el costo real de hoy.</p>'
      + '</div><div class="screen-content">';

    /* Margen como RANGO · el semáforo lo define el PEOR escenario */
    html += '<section class="section" aria-labelledby="t-margen">'
      + '<div class="card margen-hero">'
      + '<div class="kpi-top"><span class="kpi-label">Margen proyectado</span>' + chipSemaforo(peorPpm < minimo ? 'alerta' : peorPpm < minimo * 2 ? 'ojo' : 'ok') + '</div>'
      + '<span class="margen-rango">' + esc(F.dineroEntero(peor.margenCents) + ' – ' + F.dineroEntero(mejor.margenCents)) + '</span>'
      + '<span class="margen-rango-pct">' + esc(pct(peorPpm, { min: 2, max: 2 }) + ' – ' + pct(mejorPpm, { min: 2, max: 2 })) + '</span>'
      + '<p class="margen-nota">Tres escenarios para terminar la obra. El peor decide el color.</p>'
      + '<div class="rango-track" role="img" aria-label="Rango de margen entre ' + esc(pct(peorPpm, { min: 2, max: 2 })) + ' y ' + esc(pct(mejorPpm, { min: 2, max: 2 })) + ', muy por debajo del mínimo del 8 por ciento">'
      + '<span class="rango-zona" style="left:' + ((peorPpm / escala) * 100).toFixed(2) + '%;width:' + (Math.max(0.8, ((mejorPpm - peorPpm) / escala) * 100)).toFixed(2) + '%"></span>'
      + '<span class="rango-marca rango-marca--min" style="left:' + ((minimo / escala) * 100).toFixed(2) + '%"></span>'
      + '<span class="rango-marca" style="left:' + ((presPpm / escala) * 100).toFixed(2) + '%"></span>'
      + '</div>'
      + '<div class="rango-escala"><span>0' + '\u00A0%' + '</span><span>12' + '\u00A0%' + '</span></div>'
      + '<div class="rango-leyenda">'
      + '<span><i class="leyenda-marca leyenda-marca--min" aria-hidden="true"></i>Tu mínimo ' + esc(pct(minimo, { min: 0, max: 0 })) + '</span>'
      + '<span><i class="leyenda-marca" aria-hidden="true"></i>Presupuestado ' + esc(pct(presPpm, { min: 2, max: 2 })) + '</span>'
      + '</div>'
      + '<div class="margen-compare">'
      + '<div class="resumen-linea"><span>Presupuestado</span><strong>' + esc(dinero(m.margenPresupuestadoCents)) + ' · ' + esc(pct(presPpm, { min: 2, max: 2 })) + '</strong></div>'
      + '<div class="resumen-linea"><span>Si cierras hoy</span><strong>' + esc(dinero(m.margenRealCents)) + ' · ' + esc(pct(realPpm, { min: 2, max: 2 })) + '</strong></div>'
      + '</div></div></section>';

    /* Alerta de margen bajo el mínimo (cap. 5.6) */
    html += '<section class="section" aria-label="Alerta de margen"><div class="card alert-card">'
      + '<div class="alert" data-alerta="margen-minimo">'
      + '<span class="alert-ico alert-ico--danger">' + ico('alerta') + '</span>'
      + '<span class="alert-body"><span class="alert-word alert-word--danger">Alerta</span>'
      + '<span class="alert-title">El margen está bajo tu mínimo de ' + esc(pct(minimo, { min: 0, max: 0 })) + '</span>'
      + '<span class="alert-detail">Ningún escenario lo alcanza: la contingencia ya se consumió. Antes de gastar más, conviene un change order o renegociar con los subcontratos.</span></span>'
      + '</div></div></section>';

    /* Los 3 escenarios, de peor a mejor */
    html += '<section class="section" aria-labelledby="t-escenarios">'
      + '<div class="section-head"><h2 class="section-title" id="t-escenarios">Los 3 escenarios</h2><span class="section-note">De peor a mejor</span></div>'
      + escenarios.map(function (e, i) {
        var ePpm = Math.round((e.margenCents * 1000000) / m.precioCents);
        return '<div class="escenario' + (i === 0 ? ' escenario--peor' : '') + '">'
          + '<div class="escenario-head"><span class="escenario-nombre">' + esc(e.nombre) + '</span>'
          + '<span class="escenario-monto">' + esc(dinero(e.margenCents)) + '<small>' + esc(pct(ePpm, { min: 2, max: 2 })) + '</small></span></div>'
          + '<p class="escenario-calculo">Costo al terminar <strong>' + esc(dinero(e.costoProyectadoCents)) + '</strong> · cálculo: ' + esc(e.calculo) + '</p>'
          + '<p class="escenario-texto">' + esc(e.detalle) + (i === 0 ? ' <span class="chip chip--danger">' + ico('alerta') + 'Peor caso</span>' : '') + '</p>'
          + '</div>';
      }).join('')
      + '</section>';

    /* Desviación por partida, de peor a mejor */
    html += '<section class="section" aria-labelledby="t-desvio">'
      + '<div class="section-head"><h2 class="section-title" id="t-desvio">De peor a mejor por partida</h2><span class="section-note">Costo directo</span></div>'
      + '<div class="card">' + partidas.map(function (p) {
        var d = desvioPpm(p);
        var ancho = Math.max(4, (Math.abs(d) / maxDesvio) * 100);
        var clase = d > 150000 ? 'danger' : d > 100000 ? 'warn' : d > 0 ? 'warn' : 'ok';
        var monto = p.gastadoCents - p.presupuestoCents;
        return '<div class="desvio-row">'
          + '<div class="desvio-main"><span class="desvio-nombre">' + esc(p.nombre) + '</span>'
          + '<div class="desvio-bar">' + barra(ancho, clase, 'Desvío de ' + p.nombre, ancho) + '</div></div>'
          + '<div class="desvio-right"><span class="desvio-monto">' + esc(dineroSigno(monto)) + '</span>'
          + chipDesvio(p) + '</div></div>';
      }).join('') + '</div></section>';

    /* R-CU-26: precio vs cantidad */
    var v = m.varianza;
    var pPrecio = Math.round((v.precioCents / v.totalCents) * 100);
    var pCantidad = 100 - pPrecio;
    html += '<section class="section" aria-labelledby="t-varianza">'
      + '<div class="section-head"><h2 class="section-title" id="t-varianza">De dónde vino el desvío</h2><span class="section-note">' + esc(nombrePartida(m.obraId, v.partidaId)) + '</span></div>'
      + '<div class="card card-pad">'
      + '<div class="varianza-split" role="img" aria-label="' + pPrecio + ' por ciento del desvío fue precio y ' + pCantidad + ' por ciento cantidad">'
      + '<span class="varianza-precio" style="width:' + pPrecio + '%"></span>'
      + '<span class="varianza-cantidad" style="width:' + pCantidad + '%"></span>'
      + '</div>'
      + '<div class="varianza-fila"><span>Precio · la hora subió de ' + esc(dinero(v.presupuestoHoraCents)) + ' a ' + esc(dinero(v.realHoraCents)) + '</span><strong class="text-danger">' + esc(dineroSigno(v.precioCents)) + '</strong></div>'
      + '<div class="varianza-fila"><span>Cantidad · ' + (v.realHoras - v.presupuestoHoras) + ' h más de las previstas</span><strong class="text-warn">' + esc(dineroSigno(v.cantidadCents)) + '</strong></div>'
      + '<div class="varianza-fila"><span>Desvío total de la partida</span><strong>' + esc(dineroSigno(v.totalCents)) + '</strong></div>'
      + '<p class="varianza-nota mt-2">La mayor parte fue precio, no horas. Eso se negocia con el subcontrato; apurar la obra no lo corrige.</p>'
      + '</div></section>';

    /* Precio, HST aparte y cierre */
    html += '<section class="section" aria-labelledby="t-precio">'
      + '<div class="section-head"><h2 class="section-title" id="t-precio">El precio y el HST</h2></div>'
      + '<div class="card card-pad">'
      + '<div class="resumen-linea"><span>Precio cotizado</span><strong>' + esc(dinero(m.precioCents)) + '</strong></div>'
      + '<div class="resumen-linea"><span>HST ' + esc(pct(m.hstPpm)) + ' <span class="chip chip--quiet">aparte</span></span><strong>' + esc(dinero(m.hstCents)) + '</strong></div>'
      + '<div class="resumen-linea resumen-linea--total"><span>Total facturado al cliente</span><strong>' + esc(dinero(m.totalFacturadoCents)) + '</strong></div>'
      + '<p class="varianza-nota mt-2">El HST no es ingreso tuyo: se cobra y se entera. Por eso el margen se mide sin HST.</p>'
      + '</div></section>';

    html += '<section class="section"><div class="notice"><span class="notice-ico">' + ico('info') + '</span><div class="notice-body">'
      + '<p class="notice-title">Si vendes o cierras hoy: ' + esc(dinero(m.margenRealCents)) + ' (' + esc(pct(realPpm, { min: 2, max: 2 })) + ')</p>'
      + '<p class="notice-text">La contingencia de ' + esc(dinero(m.contingenciaCents)) + ' y el overhead de ' + esc(dinero(m.overheadCents)) + ' ya están dentro del costo. Tu mínimo de margen es ' + esc(pct(minimo, { min: 0, max: 0 })) + '.</p>'
      + '</div></div></section>';

    html += '</div>';
    return html;
  }

  /* =============================================================== CAPTURA */
  function pantallaCaptura() {
    var c = estado.captura;
    if (c.fase === 'camara') return capturaCamara();
    if (c.fase === 'leyendo') return capturaLeyendo();
    if (c.fase === 'error') return capturaError();
    if (c.fase === 'guardada') return capturaGuardada();
    return capturaRevision();
  }

  function capturaCamara() {
    var c = estado.captura;
    return '<div class="screen screen--captura"><div class="capture">'
      + '<div class="camera-bar">'
      + '<button class="icon-btn" type="button" data-accion="ir" data-ruta="#/hoy" aria-label="Cerrar la cámara">' + ico('cerrar') + '</button>'
      + '<span class="camera-bar-title">Factura</span>'
      + '<button class="icon-btn" type="button" data-accion="flash" aria-label="Flash automático">' + ico('rayo') + '</button>'
      + '</div>'
      + '<div class="viewfinder">'
      + '<div class="hoja" aria-hidden="true">'
      + '<div class="hoja-linea"></div><div class="hoja-linea"></div><div class="hoja-linea"></div>'
      + '<div class="hoja-linea"></div><div class="hoja-linea"></div><div class="hoja-linea"></div>'
      + '<div class="hoja-linea hoja-linea--total"></div>'
      + '</div>'
      + '<div class="marco" aria-hidden="true"><span></span><span></span><span></span><span></span></div>'
      + '<p class="camera-hint">' + esc(D.estados.captura.camara) + '</p>'
      + '</div>'
      + '<div class="camera-foot">'
      + '<button class="shutter" type="button" data-accion="tomar-foto" aria-label="Tomar la foto de la factura"><span class="shutter-core" aria-hidden="true"></span></button>'
      + '<p class="camera-note">Cámara simulada · no pido permisos reales en este prototipo</p>'
      + '<div class="camera-test">'
      + '<button type="button" data-accion="simular-error" aria-pressed="' + (c.errorSim ? 'true' : 'false') + '">Simular error de lectura</button>'
      + '<button type="button" data-accion="simular-sin-senal" aria-pressed="' + (c.sinSenal ? 'true' : 'false') + '">Simular sin señal</button>'
      + '</div>'
      + '</div>'
      + '</div></div>';
  }

  function capturaLeyendo() {
    return '<div class="screen screen--captura"><div class="capture">'
      + '<div class="camera-bar">'
      + '<button class="icon-btn" type="button" data-accion="ir" data-ruta="#/hoy" aria-label="Cerrar la cámara">' + ico('cerrar') + '</button>'
      + '<span class="camera-bar-title">Factura</span><span style="width:48px" aria-hidden="true"></span>'
      + '</div>'
      + '<div class="leyendo">'
      + '<div class="leyendo-visual" aria-hidden="true">'
      + '<div class="leyendo-hoja"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>'
      + '<div class="leyendo-escaner"></div>'
      + '</div>'
      + '<p class="leyendo-titulo" role="status">Leyendo la factura…</p>'
      + '<p class="leyendo-sub">Normalmente tarda 1,5 segundos. La foto ya está guardada.</p>'
      + '</div>'
      + '</div></div>';
  }

  function capturaError() {
    return '<div class="screen screen--captura"><div class="capture">'
      + '<div class="camera-bar">'
      + '<button class="icon-btn" type="button" data-accion="captura-repetir" aria-label="Volver a la cámara">' + ico('flecha-izq') + '</button>'
      + '<span class="camera-bar-title">Factura</span><span style="width:48px" aria-hidden="true"></span>'
      + '</div>'
      + '<div class="leyendo">'
      + '<div class="card card-pad error-card">'
      + '<span class="alert-ico alert-ico--warn">' + ico('alerta') + '</span>'
      + '<h2 class="card-title mt-2">No pude leer el total</h2>'
      + '<p class="page-sub mt-2">¿Lo escribes o repetimos la foto?</p>'
      + '<div class="actions-stack mt-3">'
      + '<button class="btn btn--primary" type="button" data-accion="captura-escribir">Escribir el total</button>'
      + '<button class="btn btn--secondary" type="button" data-accion="captura-repetir">Repetir la foto</button>'
      + '</div>'
      + '<p class="camera-note mt-3">La foto y los otros 6 campos no se pierden.</p>'
      + '</div>'
      + '</div>'
      + '</div></div>';
  }

  function capturaGuardada() {
    var c = estado.captura;
    var mensaje = c.sinSenal
      ? 'Guardada en tu teléfono. Se sube cuando vuelva la señal.'
      : 'La ordené en Materiales de 12 Maple Ave. Ya está en Gastos.';
    return '<div class="screen"><header class="topbar">'
      + '<button class="icon-btn" type="button" data-accion="ir" data-ruta="#/hoy" aria-label="Cerrar">' + ico('cerrar') + '</button>'
      + '<span class="topbar-spacer"></span><span class="wordmark">Bitácora</span></header>'
      + '<div class="screen-content"><div class="empty">'
      + '<div class="empty-ico">' + ico('check') + '</div>'
      + '<h1 class="empty-title">Factura guardada</h1>'
      + '<p class="empty-text">' + esc(mensaje) + '</p>'
      + '<div class="card card-pad success-resumen">'
      + '<div class="resumen-linea"><span>Proveedor</span><strong>' + esc(c.proveedor) + '</strong></div>'
      + '<div class="resumen-linea"><span>Factura</span><strong>' + esc(c.numero) + '</strong></div>'
      + '<div class="resumen-linea"><span>Obra · partida</span><strong>' + esc(nombrePartida(c.obraId, c.partidaId)) + '</strong></div>'
      + '<div class="resumen-linea resumen-linea--total"><span>Total con HST</span><strong>' + esc(dinero(c.totalCents)) + '</strong></div>'
      + '</div>'
      + '<div class="dual-actions">'
      + '<button class="btn btn--primary" type="button" data-accion="ir" data-ruta="#/clasificar">Ver Gastos</button>'
      + '<button class="btn btn--secondary" type="button" data-accion="captura-otra">Capturar otra</button>'
      + '</div>'
      + '</div></div></div>';
  }

  function capturaRevision() {
    var c = estado.captura;
    var hst = Math.round((c.subtotalCents * P.hst.ppm) / 1000000);
    var total = c.subtotalCents + hst;
    var obra = buscarObra(c.obraId) || D.obras[0];
    var catalogo = D.catalogo;
    var html = '<div class="screen">';
    html += '<header class="topbar">'
      + '<button class="icon-btn" type="button" data-accion="captura-repetir" aria-label="Volver a la foto">' + ico('flecha-izq') + '</button>'
      + '<span class="topbar-spacer"></span><span class="wordmark">Bitácora</span></header>';
    html += '<div class="page-head">'
      + '<p class="eyebrow">Captura · ' + (estado.offline ? 'sin conexión' : '1 foto') + '</p>'
      + '<h1 class="page-title">Revisar</h1>'
      + '<div class="captura-head-slim">'
      + '<span class="badge-ia">' + ico('sparkle') + 'Propuesto por IA</span>'
      + '<span class="section-note text-warn">El total es el único dudoso</span>'
      + '</div>'
      + '<p class="page-sub">Revisa y corrige. Nada se guarda aún.</p>'
      + '</div><div class="screen-content">';

    html += '<div class="foto-mini"><span class="foto-mini-ico">' + ico('foto') + '</span>'
      + '<span class="foto-mini-txt"><strong>Factura fotografiada</strong> · hoja completa, legible</span></div>';

    html += '<div class="card card-pad mt-3"><div class="campos-grid">'
      + campoTexto('Proveedor', 'proveedor', c.proveedor, 'alta', null, 'campo--full')
      + campoTexto('Fecha', 'fecha', F.fechaCorta(c.fecha), 'alta')
      + campoTexto('Nº de factura', 'numero', c.numero, 'alta')
      + campoTexto('Subtotal', 'subtotal', moneyPlain(c.subtotalCents), 'alta', 'decimal')
      + campoTexto('HST ' + pct(P.hst.ppm), 'hst', moneyPlain(hst), null, 'calc')
      + '<p class="param-nota campo--full">' + ico('info') + '<span>' + esc('Parámetro vigente: ' + P.hst.etiqueta + ' ' + pct(P.hst.ppm) + ' · ' + P.hst.vigencia) + '</span></p>'
      + campoTexto('Total', 'total', moneyPlain(total), 'baja', 'revisar', 'campo--full')
      + campoSelect('Obra', 'obra', D.obras, c.obraId, 'campo--full')
      + campoSelect('Partida', 'partida', obra ? obra.partidas : [], c.partidaId, 'campo--full')
      + '</div></div>';

    /* Sugerencia de catálogo: la IA propone, Diego decide */
    html += '<div class="sugerencia mt-3">'
      + '<span class="sugerencia-titulo">' + ico('sparkle') + 'Precio del catálogo</span>'
      + (c.catalogo === 'aceptado'
        ? '<p class="sugerencia-texto">' + ico('check') + ' Actualizado a <strong>' + esc(dinero(catalogo.precioNuevoCents)) + '</strong>.</p>'
        : c.catalogo === 'rechazado'
          ? '<p class="sugerencia-texto">Lo dejé en <strong>' + esc(dinero(catalogo.precioActualCents)) + '</strong>. Sin cambios.</p>'
          : '<p class="sugerencia-texto"><strong>' + esc(catalogo.item) + ': ' + esc(dinero(catalogo.precioActualCents)) + ' → ' + esc(dinero(catalogo.precioNuevoCents)) + ' (' + esc(pct(catalogo.variacionPpm, { min: 0, max: 0 })) + ')</strong> ¿Actualizo el precio del catálogo?</p>'
            + '<div class="dual-actions"><button class="btn btn--primary btn--sm" type="button" data-accion="catalogo-aceptar">Aceptar</button>'
            + '<button class="btn btn--secondary btn--sm" type="button" data-accion="catalogo-rechazar">Rechazar</button></div>')
      + '<span class="param-version">Última compra: ' + esc(catalogo.proveedor) + ' · ' + esc(F.fechaCorta(catalogo.fecha)) + '. La IA propone; tú confirmas.</span>'
      + '</div>';

    html += '<div class="actions-stack mt-4">'
      + '<button class="btn btn--primary" type="button" data-accion="guardar-factura">'
      + (estado.offline ? 'Guardar en el teléfono' : 'Guardar factura') + '</button>'
      + '<button class="btn btn--ghost" type="button" data-accion="captura-repetir">Repetir la foto</button>'
      + '</div>';
    html += '</div></div>';
    return html;
  }

  function confianzaTag(tipo) {
    if (tipo === 'alta') return '<span class="confianza">' + ico('check') + 'Alta</span>';
    if (tipo === 'baja') return '<span class="confianza confianza--baja">' + ico('alerta') + 'Revisa</span>';
    if (tipo === 'calculado') return '<span class="confianza confianza--calc">' + ico('check') + 'Calculado</span>';
    return '';
  }

  function campoTexto(etiqueta, campo, valor, confianza, tipo, clase) {
    var clases = 'input';
    if (tipo === 'revisar') clases += ' input--revisar';
    if (tipo === 'calc') clases += ' input--calc';
    return '<div class="campo ' + (clase || '') + '">'
      + '<span class="campo-label"><span>' + esc(etiqueta) + '</span>' + confianzaTag(confianza) + '</span>'
      + '<input class="' + clases + '" data-campo="' + campo + '" type="text"'
      + (tipo === 'calc' ? ' readonly' : '')
      + (tipo === 'decimal' || tipo === 'revisar' ? ' inputmode="decimal"' : '')
      + ' aria-label="' + esc(etiqueta) + '" value="' + esc(valor) + '"></div>';
  }

  function campoSelect(etiqueta, campo, opciones, valor, clase) {
    return '<div class="campo ' + (clase || '') + '"><span class="campo-label"><span>' + esc(etiqueta) + '</span></span>'
      + '<select class="input" data-campo="' + campo + '" aria-label="' + esc(etiqueta) + '">'
      + opciones.map(function (o) {
        return '<option value="' + o.id + '"' + (o.id === valor ? ' selected' : '') + '>' + esc(o.nombre) + '</option>';
      }).join('')
      + '</select></div>';
  }

  function varObra() { return D.obras[0]; }

  /* ================================================================ PANELES */
  function renderPanel(foco) {
    if (!estado.panel) {
      sheetRoot.innerHTML = '';
      return;
    }
    var partes = panelContenido(estado.panel);
    if (!partes) { sheetRoot.innerHTML = ''; return; }
    sheetRoot.innerHTML = '<div class="sheet-layer">'
      + '<button class="sheet-backdrop" type="button" data-accion="cerrar-panel" aria-label="Cerrar"></button>'
      + '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-titulo">'
      + '<span class="sheet-handle" aria-hidden="true"></span>'
      + '<div class="sheet-head"><h2 class="sheet-title" id="sheet-titulo">' + partes.titulo + '</h2>'
      + (partes.sub ? '<p class="sheet-sub">' + partes.sub + '</p>' : '') + '</div>'
      + '<div class="sheet-body">' + partes.cuerpo + '</div>'
      + (partes.pie ? '<div class="sheet-foot">' + partes.pie + '</div>' : '')
      + '</div></div>';
    var selector = foco || '.sheet-body button, .sheet-foot button, .sheet input, .sheet .sheet-row';
    var target = sheetRoot.querySelector(selector);
    if (target && target.focus) { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }
  }

  function panelContenido(panel) {
    switch (panel.tipo) {
      case 'acciones': return panelAcciones();
      case 'mas': return panelMas();
      case 'clasificar': return panelClasificar(panel.facturaId);
      case 'duplicado': return panelDuplicado(panel.facturaId);
      case 'partida': return panelPartida(panel.partidaId);
      case 'persona': return panelPersona(panel.personaId);
      case 'wsib': return panelWsib(panel.personaId);
      case 'pago': return panelPago();
      default: return null;
    }
  }

  function filaSheet(o) {
    var attrs = ' type="button"';
    if (o.accion) attrs += ' data-accion="' + o.accion + '"';
    if (o.datos) attrs += ' ' + o.datos;
    return '<button class="sheet-row' + (o.clase ? ' ' + o.clase : '') + '"' + attrs + '>'
      + '<span class="sheet-row-ico">' + ico(o.icono) + '</span>'
      + '<span class="sheet-row-main"><span class="sheet-row-title">' + esc(o.titulo) + '</span>'
      + '<span class="sheet-row-sub">' + esc(o.sub || '') + '</span></span>'
      + (o.derecha || '') + '</button>';
  }

  function panelAcciones() {
    return {
      titulo: '¿Qué quieres registrar?',
      sub: 'Acción rápida desde cualquier pantalla. Todo se guarda, aunque no haya señal.',
      cuerpo: filaSheet({ accion: 'accion-captura', icono: 'camara', titulo: 'Foto de factura', sub: 'La acción del día. Tres toques y queda.', derecha: '<span class="chip chip--accent">Principal</span>' })
        + filaSheet({ accion: 'pronto', icono: 'voz', titulo: 'Nota de voz', sub: 'Dicta el gasto y yo lo ordeno.', derecha: '<span class="chip chip--quiet">Pronto</span>' })
        + filaSheet({ accion: 'pronto', icono: 'mano', titulo: 'Gasto a mano', sub: 'Sin foto: monto, proveedor y partida.', derecha: '<span class="chip chip--quiet">Pronto</span>' })
        + filaSheet({ accion: 'pronto', icono: 'avance', titulo: 'Avance de obra', sub: 'Reporta el % de cada partida.', derecha: '<span class="chip chip--quiet">Pronto</span>' })
        + filaSheet({ accion: 'pronto', icono: 'pago', titulo: 'Pago a trabajador', sub: 'Pago suelto, fuera de la nómina.', derecha: '<span class="chip chip--quiet">Pronto</span>' }),
      pie: '<p class="sheet-caption">El prototipo navega el flujo de la factura. Las otras cuatro acciones quedan documentadas.</p>'
    };
  }

  function panelMas() {
    return {
      titulo: 'Más',
      sub: 'Lo que no se usa todos los días.',
      cuerpo: filaSheet({ accion: 'mas-margen', icono: 'avance', titulo: 'Margen de la obra', sub: '12 Maple Ave · ¿gana dinero?', derecha: '<span class="chip chip--quiet">Reporte</span>' })
        + filaSheet({ accion: 'pronto', icono: 'gastos', titulo: 'Catálogo de costos', sub: 'Precios por ítem con fecha y proveedor.', derecha: '<span class="chip chip--quiet">Pronto</span>' })
        + filaSheet({ accion: 'pronto', icono: 'doc', titulo: 'Documentos y fotos', sub: 'Facturas, change orders y reportes.', derecha: '<span class="chip chip--quiet">Pronto</span>' })
        + filaSheet({ accion: 'pronto', icono: 'equipo', titulo: 'Ajustes', sub: 'Parámetros, cuenta y exportar datos.', derecha: '<span class="chip chip--quiet">Pronto</span>' })
        + filaSheet({ accion: 'pronto', icono: 'info', titulo: 'Ayuda', sub: 'Cómo se usa cada cosa. Contacto humano.', derecha: '<span class="chip chip--quiet">Pronto</span>' }),
      pie: null
    };
  }

  function panelClasificar(facturaId) {
    var f = buscoFactura(facturaId);
    if (!f) return null;
    var filas = f.sugerencias.map(function (s, i) {
      var obra = buscarObra(s.obraId);
      var partida = buscarPartida(s.obraId, s.partidaId);
      return filaSheet({
        accion: 'elegir-partida', icono: 'obras',
        titulo: partida ? partida.nombre : 'Sin partida',
        sub: (obra ? obra.nombre : '') + ' · ' + pct(s.confianzaPpm, { min: 0, max: 0 }) + ' de confianza',
        datos: 'data-factura="' + f.id + '" data-obra="' + s.obraId + '" data-partida="' + s.partidaId + '"',
        derecha: i === 0 ? '<span class="chip chip--accent">' + ico('sparkle') + 'Sugerida</span>' : ''
      });
    }).join('');
    return {
      titulo: '¿A qué partida va?',
      sub: esc(f.proveedor) + ' · ' + esc(F.fechaSinAnio(f.fecha)) + ' · ' + esc(dinero(f.montoCents)),
      cuerpo: filas + filaSheet({
        accion: 'dejar-pendiente', icono: 'reloj', titulo: 'No sé · dejarlo pendiente',
        sub: 'Se queda en la bandeja. Nada se pierde.', datos: 'data-factura="' + f.id + '"'
      }),
      pie: '<p class="sheet-caption">Si no estás seguro, déjala pendiente: no se clasifica nada sin tu toque.</p>'
    };
  }

  function panelDuplicado(facturaId) {
    var f = buscoFactura(facturaId);
    if (!f) return null;
    var original = buscoFactura(f.duplicadoDe);
    return {
      titulo: 'Parece la misma factura del martes',
      sub: esc(f.proveedor) + ' · ' + esc(f.numero) + ' · ' + esc(dinero(f.montoCents)),
      cuerpo: '<div class="banner-alerta">' + ico('alerta') + '<div>Mismo proveedor, mismo número y mismo monto que la factura del ' + esc(F.diaSemana(original.fecha)) + ' ' + esc(F.fechaSinAnio(original.fecha)) + '.<span>No la clasifico sola: si es otra igual, lo confirmas tú.</span></div></div>'
        + '<div class="doc-card mt-3">'
        + '<div class="resumen-linea"><span>Factura del martes</span><strong>' + esc(F.fechaCorta(original.fecha)) + '</strong></div>'
        + '<div class="resumen-linea"><span>Monto</span><strong>' + esc(dinero(original.montoCents)) + '</strong></div>'
        + '<div class="resumen-linea"><span>Estado</span><strong>Por clasificar</strong></div>'
        + '</div>',
      pie: '<button class="btn btn--primary" type="button" data-accion="dup-otra" data-factura="' + f.id + '">Sí, es otra igual</button>'
        + '<button class="btn btn--secondary" type="button" data-accion="dup-descartar" data-factura="' + f.id + '">Descartar duplicado</button>'
    };
  }

  function panelPartida(partidaId) {
    var o = buscarObra('maple');
    var p = buscarPartida('maple', partidaId);
    if (!p) return null;
    var desvio = p.gastadoCents - p.presupuestoCents;
    var sobregirada = p.gastadoCents > p.presupuestoCents;
    var facturas = p.facturas || [];
    var totalFacturas = facturas.reduce(function (a, f) { return a + f.montoCents; }, 0);
    var cuerpo = '<div class="partida-grid">'
      + numeroPartida('Presupuesto', p.presupuestoCents)
      + numeroPartida('Comprometido', p.compromisoCents)
      + numeroPartida('Gastado', p.gastadoCents)
      + numeroPartida('Pagado', p.pagadoCents)
      + '</div>'
      + '<div class="campo-fila mt-2">' + chipDesvio(p) + '<span class="param-version">Desvío ' + esc(dineroSigno(desvio)) + '</span></div>';
    if (sobregirada) {
      cuerpo += '<div class="banner-alerta mt-3">' + ico('alerta') + '<div>Alerta · partida sobregirada<span>No puedo registrar más gasto ni avance en ' + esc(p.nombre) + ' hasta que apruebes un change order.</span></div></div>';
    }
    cuerpo += '<div class="doc-card mt-3">'
      + '<div class="resumen-linea"><span>Compromiso antes de la factura</span><strong>' + esc(p.po ? p.po.numero : '—') + '</strong></div>'
      + '<div class="resumen-linea"><span>Monto del PO</span><strong>' + esc(dinero(p.po ? p.po.montoCents : p.compromisoCents)) + '</strong></div>'
      + '<div class="resumen-linea"><span>Facturas registradas</span><strong>' + facturas.length + ' · ' + esc(dinero(totalFacturas)) + '</strong></div>'
      + '</div>';
    if (facturas.length) {
      cuerpo += '<p class="section-title mt-4">Facturas de la partida</p>'
        + facturas.map(function (f) {
          return '<div class="resumen-linea"><span>' + esc(f.numero) + ' · ' + esc(F.fechaSinAnio(f.fecha)) + '</span><strong>' + esc(dinero(f.montoCents)) + '</strong></div>';
        }).join('');
    }
    cuerpo += '<p class="varianza-nota mt-3">El compromiso (PO) está a la vista antes de que entre la factura: así el gasto nunca aparece de sorpresa.</p>';
    var pie = sobregirada
      ? '<button class="btn btn--primary" type="button" data-accion="crear-change-order">Crear change order</button>'
        + '<button class="btn btn--secondary" type="button" data-accion="ver-facturas-partida">Ver facturas</button>'
      : '<button class="btn btn--primary" type="button" data-accion="cerrar-panel">Listo</button>';
    return {
      titulo: esc(p.nombre),
      sub: esc(o.nombre) + ' · ' + (sobregirada ? 'pasada de presupuesto' : 'dentro del presupuesto'),
      cuerpo: cuerpo,
      pie: pie
    };
  }

  function panelPersona(personaId) {
    var p = personaPorId(personaId);
    if (!p) return null;
    var c = calcPersona(p);
    var cuerpo = '';

    if (p.modalidad === 'hora') {
      cuerpo += '<p class="section-title">Horas por día</p>';
      cuerpo += p.horasMitades.map(function (mit, i) {
        return '<div class="dia-row"><span class="dia-nombre">' + DIAS[i] + '</span>'
          + '<span class="stepper">'
          + '<button class="stepper-btn" type="button" data-accion="hora-paso" data-persona="' + p.id + '" data-dia="' + i + '" data-paso="-1" aria-label="Quitar media hora al ' + DIAS[i].toLowerCase() + '">−</button>'
          + '<span class="stepper-value" data-val-dia="' + i + '">' + esc(formatoHoras(mit)) + '<small>horas</small></span>'
          + '<button class="stepper-btn" type="button" data-accion="hora-paso" data-persona="' + p.id + '" data-dia="' + i + '" data-paso="1" aria-label="Agregar media hora al ' + DIAS[i].toLowerCase() + '">+</button>'
          + '</span></div>';
      }).join('');
      cuerpo += '<div class="notice mt-3"><span class="notice-ico">' + ico('reloj') + '</span><div class="notice-body">'
        + '<p class="notice-title">Overtime: ' + esc(formatoHoras(c.otMit)) + ' h</p>'
        + '<p class="notice-text">Regla ' + esc(P.overtime.etiqueta) + ' · ' + P.overtime.horasSemanales + ' h por semana · ' + esc(P.overtime.fuente) + '. Se paga a ' + fmtFactor(P.overtime.factorPpm) + '.</p>'
        + '</div></div>';
      cuerpo += '<div class="resumen-linea mt-3"><span>Horas regulares</span><strong>' + esc(formatoHoras(c.regMit)) + ' h × ' + esc(dinero(p.tarifaHoraCents)) + '</strong></div>'
        + '<div class="resumen-linea"><span>Overtime</span><strong>' + esc(formatoHoras(c.otMit)) + ' h × ' + fmtFactor(P.overtime.factorPpm) + ' = ' + esc(dinero(Math.round((p.tarifaHoraCents * c.otMit * 3) / 4))) + '</strong></div>'
        + '<div class="resumen-linea resumen-linea--total"><span>Bruto</span><strong data-cal="bruto">' + esc(dinero(c.brutoCents)) + '</strong></div>';
    } else {
      var unidad = p.unidad;
      var paso = p.modalidad === 'destajo' ? 100 : 1; /* mitades: 50 sq ft o 0,5 día */
      cuerpo += '<p class="section-title">' + esc(p.concepto) + '</p>'
        + '<div class="dia-row"><span class="dia-nombre">Cantidad</span>'
        + '<span class="stepper stepper-mini">'
        + '<button class="stepper-btn" type="button" data-accion="cantidad-paso" data-persona="' + p.id + '" data-paso="-' + paso + '" aria-label="Quitar ' + (p.modalidad === 'destajo' ? '50 sq ft' : 'media jornada') + '">−</button>'
        + '<span class="stepper-value" data-cantidad="1">' + esc(formatoHoras(p.cantidadMitades)) + '<small>' + esc(unidad) + '</small></span>'
        + '<button class="stepper-btn" type="button" data-accion="cantidad-paso" data-persona="' + p.id + '" data-paso="' + paso + '" aria-label="Agregar ' + (p.modalidad === 'destajo' ? '50 sq ft' : 'media jornada') + '">+</button>'
        + '</span></div>'
        + '<div class="resumen-linea"><span>Tarifa</span><strong>' + esc(dinero(p.tarifaUnidadCents)) + ' por ' + esc(unidad.toLowerCase()) + '</strong></div>'
        + '<div class="resumen-linea resumen-linea--total"><span>Bruto</span><strong data-cal="bruto">' + esc(dinero(c.brutoCents)) + '</strong></div>'
        + (p.modalidad === 'destajo' ? '<p class="varianza-nota mt-2">El contratista no genera carga patronal, pero debe tener WSIB y HST vigentes. La app bloquea el pago si falta un documento.</p>' : '');
    }

    if (!p.wsibVigente) {
      cuerpo += '<div class="persona-bloqueo mt-3">' + ico('alerta') + '<div><strong>Pago bloqueado</strong>: WSIB vencido el ' + esc(F.fechaCorta(p.wsibVence)) + '.<span>Sin clearance vigente no se puede pagar. Los otros pagos no se bloquean.</span></div></div>';
    }

    var pie = '';
    if (!p.wsibVigente) {
      pie += '<button class="btn btn--primary" type="button" data-accion="nomina-doc" data-persona="' + p.id + '">Ver documento de WSIB</button>';
      pie += '<button class="btn btn--secondary" type="button" data-accion="guardar-horas" data-persona="' + p.id + '">Guardar cambios</button>';
    } else {
      pie += '<button class="btn btn--primary" type="button" data-accion="guardar-horas" data-persona="' + p.id + '">Guardar ' + (p.modalidad === 'hora' ? 'horas' : 'cantidad') + '</button>';
    }
    var sub = (p.modalidad === 'hora'
      ? 'Hora · ' + dinero(p.tarifaHoraCents) + '/h · ' + hhmm(c.horasMitades)
      : (p.modalidad === 'destajo' ? 'Destajo · ' + p.unidad : 'Jornal · ' + p.unidad));
    return { titulo: esc(p.nombre), sub: esc(sub), cuerpo: cuerpo, pie: pie };
  }
  function fmtFactor(ppm) { return String(ppm / 1000000).replace('.', ',') + '×'; }

  function panelWsib(personaId) {
    var p = personaPorId(personaId);
    if (!p) return null;
    return {
      titulo: 'Clearance de WSIB vencido',
      sub: esc(p.nombre) + ' · ' + esc(p.rol),
      cuerpo: '<div class="banner-alerta">' + ico('alerta') + '<div>No puedo pagar a ' + esc(p.nombre) + '<span>El clearance venció el ' + esc(F.fechaCorta(p.wsibVence)) + '. Vale un máximo de ' + P.wsibClearanceDias + ' días. Los otros 4 pagos siguen su curso.</span></div></div>'
        + '<div class="doc-card mt-3">'
        + '<div class="resumen-linea"><span>Tipo de documento</span><strong>' + esc(p.documentoTipo) + '</strong></div>'
        + '<div class="resumen-linea"><span>Número</span><strong>' + esc(p.documentoNumero || '—') + '</strong></div>'
        + '<div class="resumen-linea"><span>Vencio</span><strong class="text-danger">' + esc(F.fechaCorta(p.wsibVence)) + '</strong></div>'
        + '<div class="resumen-linea"><span>Vigencia máxima</span><strong>' + P.wsibClearanceDias + ' días</strong></div>'
        + '<div class="resumen-linea"><span>HST registrado</span><strong>' + esc(p.hstNumero || '—') + '</strong></div>'
        + '</div>'
        + '<p class="varianza-nota mt-3">En Ontario, un clearance de WSIB vence a los 90 días. La app bloquea el pago antes de que el problema llegue al banco.</p>',
      pie: '<button class="btn btn--primary" type="button" data-accion="subir-documento">Subir documento nuevo</button>'
        + '<button class="btn btn--secondary" type="button" data-accion="cerrar-panel">Cerrar</button>'
    };
  }

  function panelPago() {
    var c = calcNomina();
    var bloqueado = c.bloqueado;
    var brutoBloqueado = bloqueado ? calcPersona(bloqueado).brutoCents : 0;
    return {
      titulo: 'Revisar y pagar',
      sub: 'Semana ' + D.nomina.semana + ' · ' + esc(D.nomina.periodo),
      cuerpo: '<span class="kpi-label">Vas a pagar</span>'
        + '<span class="confirm-total">' + esc(dinero(c.pagableCents)) + '</span>'
        + '<p class="page-sub mt-2">¿Pagar ' + esc(dinero(c.pagableCents)) + ' a ' + c.cantidadPagable + ' personas?'
        + (bloqueado ? ' ' + esc(bloqueado.nombre) + ' queda fuera: WSIB vencido.' : '') + '</p>'
        + '<p class="section-title mt-4">Método de pago</p>'
        + '<div class="metodo-lista">'
        + metodo('e-transfer', 'e-transfer', 'transfer', 'A tu cuenta guardada.')
        + metodo('cheque', 'Cheque', 'doc', 'Número de cheque en el comprobante.')
        + metodo('efectivo', 'Efectivo', 'billete', 'Registra el pago y la fecha.')
        + '</div>'
        + '<p class="section-title mt-4">La semana completa</p>'
        + '<div class="resumen-linea"><span>Bruto (' + c.cantidadTotal + ' personas)</span><strong>' + esc(dinero(c.brutoTotalCents)) + '</strong></div>'
        + '<div class="resumen-linea"><span>Carga patronal</span><strong>' + esc(dinero(c.cargaTotalCents)) + '</strong></div>'
        + '<div class="resumen-linea"><span>Costo total de la semana</span><strong>' + esc(dinero(c.costoTotalCents)) + '</strong></div>'
        + (bloqueado ? '<div class="resumen-linea"><span>Bloqueado · ' + esc(bloqueado.nombre) + '</span><strong class="text-danger">−' + esc(dinero(brutoBloqueado)) + '</strong></div>' : '')
        + '<div class="resumen-linea resumen-linea--total"><span>Este pago</span><strong>' + esc(dinero(c.pagableCents)) + '</strong></div>',
      pie: '<button class="btn btn--primary" type="button" data-accion="confirmar-pago">Confirmar pago · ' + esc(dinero(c.pagableCents)) + '</button>'
        + '<button class="btn btn--secondary" type="button" data-accion="cerrar-panel">Cancelar</button>'
    };
  }
  function metodo(valor, nombre, icono, detalle) {
    var checked = estado.nomina.metodo === valor ? ' checked' : '';
    return '<label class="metodo"><input type="radio" name="metodo-pago" value="' + valor + '"' + checked + '>'
      + '<span class="sheet-row-ico">' + ico(icono) + '</span>'
      + '<span><strong>' + esc(nombre) + '</strong><span class="sheet-row-sub">' + esc(detalle) + '</span></span>'
      + '</label>';
  }

  /* ================================================================= TOAST */
  var toastTimer = null;
  var toastCallback = null;
  function mostrarToast(mensaje, etiquetaAccion, callback) {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastCallback = callback || null;
    estado.toast = { mensaje: mensaje, accion: etiquetaAccion || null };
    renderToast();
    toastTimer = setTimeout(function () {
      estado.toast = null;
      toastCallback = null;
      renderToast();
    }, 10000);
  }
  function renderToast() {
    if (!estado.toast) { toastRoot.innerHTML = ''; return; }
    toastRoot.innerHTML = '<div class="toast"><span class="toast-msg">' + esc(estado.toast.mensaje) + '</span>'
      + (estado.toast.accion ? '<button class="toast-action" type="button" data-accion="toast-accion">' + esc(estado.toast.accion) + '</button>' : '')
      + '<span class="toast-progress" aria-hidden="true"></span></div>';
  }
  function cerrarToast() {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    estado.toast = null;
    renderToast();
  }

  /* ================================================================ RUTAS */
  function parseRuta(hash) {
    var raw = String(hash || '').replace(/^#\/?/, '');
    if (!raw) return { nombre: 'hoy', params: {} };
    var idx = raw.indexOf('?');
    var nombre = idx === -1 ? raw : raw.slice(0, idx);
    var query = idx === -1 ? '' : raw.slice(idx + 1);
    var params = {};
    if (query) {
      query.split('&').forEach(function (par) {
        var kv = par.split('=');
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    if (RUTAS.indexOf(nombre) === -1) nombre = 'hoy';
    return { nombre: nombre, params: params };
  }

  function aplicarRuta() {
    var r = parseRuta(location.hash);
    estado.ruta = r.nombre;
    estado.params = r.params;
    clearTimeout(capturaTimer);
    cerrarPanel(false);
    if (r.nombre === 'captura') { aplicarEstadoCaptura(r.params); }
    if (r.nombre === 'clasificar' && r.params.vacio === '1') {
      D.facturas.forEach(function (f) { estado.clasificar.resueltas[f.id] = { metodo: 'pendiente' }; });
    }
    render();
    if (r.params.panel) { aplicarPanelQA(r.params); }
    app.scrollTop = 0;
    try { app.focus({ preventScroll: true }); } catch (e) { /* sin foco programático */ }
  }

  var capturaTimer = null;
  var FASES_CAPTURA = ['camara', 'leyendo', 'revision', 'error', 'guardada'];
  function aplicarEstadoCaptura(params) {
    var c = estado.captura;
    var e = params && params.estado;
    c.fase = FASES_CAPTURA.indexOf(e) >= 0 ? e : 'camara';
    if (e === 'offline') {
      c.fase = 'revision';
      c.sinSenal = true;
      estado.offline = true;
      estado.pendientes = 1;
    }
    if (!MODO_QA && c.fase === 'leyendo') {
      capturaTimer = setTimeout(function () {
        c.fase = c.errorSim ? 'error' : 'revision';
        render();
      }, 1500);
    }
  }

  /* Paneles accesibles por URL solo para QA y capturas (no son navegación real) */
  function aplicarPanelQA(params) {
    var p = params.panel;
    if (p === 'acciones') estado.panel = { tipo: 'acciones' };
    else if (p === 'mas') estado.panel = { tipo: 'mas' };
    else if (p === 'partida') estado.panel = { tipo: 'partida', partidaId: params.id || 'plomeria' };
    else if (p === 'persona') estado.panel = { tipo: 'persona', personaId: params.id || 'pD' };
    else if (p === 'wsib') estado.panel = { tipo: 'wsib', personaId: params.id || 'pD' };
    else if (p === 'pago') estado.panel = { tipo: 'pago' };
    else if (p === 'factura') estado.panel = { tipo: 'clasificar', facturaId: params.id || 'f1' };
    else if (p === 'duplicado') estado.panel = { tipo: 'duplicado', facturaId: params.id || 'f6' };
    if (estado.panel) { renderPanel(); renderNav(); }
  }

  function ir(ruta) {
    cerrarPanel(false);
    if (location.hash === ruta) {
      aplicarRuta();
    } else {
      location.hash = ruta;
    }
  }

  /* ============================================================== acciones */
  function abrirPanel(panel) {
    estado.ultimoFoco = document.activeElement;
    estado.panel = panel;
    renderNav();
    renderPanel();
  }
  function cerrarPanel(restaurarFoco) {
    if (!estado.panel) { sheetRoot.innerHTML = ''; return; }
    estado.panel = null;
    sheetRoot.innerHTML = '';
    renderNav();
    if (restaurarFoco !== false && estado.ultimoFoco && estado.ultimoFoco.focus) {
      try { estado.ultimoFoco.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    }
    estado.ultimoFoco = null;
  }

  function clasificarFactura(id, obraId, partidaId, mensaje) {
    estado.clasificar.resueltas[id] = { metodo: 'partida', obraId: obraId, partidaId: partidaId };
    cerrarPanel();
    render(true);
    mostrarToast(mensaje || ('Clasificada en ' + nombrePartida(obraId, partidaId)), 'Deshacer', function () {
      delete estado.clasificar.resueltas[id];
      render(true);
      mostrarToast('Listo, la factura volvió a la bandeja');
    });
  }

  function accionHora(personaId, dia, paso) {
    var p = personaPorId(personaId);
    if (!p) return;
    var i = Number(dia);
    var nuevo = p.horasMitades[i] + Number(paso);
    p.horasMitades[i] = Math.max(0, Math.min(32, nuevo));
    renderPanel('[data-accion="hora-paso"][data-dia="' + i + '"][data-paso="' + paso + '"]');
  }
  function accionCantidad(personaId, paso) {
    var p = personaPorId(personaId);
    if (!p) return;
    var max = p.modalidad === 'destajo' ? 10000 : 16;
    var nuevo = Math.max(0, Math.min(max, p.cantidadMitades + Number(paso)));
    p.cantidadMitades = nuevo;
    renderPanel('[data-accion="cantidad-paso"][data-paso="' + paso + '"]');
  }

  function guardarHoras(personaId) {
    cerrarPanel();
    render(true);
    mostrarToast('Horas guardadas · ' + D.nomina.periodo, 'Deshacer', function () {
      restaurarNomina();
      render(true);
      mostrarToast('Listo, volvieron las horas de antes');
    });
  }

  /* Deshacer horas: guardamos una foto al abrir el panel para poder volver */
  var fotoNomina = null;
  function fotografiarNomina() {
    fotoNomina = estado.nomina.personas.map(function (p) {
      var c = {};
      Object.keys(p).forEach(function (k) {
        c[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
      });
      return c;
    });
  }
  function restaurarNomina() {
    if (!fotoNomina) return;
    estado.nomina.personas = fotoNomina.map(function (p) {
      var c = {};
      Object.keys(p).forEach(function (k) {
        c[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
      });
      return c;
    });
    fotoNomina = null;
  }

  function guardarFactura() {
    var c = estado.captura;
    var totalInput = $('[data-campo="total"]');
    var subtotalInput = $('[data-campo="subtotal"]');
    var total = totalInput ? centsDesdeTexto(totalInput.value) : c.totalCents;
    var subtotal = subtotalInput ? centsDesdeTexto(subtotalInput.value) : c.subtotalCents;
    if (!total || total <= 0) {
      mostrarToast('No pude leer ese total. ¿Lo escribes otra vez?');
      if (totalInput) totalInput.focus();
      return;
    }
    c.totalCents = total;
    c.subtotalCents = subtotal || Math.max(0, total - Math.round((total * P.hst.ppm) / (1000000 + P.hst.ppm)));
    c.guardada = true;
    c.fase = 'guardada';
    if (c.sinSenal) {
      estado.offline = true;
      estado.pendientes = 1;
      render();
      mostrarToast(D.estados.captura.sinSenal, null);
    } else {
      render();
      mostrarToast('Factura guardada · 12 Maple Ave · Materiales', 'Deshacer', function () {
        c.fase = 'revision';
        c.guardada = false;
        render();
        mostrarToast('Listo, la factura no se guardó');
      });
    }
  }

  function centsDesdeTexto(texto) {
    var limpio = String(texto).replace(/[^\d,.-]/g, '');
    if (limpio.indexOf(',') >= 0) {
      limpio = limpio.replace(/\./g, '').replace(',', '.');
    } else {
      limpio = limpio.replace(/,/g, '');
    }
    var n = parseFloat(limpio);
    if (!isFinite(n)) return 0;
    return Math.round(n * 100);
  }

  function recalcularCaptura() {
    var sub = $('[data-campo="subtotal"]');
    var hst = $('[data-campo="hst"]');
    var tot = $('[data-campo="total"]');
    if (!sub || !hst || !tot) return;
    var subtotal = centsDesdeTexto(sub.value);
    var impuesto = Math.round((subtotal * P.hst.ppm) / 1000000);
    hst.value = moneyPlain(impuesto);
    tot.value = moneyPlain(subtotal + impuesto);
  }

  /* ============================================================ interacción */
  document.addEventListener('click', function (evento) {
    var el = evento.target.closest('[data-accion]');
    if (!el) return;
    var accion = el.getAttribute('data-accion');
    var facturaId = el.getAttribute('data-factura');
    var personaId = el.getAttribute('data-persona');
    var partidaId = el.getAttribute('data-partida');
    var obraId = el.getAttribute('data-obra');

    switch (accion) {
      case 'ir':
        evento.preventDefault();
        ir(el.getAttribute('data-ruta') || '#/hoy');
        break;
      case 'cuenta':
        mostrarToast('Cuenta de Diego Bermúdez · sesión de prueba del prototipo');
        break;
      case 'abrir-obra':
        evento.preventDefault();
        if (el.getAttribute('data-obra') === 'maple') { ir('#/obra'); }
        else { mostrarToast('En el prototipo armé el detalle de 12 Maple Ave. 88 Bloor viene después.'); }
        break;
      case 'ver-partida':
        abrirPanel({ tipo: 'partida', partidaId: partidaId });
        break;
      case 'abrir-clasificar':
        var f = buscoFactura(facturaId);
        abrirPanel({ tipo: f && f.duplicadoDe ? 'duplicado' : 'clasificar', facturaId: facturaId });
        break;
      case 'elegir-partida':
        clasificarFactura(facturaId, obraId, partidaId);
        break;
      case 'dejar-pendiente':
        estado.clasificar.resueltas[facturaId] = { metodo: 'pendiente' };
        cerrarPanel();
        render(true);
        mostrarToast('Guardada como pendiente · Deshacer', 'Deshacer', function () {
          delete estado.clasificar.resueltas[facturaId];
          render(true);
          mostrarToast('Listo, volvió a la bandeja');
        });
        break;
      case 'dup-otra':
        var fd = buscoFactura(facturaId);
        var sug = fd.sugerencias[0];
        clasificarFactura(facturaId, sug.obraId, sug.partidaId, 'Es otra igual · clasificada en ' + nombrePartida(sug.obraId, sug.partidaId));
        break;
      case 'dup-descartar':
        estado.clasificar.resueltas[facturaId] = { metodo: 'duplicado' };
        cerrarPanel();
        render(true);
        mostrarToast('Duplicado descartado · Deshacer', 'Deshacer', function () {
          delete estado.clasificar.resueltas[facturaId];
          render(true);
          mostrarToast('Listo, la factura volvió a la bandeja');
        });
        break;
      case 'ver-persona':
        fotografiarNomina();
        abrirPanel({ tipo: 'persona', personaId: personaId });
        break;
      case 'nomina-doc':
        abrirPanel({ tipo: 'wsib', personaId: personaId });
        break;
      case 'hora-paso':
        accionHora(personaId, el.getAttribute('data-dia'), el.getAttribute('data-paso'));
        break;
      case 'cantidad-paso':
        accionCantidad(personaId, el.getAttribute('data-paso'));
        break;
      case 'guardar-horas':
        guardarHoras(personaId);
        break;
      case 'revisar-pago':
        abrirPanel({ tipo: 'pago' });
        break;
      case 'confirmar-pago':
        var radio = $('input[name="metodo-pago"]:checked');
        estado.nomina.metodo = radio ? radio.value : 'e-transfer';
        estado.nomina.pagada = true;
        var cn = calcNomina();
        estado.panel = null;
        sheetRoot.innerHTML = '';
        render();
        mostrarToast('Pago registrado · ' + cn.cantidadPagable + ' personas · ' + dinero(cn.pagableCents), 'Deshacer', function () {
          estado.nomina.pagada = false;
          render();
          mostrarToast('Listo, el pago no se registró');
        });
        break;
      case 'abrir-mas':
        abrirPanel({ tipo: 'mas' });
        break;
      case 'mas-margen':
        cerrarPanel(false);
        ir('#/margen');
        break;
      case 'accion-captura':
        cerrarPanel(false);
        estado.captura.fase = 'camara';
        ir('#/captura');
        break;
      case 'tomar-foto':
        estado.captura.fase = 'leyendo';
        render();
        if (!MODO_QA) {
          clearTimeout(capturaTimer);
          capturaTimer = setTimeout(function () {
            estado.captura.fase = estado.captura.errorSim ? 'error' : 'revision';
            render();
          }, 1500);
        }
        break;
      case 'simular-error':
        estado.captura.errorSim = !estado.captura.errorSim;
        render(true);
        mostrarToast(estado.captura.errorSim ? 'El próximo escaneo va a fallar (simulación)' : 'El escaneo vuelve a funcionar');
        break;
      case 'simular-sin-senal':
        estado.offline = !estado.offline;
        estado.captura.sinSenal = estado.offline;
        estado.pendientes = 1;
        render(true);
        if (estado.offline) { mostrarToast('Sin conexión · 1 cambio esperando'); }
        break;
      case 'captura-escribir':
        estado.captura.fase = 'revision';
        render();
        setTimeout(function () { var t = $('[data-campo="total"]'); if (t) { t.focus(); t.select(); } }, 60);
        break;
      case 'captura-repetir':
        estado.captura.fase = 'camara';
        estado.captura.errorSim = false;
        render();
        break;
      case 'captura-otra':
        estado.captura.fase = 'camara';
        estado.captura.guardada = false;
        estado.captura.catalogo = null;
        render();
        break;
      case 'catalogo-aceptar':
        estado.captura.catalogo = 'aceptado';
        render(true);
        mostrarToast('Precio del catálogo actualizado · ' + dinero(D.catalogo.precioNuevoCents), 'Deshacer', function () {
          estado.captura.catalogo = null;
          render(true);
          mostrarToast('Listo, el precio quedó como estaba');
        });
        break;
      case 'catalogo-rechazar':
        estado.captura.catalogo = 'rechazado';
        render(true);
        mostrarToast('Sin cambios. El precio anterior sigue en el catálogo.');
        break;
      case 'guardar-factura':
        guardarFactura();
        break;
      case 'crear-change-order':
        cerrarPanel();
        mostrarToast('Change order en borrador. No suma al presupuesto hasta que lo apruebes.');
        break;
      case 'ver-facturas-partida':
        mostrarToast('Las facturas de la partida están en el detalle y en Gastos.');
        break;
      case 'avance-obra':
        mostrarToast('Registrar avance: el flujo completo viene en la próxima pantalla del prototipo.');
        break;
      case 'subir-documento':
        cerrarPanel();
        mostrarToast('Documento en revisión. El pago se desbloquea cuando esté validado.');
        break;
      case 'flash':
        mostrarToast('Flash automático. La cámara de este prototipo es una simulación.');
        break;
      case 'pronto':
        mostrarToast('Esta acción todavía no está en el prototipo. La dejé documentada.');
        break;
      case 'cerrar-panel':
        cerrarPanel();
        break;
      case 'toast-accion':
        var cb = toastCallback;
        toastCallback = null;
        cerrarToast();
        if (cb) cb();
        break;
      case 'ir-partida':
        ir('#/obra');
        break;
      default:
        break;
    }
  });

  document.addEventListener('change', function (evento) {
    var t = evento.target;
    if (!t || !t.getAttribute) return;
    var campo = t.getAttribute('data-campo');
    if (campo === 'subtotal') { recalcularCaptura(); return; }
    if (campo === 'total') {
      var cent = centsDesdeTexto(t.value);
      if (cent > 0) { t.value = moneyPlain(cent); }
      return;
    }
    if (campo === 'obra') {
      estado.captura.obraId = t.value;
      var o = buscarObra(t.value);
      if (o && o.partidas.length) { estado.captura.partidaId = o.partidas[0].id; }
      render(true);
      return;
    }
    if (campo === 'partida') {
      estado.captura.partidaId = t.value;
      return;
    }
    if (t.name === 'metodo-pago') { estado.nomina.metodo = t.value; }
  });

  document.addEventListener('input', function (evento) {
    var t = evento.target;
    if (t && t.getAttribute && t.getAttribute('data-campo') === 'subtotal') { recalcularCaptura(); }
  });

  document.addEventListener('keydown', function (evento) {
    if (!estado.panel) return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrarPanel();
      return;
    }
    if (evento.key !== 'Tab') return;
    var focos = $$('.sheet button, .sheet input, .sheet select, .sheet [tabindex]:not([tabindex="-1"])', sheetRoot)
      .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
    if (!focos.length) return;
    var primero = focos[0];
    var ultimo = focos[focos.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  });

  fab.addEventListener('click', function () { abrirPanel({ tipo: 'acciones' }); });

  window.addEventListener('hashchange', aplicarRuta);
  window.addEventListener('beforeunload', function () { clearTimeout(capturaTimer); });

  /* QA: marca de texto grande y arranque */
  var paramsInit = parseRuta(location.hash);
  if (paramsInit.params.texto === '200') {
    document.documentElement.classList.add('texto-grande');
  }
  if (!location.hash) {
    estado.ruta = 'hoy';
    render();
  } else {
    aplicarRuta();
  }
})();


/* --- Aviso de demostración en la copia pública (GitHub Pages) -------------
   Solo se muestra cuando la app se sirve desde *.github.io: el prototipo local
   que se usa en la demo con Diego queda exactamente igual que hasta ahora. */
(function () {
  if (!/(^|\.)github\.io$/.test(location.hostname)) return;
  if (document.querySelector('.demo-flag')) return;
  var aviso = document.createElement('a');
  aviso.className = 'demo-flag';
  aviso.href = 'https://github.com/dsrzhq/old';
  aviso.textContent = 'Demo · datos de ejemplo';
  aviso.setAttribute('aria-label', 'Demostración con datos de ejemplo. Abrir repositorio.');
  document.body.appendChild(aviso);
})();
