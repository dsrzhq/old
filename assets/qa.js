/* ============================================================================
   BITÁCORA · QA EN EL NAVEGADOR (solo se activa con ?qa=1)
   Mide lo que un script estático no puede ver: contraste real de texto
   renderizado, overflow horizontal, objetivos táctiles y número de alertas
   visibles por pantalla. Deja el resultado en <body data-qa="<base64>">
   para que prototype/_qa/check.mjs lo lea con Chrome --dump-dom.
   No interviene en la app normal: sin ?qa=1, este archivo no hace nada.
   ========================================================================== */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  if (params.get('qa') !== '1') return;

  if (params.get('texto') === '200') {
    document.documentElement.classList.add('texto-grande');
  }

  /* --- utilidades de color ------------------------------------------------- */
  function rgbDe(texto) {
    if (!texto) return null;
    var m = String(texto).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',').map(function (n) { return parseFloat(n); });
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function comp(a, b) { /* a sobre b */
    var al = a.a == null ? 1 : a.a;
    return {
      r: Math.round(a.r * al + b.r * (1 - al)),
      g: Math.round(a.g * al + b.g * (1 - al)),
      b: Math.round(a.b * al + b.b * (1 - al)),
      a: 1
    };
  }
  function luminancia(c) {
    function canal(v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
  }
  function ratio(a, b) {
    var l1 = luminancia(a);
    var l2 = luminancia(b);
    if (l1 < l2) { var t = l1; l1 = l2; l2 = t; }
    return (l1 + 0.05) / (l2 + 0.05);
  }
  function rgbATexto(c) { return 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')'; }
  function fondoEfectivo(el) {
    var capas = [];
    var nodo = el;
    while (nodo && nodo.nodeType === 1) {
      var c = rgbDe(getComputedStyle(nodo).backgroundColor);
      if (c && c.a > 0) {
        capas.push(c);
        if (c.a >= 0.999) break;
      }
      nodo = nodo.parentElement;
    }
    var base = { r: 255, g: 255, b: 255, a: 1 };
    for (var i = capas.length - 1; i >= 0; i--) { base = comp(capas[i], base); }
    return base;
  }
  function opacidadAcumulada(el) {
    var o = 1;
    var nodo = el;
    while (nodo && nodo.nodeType === 1) {
      var v = parseFloat(getComputedStyle(nodo).opacity);
      if (!isNaN(v)) o *= v;
      nodo = nodo.parentElement;
    }
    return o;
  }
  function visible(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('[hidden]')) return false;
    var st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function selectorDe(el) {
    var etiqueta = el.tagName.toLowerCase();
    var clase = (el.className && typeof el.className === 'string') ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    var id = el.id ? '#' + el.id : '';
    return etiqueta + id + (clase ? '.' + clase : '');
  }
  var SALTAR = ['SCRIPT', 'STYLE', 'SVG', 'USE', 'PATH', 'CIRCLE', 'RECT', 'TEXT', 'SYMBOL', 'TITLE', 'DEFS', 'LINEARGRADIENT', 'STOP'];

  /* --- auditoría ----------------------------------------------------------- */
  function auditar() {
    var fallasContraste = [];
    var totalTextos = 0;
    var todos = Array.prototype.slice.call(document.body.querySelectorAll('*'));

    todos.forEach(function (el) {
      if (SALTAR.indexOf(el.tagName) >= 0) return;
      if (el.closest('.sr-only')) return;
      var tieneTexto = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && n.textContent.trim().length > 0;
      });
      if (!tieneTexto) return;
      if (!visible(el)) return;
      var st = getComputedStyle(el);
      var fg = rgbDe(st.color);
      if (!fg) return;
      totalTextos += 1;
      var opacidad = opacidadAcumulada(el);
      fg.a = (fg.a == null ? 1 : fg.a) * opacidad;
      var bg = fondoEfectivo(el);
      if (fg.a < 1) fg = comp(fg, bg);
      var tamano = parseFloat(st.fontSize) || 16;
      var peso = parseFloat(st.fontWeight) || 400;
      var grande = tamano >= 24 || (tamano >= 18.66 && peso >= 700);
      var requerido = grande ? 3 : 4.5;
      var r = ratio(fg, bg);
      if (r + 0.02 < requerido) {
        fallasContraste.push({
          selector: selectorDe(el),
          texto: (el.textContent || '').trim().slice(0, 60),
          color: rgbATexto(fg),
          fondo: rgbATexto(bg),
          ratio: Math.round(r * 100) / 100,
          requerido: requerido,
          tamano: Math.round(tamano)
        });
      }
    });

    var overflowElementos = [];
    todos.forEach(function (el) {
      if (SALTAR.indexOf(el.tagName) >= 0) return;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        overflowElementos.push({
          selector: selectorDe(el),
          texto: (el.textContent || '').trim().slice(0, 40),
          left: Math.round(r.left),
          right: Math.round(r.right)
        });
      }
    });

    var tactilesBajos = [];
    var totalTactiles = 0;
    Array.prototype.slice.call(document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')).forEach(function (el) {
      if (el.closest('.sr-only')) return;
      var tipo = (el.getAttribute('type') || '').toLowerCase();
      if (tipo === 'hidden' || tipo === 'radio' || tipo === 'checkbox') return;
      if (!visible(el)) return;
      totalTactiles += 1;
      var r = el.getBoundingClientRect();
      if (r.width < 48 || r.height < 48) {
        tactilesBajos.push({
          selector: selectorDe(el),
          texto: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
          ancho: Math.round(r.width),
          alto: Math.round(r.height)
        });
      }
    });

    var alertas = Array.prototype.slice.call(document.querySelectorAll('[data-alerta]')).filter(visible);

    var barra = document.getElementById('tabbar');
    var fab = document.querySelector('.fab');
    var telefono = document.getElementById('phone');
    var destinos = Array.prototype.slice.call(document.querySelectorAll('.tab')).filter(visible);
    var fabCentrado = true;
    if (barra && fab && visible(fab) && visible(barra)) {
      var rb = barra.getBoundingClientRect();
      var rf = fab.getBoundingClientRect();
      fabCentrado = Math.abs((rb.left + rb.right) / 2 - (rf.left + rf.right) / 2) <= 2;
    }

    var resultado = {
      url: location.href,
      ruta: location.hash || '#/hoy',
      modoTexto200: document.documentElement.classList.contains('texto-grande'),
      viewport: { ancho: window.innerWidth, alto: window.innerHeight, dpr: window.devicePixelRatio },
      overflow: {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        ok: document.documentElement.scrollWidth <= window.innerWidth + 1,
        totalElementos: overflowElementos.length,
        elementos: overflowElementos.slice(0, 10)
      },
      contraste: {
        totalTextos: totalTextos,
        totalFallas: fallasContraste.length,
        fallas: fallasContraste.slice(0, 20)
      },
      tactil: {
        total: totalTactiles,
        totalBajos: tactilesBajos.length,
        bajos: tactilesBajos.slice(0, 10)
      },
      alertas: {
        cantidad: alertas.length,
        ok: alertas.length <= 3
      },
      navegacion: {
        destinosVisibles: destinos.length,
        cincoDestinos: destinos.length === 5,
        fabCentrado: fabCentrado,
        anchoTelefono: telefono ? Math.round(telefono.getBoundingClientRect().width) : null,
        anchoBarra: barra ? Math.round(barra.getBoundingClientRect().width) : null,
        modoCaptura: document.getElementById('phone') ? document.getElementById('phone').classList.contains('modo-captura') : false
      },
      fuentes: {
        archivoBlack: document.fonts ? document.fonts.check('400 20px "Archivo Black"') : null,
        inter: document.fonts ? document.fonts.check('400 17px "Inter"') : null,
        montserrat: document.fonts ? document.fonts.check('600 17px "Montserrat"') : null
      },
      erroresJs: window.__erroresQA || []
    };

    document.body.setAttribute('data-qa', btoa(unescape(encodeURIComponent(JSON.stringify(resultado)))));
  }

  window.__erroresQA = [];
  window.addEventListener('error', function (e) {
    window.__erroresQA.push(String(e.message || 'error'));
  });

  function arrancarAuditoria() {
    /* Fuerza la descarga de las tres familias antes de medir, para que el
       chequeo de fuentes no dependa de qué pantalla se está mirando. */
    var familias = ['400 20px "Archivo Black"', '400 17px "Inter"', '600 17px "Montserrat"'];
    var cargas = familias.map(function (f) {
      return document.fonts && document.fonts.load ? document.fonts.load(f).catch(function () { return []; }) : Promise.resolve([]);
    });
    Promise.all(cargas).then(function () { setTimeout(auditar, 250); });
  }
  if (document.readyState === 'complete') {
    arrancarAuditoria();
  } else {
    window.addEventListener('load', arrancarAuditoria);
  }
})();
