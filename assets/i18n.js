/* RUMBO · capa de idioma.
   - Local (demo con Diego): español.
   - Publicado en *.github.io: inglés canadiense (en-CA).
   - Forzable con ?lang=en o ?lang=es.
   Traduce el DOM ya renderizado (texto y atributos) y las pantallas que se
   vuelven a pintar, con un Observador de mutaciones. */
(function () {
  'use strict';
  var MAP = window.RUMBO_EN || {};
  var lang = window.__RUMBO_LANG || 'es';
  if (lang !== 'en') return;

  document.documentElement.lang = 'en-CA';
  var FALTAN = window.__I18N_FALTANTES = [];
  var MESES = { ene: 'Jan', feb: 'Feb', mar: 'Mar', abr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dec' };


  var DATOS = [
    [/(^|\b)IA:/g, '$1AI:'],
    [/Materiales de cocina/g, 'Kitchen materials'],
    [/Materiales de baño/g, 'Bathroom materials'],
    [/Mesada de cuarzo/g, 'Quartz countertop'],
    [/Pisos de cerámica/g, 'Ceramic flooring'],
    [/Muebles de cocina/g, 'Kitchen cabinets'],
    [/Demolición y desalojo/g, 'Demolition & disposal'],
    [/Estructura y drywall/g, 'Framing & drywall'],
    [/Electricidad \(subcontrato\)/g, 'Electrical (subcontract)'],
    [/Plomería \(subcontrato\)/g, 'Plumbing (subcontract)'],
    [/Electricidad/g, 'Electrical'],
    [/Plomería/g, 'Plumbing'],
    [/Pintura/g, 'Painting'],
    [/Otros y misceláneos/g, 'Other & miscellaneous'],
    [/Renovación de cocina/g, 'Kitchen renovation'],
    [/Cocina \+ baño/g, 'Kitchen + bath'],
    [/Precio fijo/g, 'Fixed price'],
    [/Comisión/g, 'Commission'],
    [/por ciento/g, 'percent'],
    [/Semana (\d+)/g, 'Week $1']
  ];
  function datos(s) {
    for (var i = 0; i < DATOS.length; i++) s = s.replace(DATOS[i][0], DATOS[i][1]);
    return s;
  }

  function fechas(s) {
    s = s.replace(/\b(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})\b/g,
      function (_, d, m, y) { return MESES[m] + ' ' + d + ', ' + y; });
    s = s.replace(/\b(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/g,
      function (_, d, m) { return MESES[m] + ' ' + d; });
    s = s.replace(/Semana\s+(\d+)/g, 'Week $1');
    return s;
  }
  function dinero(s) {
    s = s.replace(/\$\s?(\d{1,3}(?:\.\d{3})+)(?:,(\d{2}))?/g, function (_, i, d) {
      return '$' + i.replace(/\./g, ',') + (d ? '.' + d : '');
    });
    s = s.replace(/(\d),(\d{2})\s?%/g, '$1.$2%');
    s = s.replace(/(\d+)\s?%/g, '$1%');
    return s;
  }
  function patrones(s) {
    var r = [
      [/^(\d+) de (\d+) clasificadas$/, function (_, a, b) { return a + ' of ' + b + ' classified'; }],
      [/^(\d+) facturas?$/, function (_, n) { return n === '1' ? '1 invoice' : n + ' invoices'; }],
      [/^(\d+) partidas$/, function (_, n) { return n + ' cost codes'; }],
      [/^(\d+) personas$/, function (_, n) { return n + ' people'; }],
      [/^(\d+) activas$/, function (_, n) { return n + ' active'; }],
      [/^(\d+) obras activas$/, function (_, n) { return n + ' active projects'; }],
      [/^Avance (\d+) %$/, function (_, n) { return 'Progress ' + n + '%'; }],
      [/^Gastado (\d+) %$/, function (_, n) { return 'Spent ' + n + '%'; }],
      [/^Falta pagar (.+)$/, function (_, m) { return 'Still to pay ' + m; }],
      [/^Desvío (.+)$/, function (_, m) { return 'Variance ' + m; }],
      [/^(\d+) cambios esperando$/, function (_, n) { return n + ' changes waiting'; }],
      [/^(\d+) cambios sin subir$/, function (_, n) { return n + ' changes to upload'; }],
      [/^(\d+) h extra$/, function (_, n) { return n + ' h overtime'; }],
      [/^Rango de margen entre ([\d.,]+) % y ([\d.,]+) %, muy por debajo del mínimo del (\d+) por ciento$/,
        function (_, a, b, c) { return 'Margin range between ' + a + '% and ' + b + '%, far below the ' + c + ' percent minimum'; }],
      [/^(.+), (\$[\d.,]+)\. IA: (.+)$/, function (_, p, m, r) { return p + ', ' + m + '. AI: ' + r; }]
    ];
    for (var i = 0; i < r.length; i++) if (r[i][0].test(s)) return s.replace(r[i][0], r[i][1]);
    return null;
  }
  function traducir(s) {
    var key = s.replace(/\s+/g, ' ').trim();
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(MAP, key)) return dinero(fechas(datos(MAP[key])));
    var p = patrones(key);
    if (p !== null) return dinero(fechas(datos(p)));
    if (/[áéíóúñ¿¡]|\b(de|la|el|los|las|para|por|con|tu|tus|que|del)\b/i.test(key)) {
      if (FALTAN.indexOf(key) === -1) FALTAN.push(key);
    }
    return null;
  }
  var vistos = new WeakSet();
  function nodoTexto(n) {
    if (!n || vistos.has(n)) return;
    var s = n.nodeValue;
    if (!s || !s.trim()) { vistos.add(n); return; }
    var ini = s.match(/^\s*/)[0], fin = s.match(/\s*$/)[0];
    var t = traducir(s);
    if (t !== null && t !== s) n.nodeValue = ini + t + fin;
    vistos.add(n);
  }
  function atributos(el) {
    ['aria-label', 'title', 'placeholder', 'alt'].forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (!v) return;
      var t = traducir(v);
      if (t !== null && t !== v) el.setAttribute(a, t);
    });
  }
  function recorrer(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { nodoTexto(raiz); return; }
    if (raiz.nodeType !== 1 && raiz.nodeType !== 9) return;
    if (raiz.matches && raiz.matches('script,style,noscript,[data-noi18n]')) return;
    if (raiz.nodeType === 1) atributos(raiz);
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && n.matches && n.matches('script,style,noscript,[data-noi18n]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (w.nextNode()) {
      if (w.currentNode.nodeType === 3) nodoTexto(w.currentNode);
      else atributos(w.currentNode);
    }
  }
  function titulo() {
    var t = traducir(document.title);
    if (t) document.title = t;
    var d = document.querySelector('meta[name="description"]');
    if (d) { var v = traducir(d.getAttribute('content')); if (v) d.setAttribute('content', v); }
  }
  var pendiente = null;
  function programar() {
    if (pendiente) return;
    pendiente = setTimeout(function () {
      pendiente = null;
      recorrer(document.body);
      titulo();
    }, 30);
  }
  new MutationObserver(function (mu) {
    for (var i = 0; i < mu.length; i++) {
      if (mu[i].type === 'childList' && mu[i].addedNodes.length) programar();
      if (mu[i].type === 'attributes') { atributos(mu[i].target); }
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'] });

  recorrer(document.body);
  titulo();
  programar();
})();
