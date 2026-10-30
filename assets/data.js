/* ============================================================================
   BITÁCORA · DATOS FALSOS DEL PROTOTIPO (Ontario, CAD)
   ----------------------------------------------------------------------------
   REGLA DE ORO: todo el dinero vive en CENTAVOS ENTEROS. Nunca floats.
   Las tasas viven en ppm (partes por millón): 130000 ppm = 13 %.
   El formato se hace SOLO al presentar, con Intl.NumberFormat('es-CA').
   Las cifras de margen y nómina son las del anexo 15.2 de REQUERIMIENTOS.md
   (Ejemplo 1 y Ejemplo 2), verificadas con aritmética exacta.
   Nada de esto es real: es el set de demo del prototipo.
   ========================================================================== */
(function () {
  'use strict';

  var HOY_ISO = '2026-10-30';

  /* --- Obras ------------------------------------------------------------- */
  var obras = [
    {
      id: 'maple',
      nombre: '12 Maple Ave',
      ciudad: 'Vaughan',
      tipo: 'Renovación de cocina',
      contrato: 'Precio fijo',
      contratoCcdc: 'CCDC 2',
      semaforo: 'ojo',
      avancePpm: 680000, /* 68 % de avance de obra */
      presupuestoCents: 7330000,
      comprometidoCents: 8242000,
      gastadoCents: 8077000,
      pagadoCents: 7552000,
      holdback: {
        facturadoCents: 8077000,
        tasaPpm: 100000,             /* 10 % · Construction Act */
        retenidoCents: 807700,       /* 10 % de lo facturado */
        aniversarioContrato: '2026-04-12',
        proximaLiberacion: '2027-04-12',
        nota: 'Aviso 14 días después del aniversario; el pago sale hasta 60 días después del aviso.'
      },
      partidas: [
        {
          id: 'demolicion', nombre: 'Demolición y desalojo',
          presupuestoCents: 350000, compromisoCents: 382000, gastadoCents: 382000, pagadoCents: 382000,
          po: { numero: 'PO-2390', montoCents: 382000 },
          facturas: [{ numero: 'WM-771', fecha: '2026-09-18', montoCents: 382000 }]
        },
        {
          id: 'estructura', nombre: 'Estructura y drywall',
          presupuestoCents: 510000, compromisoCents: 510000, gastadoCents: 510000, pagadoCents: 510000,
          po: { numero: 'PO-2398', montoCents: 510000 },
          facturas: [{ numero: 'HD-87110', fecha: '2026-09-26', montoCents: 510000 }]
        },
        {
          id: 'electricidad', nombre: 'Electricidad (subcontrato)',
          presupuestoCents: 980000, compromisoCents: 1240000, gastadoCents: 1240000, pagadoCents: 980000,
          po: { numero: 'PO-2402', montoCents: 1240000 },
          facturas: [
            { numero: 'BE-2185', fecha: '2026-09-30', montoCents: 740000 },
            { numero: 'BE-2210', fecha: '2026-10-28', montoCents: 500000 }
          ]
        },
        {
          id: 'plomeria', nombre: 'Plomería (subcontrato)',
          presupuestoCents: 1120000, compromisoCents: 1590000, gastadoCents: 1590000, pagadoCents: 1590000,
          po: { numero: 'PO-2418', montoCents: 1590000 },
          facturas: [
            { numero: 'PL-118', fecha: '2026-10-08', montoCents: 590000 },
            { numero: 'PL-127', fecha: '2026-10-21', montoCents: 1000000 }
          ]
        },
        {
          id: 'muebles', nombre: 'Muebles de cocina',
          presupuestoCents: 2200000, compromisoCents: 2310000, gastadoCents: 2310000, pagadoCents: 2310000,
          po: { numero: 'PO-2425', montoCents: 2310000 },
          facturas: [{ numero: 'KT-3301', fecha: '2026-10-02', montoCents: 2310000 }]
        },
        {
          id: 'mesada', nombre: 'Mesada de cuarzo',
          presupuestoCents: 850000, compromisoCents: 890000, gastadoCents: 890000, pagadoCents: 890000,
          po: { numero: 'PO-2427', montoCents: 890000 },
          facturas: [{ numero: 'QS-992', fecha: '2026-10-09', montoCents: 890000 }]
        },
        {
          id: 'pisos', nombre: 'Pisos de cerámica',
          presupuestoCents: 640000, compromisoCents: 640000, gastadoCents: 610000, pagadoCents: 610000,
          po: { numero: 'PO-2422', montoCents: 640000 },
          facturas: [{ numero: 'TD-760', fecha: '2026-10-16', montoCents: 610000 }]
        },
        {
          id: 'pintura', nombre: 'Pintura',
          presupuestoCents: 400000, compromisoCents: 400000, gastadoCents: 265000, pagadoCents: 0,
          po: { numero: 'PO-2431', montoCents: 400000 },
          facturas: [{ numero: 'SW-3198', fecha: '2026-10-14', montoCents: 265000 }]
        },
        {
          id: 'otros', nombre: 'Otros y misceláneos',
          presupuestoCents: 280000, compromisoCents: 280000, gastadoCents: 280000, pagadoCents: 280000,
          po: { numero: 'PO-2395', montoCents: 280000 },
          facturas: [{ numero: 'HD-88002', fecha: '2026-09-12', montoCents: 280000 }]
        }
      ]
    },
    {
      id: 'bloor',
      nombre: '88 Bloor St W',
      ciudad: 'Toronto',
      tipo: 'Cocina + baño',
      contrato: 'Comisión',
      contratoCcdc: 'CCDC 5A',
      semaforo: 'ok',
      avancePpm: 350000,
      presupuestoCents: 4800000,
      comprometidoCents: 2550000,
      gastadoCents: 1980000,
      pagadoCents: 1760000,
      holdback: {
        facturadoCents: 1980000, tasaPpm: 100000, retenidoCents: 198000,
        aniversarioContrato: '2026-06-01', proximaLiberacion: '2027-06-01',
        nota: 'Aviso 14 días después del aniversario; el pago sale hasta 60 días después del aviso.'
      },
      partidas: [
        {
          id: 'cocina-materiales', nombre: 'Materiales de cocina',
          presupuestoCents: 1800000, compromisoCents: 900000, gastadoCents: 780000, pagadoCents: 700000,
          po: { numero: 'PO-2450', montoCents: 900000 }, facturas: []
        },
        {
          id: 'bano-materiales', nombre: 'Materiales de baño',
          presupuestoCents: 900000, compromisoCents: 450000, gastadoCents: 380000, pagadoCents: 350000,
          po: { numero: 'PO-2451', montoCents: 450000 }, facturas: []
        },
        {
          id: 'mano-obra', nombre: 'Mano de obra',
          presupuestoCents: 2100000, compromisoCents: 1200000, gastadoCents: 820000, pagadoCents: 710000,
          po: { numero: 'PO-2452', montoCents: 1200000 }, facturas: []
        }
      ]
    }
  ];

  /* --- Hoy (P-03) -------------------------------------------------------- */
  var hoy = {
    fecha: HOY_ISO,
    semana: 44,
    periodo: '26–30 oct 2026',
    saludo: 'Buen día, Diego',
    porPagar: {
      montoCents: 842000,
      detalle: '3 facturas · vencen hoy',
      vencimiento: '2026-10-30'
    },
    porCobrar: {
      montoCents: 1840000,
      detalle: 'Draw #3 · 88 Bloor St W',
      vencimiento: '2026-11-12'
    },
    sinClasificar: {
      cantidad: 7,
      montoCents: 1293250,
      detalle: '7 facturas esperando'
    },
    alertas: [
      {
        id: 'plomeria', severidad: 'danger', palabra: 'Alerta',
        titulo: 'Plomería pasó el presupuesto',
        detalle: 'Va +42 %: no registro más gasto.',
        accion: 'Ver obra', ruta: '#/obra'
      },
      {
        id: 'wsib', severidad: 'warn', palabra: 'Ojo',
        titulo: 'El WSIB de un contratista',
        detalle: 'Venció: su pago está bloqueado.',
        accion: 'Ver nómina', ruta: '#/nomina'
      },
      {
        id: 'alDia', severidad: 'ok', palabra: 'Vas bien',
        titulo: '88 Bloor va según presupuesto',
        detalle: 'El próximo cobro entra el 12 de nov.'
      }
    ]
  };

  /* --- Bandeja por clasificar (P-09) · 7 facturas, una duplicada ---------- */
  var facturas = [
    {
      id: 'f1', proveedor: 'Home Depot Canada', fecha: '2026-10-27', numero: 'HD-88421',
      montoCents: 124530, documento: 'Factura de materiales',
      sugerencias: [
        { obraId: 'maple', partidaId: 'estructura', confianzaPpm: 920000 },
        { obraId: 'maple', partidaId: 'otros', confianzaPpm: 50000 }
      ]
    },
    {
      id: 'f2', proveedor: 'Rona', fecha: '2026-10-28', numero: 'RO-55190',
      montoCents: 218000, documento: 'Factura de materiales',
      sugerencias: [
        { obraId: 'maple', partidaId: 'mesada', confianzaPpm: 810000 },
        { obraId: 'maple', partidaId: 'otros', confianzaPpm: 120000 }
      ]
    },
    {
      id: 'f3', proveedor: 'Bellwood Electric', fecha: '2026-10-28', numero: 'BE-2210',
      montoCents: 499470, documento: 'Factura de subcontrato',
      sugerencias: [
        { obraId: 'maple', partidaId: 'electricidad', confianzaPpm: 960000 },
        { obraId: 'maple', partidaId: 'otros', confianzaPpm: 30000 }
      ]
    },
    {
      id: 'f4', proveedor: 'Tile Depot', fecha: '2026-10-29', numero: 'TD-774',
      montoCents: 179000, documento: 'Factura de materiales',
      sugerencias: [
        { obraId: 'maple', partidaId: 'pisos', confianzaPpm: 880000 },
        { obraId: 'maple', partidaId: 'otros', confianzaPpm: 70000 }
      ]
    },
    {
      id: 'f5', proveedor: 'Sherwin-Williams', fecha: '2026-10-30', numero: 'SW-3321',
      montoCents: 86520, documento: 'Factura de materiales',
      sugerencias: [
        { obraId: 'maple', partidaId: 'pintura', confianzaPpm: 790000 },
        { obraId: 'maple', partidaId: 'otros', confianzaPpm: 130000 }
      ]
    },
    {
      id: 'f6', proveedor: 'Home Depot Canada', fecha: '2026-10-29', numero: 'HD-88421',
      montoCents: 124530, documento: 'Factura de materiales',
      duplicadoDe: 'f1', /* mismo proveedor + número + monto · R-IA-03 */
      sugerencias: [
        { obraId: 'maple', partidaId: 'estructura', confianzaPpm: 920000 },
        { obraId: 'maple', partidaId: 'otros', confianzaPpm: 50000 }
      ]
    },
    {
      id: 'f7', proveedor: 'BMR', fecha: '2026-10-26', numero: 'BM-1180',
      montoCents: 61200, documento: 'Factura de materiales',
      sugerencias: [
        { obraId: 'bloor', partidaId: 'cocina-materiales', confianzaPpm: 700000 },
        { obraId: 'bloor', partidaId: 'bano-materiales', confianzaPpm: 210000 }
      ]
    }
  ];

  /* --- Catálogo (sugerencia de precio de la pantalla de captura) ---------- */
  var catalogo = {
    item: 'Drywall 1/2" 4×8',
    precioActualCents: 1840,
    precioNuevoCents: 1915,
    variacionPpm: 40000, /* +4 % */
    proveedor: 'Home Depot Canada',
    fecha: '2026-10-30'
  };

  /* --- Nómina de la semana (P-15) · Ejemplo 2 del anexo 15.2 ------------- */
  var nomina = {
    semana: 44,
    periodo: '26–30 oct 2026',
    parametrosVersion: 'ON 2026 · v2026.10',
    parametrosVigencia: 'vigentes desde 1 oct 2026',
    estado: 'borrador',
    personas: [
      {
        id: 'pA', nombre: 'Andrés Salas', rol: 'Carpintero', modalidad: 'hora',
        tarifaHoraCents: 3200, horasPorDia: [10, 10, 10, 10, 8],
        empleado: true, wsibVigente: true
      },
      {
        id: 'pB', nombre: 'Miguel Torres', rol: 'Ayudante', modalidad: 'hora',
        tarifaHoraCents: 2800, horasPorDia: [9, 9, 9, 9, 8],
        empleado: true, wsibVigente: true
      },
      {
        id: 'pC', nombre: 'Luis Paredes', rol: 'Drywall', modalidad: 'hora',
        tarifaHoraCents: 2600, horasPorDia: [8, 8, 8, 8, 8],
        empleado: true, wsibVigente: true
      },
      {
        id: 'pD', nombre: 'Deepak Mistry', rol: 'Contratista de drywall', modalidad: 'destajo',
        concepto: 'Drywall instalado', cantidad: 1850, unidad: 'sq ft', tarifaUnidadCents: 55,
        empleado: false, contratista: true,
        wsibVigente: false,
        wsibVence: '2026-10-18',
        documentoTipo: 'Clearance WSIB',
        documentoNumero: 'WSIB-4482190',
        hstNumero: 'HST 81234 5678 RT0001'
      },
      {
        id: 'pE', nombre: 'Jan Kowalski', rol: 'Contratista general', modalidad: 'jornal',
        concepto: 'Jornal', cantidad: 4, unidad: 'días', tarifaUnidadCents: 28000,
        empleado: false, contratista: true,
        wsibVigente: true, wsibVence: '2026-12-15',
        documentoTipo: 'Clearance WSIB',
        hstNumero: 'HST 70998 1122 RT0001'
      }
    ],
    /* Cifras verificadas del Ejemplo 2 de 15.2 (control de regresión) */
    esperado: {
      brutoTotalCents: 600950,
      cargaPatronalCents: 52125,
      costoTotalCents: 653075,
      costoHoraTrabajadorACents: 3491
    }
  };

  /* --- Margen de la obra (R-REP-03 · R-CU-23 · Decisión #5) -------------- */
  var margen = {
    obraId: 'maple',
    titulo: 'Cocina a precio fijo',
    precioCents: 9200000,
    hstPpm: 130000,
    hstCents: 1196000,
    totalFacturadoCents: 10396000,
    costoDirectoPresupuestoCents: 7330000,
    contingenciaCents: 366500,
    overheadCents: 586400,
    costoPresupuestadoCents: 8282900,
    margenPresupuestadoCents: 917100,
    costoDirectoRealCents: 8077000,
    costoRealCents: 9029900,
    margenRealCents: 170100,
    remanenteCents: 135000,
    compromisoAbiertoCents: 165000,
    escenarios: [
      {
        id: 'cpi', nombre: 'Por ritmo de gasto (CPI)',
        detalle: 'Gastaste 10,2 % más de lo previsto. Si el remanente de $1.350 mantiene ese ritmo, se van $1.488.',
        calculo: '90.299 + 1.488',
        costoProyectadoCents: 9178700, margenCents: 21300
      },
      {
        id: 'remanente', nombre: 'Por remanente a presupuesto',
        detalle: 'Si lo que falta (pintura: $1.350) se ejecuta al presupuesto, no suma sobrecosto.',
        calculo: '90.299 + 1.350',
        costoProyectadoCents: 9164900, margenCents: 35100
      },
      {
        id: 'bottomup', nombre: 'Bottom-up por compromisos',
        detalle: 'Suma los compromisos abiertos (PO): $1.650 pendientes de facturar.',
        calculo: '90.299 + 1.650',
        costoProyectadoCents: 9194900, margenCents: 5100
      }
    ],
    /* R-CU-26: descomposición precio vs cantidad de la partida más desviada */
    varianza: {
      partidaId: 'plomeria',
      presupuestoHoras: 140, realHoras: 150,
      presupuestoHoraCents: 8000, realHoraCents: 10600,
      precioCents: 390000, cantidadCents: 80000, totalCents: 470000
    }
  };

  /* --- Parámetros fiscales y operativos (15.4, con vigencia) ------------- */
  var parametros = {
    version: 'ON 2026 · v2026.10',
    actualizado: '2026-10-01',
    hst: { ppm: 130000, etiqueta: 'HST Ontario', vigencia: 'vigente desde 1 jul 2010', fuente: 'CRA / Ontario' },
    overtime: { horasSemanales: 44, factorPpm: 1500000, etiqueta: '1,5× después de 44 h', vigencia: 'vigente', fuente: 'ESA (Ontario)' },
    holdback: { ppm: 100000, etiqueta: 'Holdback', vigencia: 'vigente', fuente: 'Construction Act' },
    minimoMargenPpm: 80000,
    desviacionAlertaPpm: 100000,
    desviacionCriticaPpm: 150000,
    wsibClearanceDias: 90,
    promptPayment: {
      objecionDias: 7,
      avisoNoPagoDias: 14,
      pagoDuenoDias: 28,
      vigencia: 'desde 1 ene 2026',
      fuente: 'Construction Act'
    },
    cargaPatronal: [
      { id: 'vacaciones', nombre: 'Vacation pay', ppm: 40000, vigencia: 'vigente', fuente: 'ESA' },
      { id: 'cpp', nombre: 'CPP patronal', ppm: 59500, vigencia: '2026', fuente: 'CRA' },
      { id: 'ei', nombre: 'EI patronal (1,4×)', ppm: 22820, vigencia: '2026', fuente: 'Canada.ca' },
      { id: 'wsib', nombre: 'WSIB construcción', ppm: 12300, vigencia: '2026', fuente: 'WSIB' }
    ]
  };

  /* --- Formato (presentación) -------------------------------------------- */
  var nfGrupo = new Intl.NumberFormat('es-CA', { useGrouping: true, maximumFractionDigits: 0 });
  var nfDecimal = new Intl.NumberFormat('es-CA', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  var BitacoraFormato = {
    /* Centavos enteros → "$12.480" (es-CA, sin decimales si el monto es
       entero) o "$6.009,50" cuando hay centavos. Cap. 7.4. Sin floats: la
       parte entera y los centavos se separan con aritmética entera. */
    dinero: function (cents) {
      var n = Math.round(Number(cents));
      var signo = n < 0 ? '−' : '';
      var abs = Math.abs(n);
      var entero = Math.floor(abs / 100);
      var resto = abs % 100;
      var base = signo + '$' + nfGrupo.format(entero);
      return resto === 0 ? base : base + ',' + String(resto).padStart(2, '0');
    },
    /* Para héroes y rangos: dólares enteros, sin centavos (solo presentación). */
    dineroEntero: function (cents) {
      var n = Math.round(Number(cents) / 100);
      var signo = n < 0 ? '−' : '';
      return signo + '$' + nfGrupo.format(Math.abs(n));
    },
    /* ppm → "42,0 %" · espacio duro para que el % no se parta de línea */
    porcentaje: function (ppm, opciones) {
      var min = opciones && opciones.min != null ? opciones.min : 0;
      var max = opciones && opciones.max != null ? opciones.max : 2;
      var nf = new Intl.NumberFormat('es-CA', { minimumFractionDigits: min, maximumFractionDigits: max });
      return nf.format(Number(ppm) / 10000) + '\u00A0%';
    },
    /* Centavos / centavos → "%" con decimales de control (márgenes, desvíos) */
    porcentajeDe: function (parteCents, baseCents, opciones) {
      if (!baseCents) return '—';
      var ppm = Math.round((Number(parteCents) / Number(baseCents)) * 1000000);
      return BitacoraFormato.porcentaje(ppm, opciones);
    },
    fechaCorta: function (iso) {
      var d = new Date(iso + 'T12:00:00');
      return new Intl.DateTimeFormat('es-CA', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    },
    fechaSinAnio: function (iso) {
      var d = new Date(iso + 'T12:00:00');
      return new Intl.DateTimeFormat('es-CA', { day: 'numeric', month: 'short' }).format(d);
    },
    fechaLarga: function (iso) {
      var d = new Date(iso + 'T12:00:00');
      var txt = new Intl.DateTimeFormat('es-CA', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
      return txt.charAt(0).toUpperCase() + txt.slice(1);
    },
    diaSemana: function (iso) {
      var d = new Date(iso + 'T12:00:00');
      return new Intl.DateTimeFormat('es-CA', { weekday: 'long' }).format(d);
    },
    diaSemanaCorto: function (indice) {
      var dias = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
      return dias[indice] || '';
    }
  };

  window.BitacoraData = {
    hoy: hoy,
    obras: obras,
    facturas: facturas,
    catalogo: catalogo,
    nomina: nomina,
    margen: margen,
    parametros: parametros,
    estados: {
      semaforo: {
        ok: { palabra: 'Vas bien', icono: 'check', color: 'ok' },
        ojo: { palabra: 'Ojo', icono: 'ojo', color: 'warn' },
        alerta: { palabra: 'Alerta', icono: 'alerta', color: 'danger' }
      },
      captura: {
        camara: 'Enfoca la factura completa',
        leyendo: 'Leyendo la factura…',
        error: 'No pude leer el total. ¿Lo escribes o repetimos la foto?',
        guardada: 'Factura guardada',
        sinSenal: 'Guardada en tu teléfono. Se sube cuando vuelva la señal.'
      }
    }
  };

  window.BitacoraFormato = BitacoraFormato;
})();
