/* ==========================================================================
   app.js — Configurador Visual Interactivo y Generador de Cotizaciones
   ========================================================================== */
'use strict';

const RUTA_CATALOGO = './productos.json';
const RUTA_TEXTOS = './textos.json';

let catalogo = null;
let textosConfiguracion = {};

const estado = {
  linea: null,
  manga: 'larga',
  tela: null,
  color: null,
  paquete: null,
  cinta: null,
  colorCinta: 'gris',
  marcaje: null,
  ubicacion: null,
  ubicacion2: 'ninguna',
  logoEspalda: false,
  logoEspaldaIgual: true,
  ambasMangas: false,
  ubicacionesManga: { manga_izq: false, manga_der: false },
  logos: { principal: null, pecho_der: null, espalda: null, manga_izq: null, manga_der: null },
  logosOriginales: { principal: null, pecho_der: null, espalda: null, manga_izq: null, manga_der: null },
  quitarFondoLogo: { principal: true, pecho_der: true, espalda: true, manga_izq: true, manga_der: true },
  toleranciaFondoLogo: { principal: 35, pecho_der: 35, espalda: 35, manga_izq: 35, manga_der: 35 },
  versionProcesoLogo: { principal: 0, pecho_der: 0, espalda: 0, manga_izq: 0, manga_der: 0 },
  revisionLogos: 0,
  cargaLogo: { principal: '', pecho_der: '', espalda: '', manga_izq: '', manga_der: '' },
  vista: 'front',
  aplicarIva: true,
  conGorro: false,     // Estado del switch de capucha/gorro
  zoom: 1,
  tallas: {}
};

const COLORES_CINTA = [
  { id: 'gris', nombre: 'Gris', base: '#cbd5e1', fondo: '#cbd5e1' },
  { id: 'bicolor_verde', nombre: 'Bicolor verde y gris', base: '#cbd5e1', acento: '#84cc16', fondo: 'linear-gradient(135deg, #cbd5e1 0 42%, #84cc16 42% 58%, #cbd5e1 58% 100%)' },
  { id: 'bicolor_naranja', nombre: 'Bicolor naranja y gris', base: '#cbd5e1', acento: '#f97316', fondo: 'linear-gradient(135deg, #cbd5e1 0 42%, #f97316 42% 58%, #cbd5e1 58% 100%)' }
];

const $  = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

const formatoNumero = new Intl.NumberFormat('en-US');
const crc = (n) => '₡' + formatoNumero.format(Math.round(n));
const formatoPorcentaje = (n) => new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(n);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const etiquetaExtra = (n) => (n > 0 ? '+' + crc(n) : 'Incluido');

function aplicarTexto(item, texto) {
  if (!texto || typeof texto !== 'object') return;
  if (typeof texto.nombre === 'string') item.nombre = texto.nombre;
  if (typeof texto.descripcion === 'string') item.descripcion = texto.descripcion;
}

function aplicarTextos() {
  const textos = textosConfiguracion;
  const aplicarLista = (items, sobreescrituras) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => aplicarTexto(item, sobreescrituras && sobreescrituras[item.id]));
  };

  aplicarLista(catalogo.lineas, textos.lineas);
  aplicarLista(catalogo.mangas, textos.mangas);
  aplicarLista(catalogo.colores, textos.colores);
  aplicarLista(catalogo.ubicacionesLogo, textos.ubicacionesLogo);

  catalogo.lineas.forEach((linea) => {
    const textosLinea = textos.lineas && textos.lineas[linea.id];
    if (!textosLinea) return;
    ['paquetes', 'telas', 'cintas', 'marcajes'].forEach((grupo) => {
      aplicarLista(linea[grupo], textosLinea[grupo]);
    });
  });

  COLORES_CINTA.forEach((color) => {
    const nombre = textos.coloresCinta && textos.coloresCinta[color.id];
    if (typeof nombre === 'string') color.nombre = nombre;
  });
}

const lineaActual     = () => catalogo.lineas.find((l) => l.id === estado.linea);
const mangaActual     = () => catalogo.mangas.find((m) => m.id === estado.manga);
const telaActual      = () => lineaActual().telas.find((t) => t.id === estado.tela);
const colorActual     = () => catalogo.colores.find((c) => c.id === estado.color);
const colorCintaActual = () => COLORES_CINTA.find((c) => c.id === estado.colorCinta) || COLORES_CINTA[0];
const paqueteActual   = () => lineaActual().paquetes.find((p) => p.id === estado.paquete) || null;
const cintaActual     = () => lineaActual().cintas.find((c) => c.id === estado.cinta);
const nombreCintaConfigurada = (cinta = cintaActual()) =>
  `${cinta.nombre} · ${colorCintaActual().nombre}`;
const marcajeActual   = () => lineaActual().marcajes.find((m) => m.id === estado.marcaje) || null;
const ubicacionActual = () => catalogo.ubicacionesLogo.find((u) => u.id === estado.ubicacion) || catalogo.ubicacionesLogo[0];
const ubicacion2Actual= () => catalogo.ubicacionesLogo.find((u) => u.id === estado.ubicacion2) || null;
const ubicaciones2Actuales = () => [ubicacion2Actual()].filter(Boolean);
const ubicacionesMangaActivas = () => Object.keys(estado.ubicacionesManga)
  .filter((id) => estado.ubicacionesManga[id])
  .map((id) => catalogo.ubicacionesLogo.find((ubicacion) => ubicacion.id === id))
  .filter(Boolean);

function ubicacionesLogoTexto() {
  const ubicaciones = [ubicacionActual(), ...ubicaciones2Actuales(), ...ubicacionesMangaActivas()];
  if (estado.logoEspalda) {
    const espalda = catalogo.ubicacionesLogo.find((u) => u.id === 'espalda');
    if (espalda) ubicaciones.push(espalda);
  }
  return ubicaciones.map((u) => u.nombre).join(' + ');
}

const totalPrendas = () => Object.values(estado.tallas).reduce((a, b) => a + b, 0);

function sincronizar(selector, id) {
  $$(selector + ' [data-id]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
}

let temporizadorAviso = null;
function mostrarAviso(mensaje, tipo = '') {
  const el = $('#aviso');
  el.textContent = mensaje;
  el.className = 'visible ' + tipo;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { el.className = ''; }, 4200);
}

function normalizarSeleccion() {
  const l = lineaActual();
  if (!l.paquetes.some((p) => p.id === estado.paquete)) {
    estado.paquete = (l.paquetes.find((p) => p.incluye.cinta) || l.paquetes[0]).id;
  }
  const p = paqueteActual();
  estado.logoEspalda = p.id === 'cinta_logo';
  if (!l.cintas.some((c) => c.id === estado.cinta)) estado.cinta = l.cintas[0].id;
  if (!p.incluye.logo) estado.marcaje = null;
  else if (!l.marcajes.some((m) => m.id === estado.marcaje)) estado.marcaje = l.marcajes[0].id;
}

/* ==========================================================================
   GEOMETRÍA SVG Y CAPUCHA INTEGRADA
   ========================================================================== */
const deportivaFrente = `
  <path class="det det-relleno" d="M108 22 Q150 56 192 22 L185 22 Q150 46 115 22 Z"/>`;
const deportivaEspalda = `
  <path class="det det-relleno" d="M108 22 Q150 42 192 22 L185 22 Q150 36 115 22 Z"/>`;

const deportivaCosturasLarga = `
  <path class="det" d="M50 52 Q60 100 62 126"/><path class="det" d="M250 52 Q240 100 238 126"/>
  <path class="det" d="M19 255 L55 265"/><path class="det" d="M281 255 L245 265"/>
  <path class="det" d="M62 308 L238 308" stroke-dasharray="4 3"/>`;

const deportivaCosturasCorta = `
  <path class="det" d="M52 52 Q58 84 62 112"/><path class="det" d="M248 52 Q242 84 238 112"/>
  <path class="det" d="M23 111 L58 127"/><path class="det" d="M277 111 L242 127"/>
  <path class="det" d="M62 308 L238 308" stroke-dasharray="4 3"/>`;

/* Capucha de dos vistas: abertura frontal y volumen posterior, integrada al cuello. */
function dibujarCapucha(vista, color) {
  const borde = 'stroke="rgba(0,0,0,.65)" stroke-width="1.7" stroke-linejoin="round"';
  if (vista === 'back') {
    return `<g class="capa capa-gorro">
      <path d="M109 23 C105 5 110 -19 129 -27 Q150 -36 171 -27 C190 -19 195 5 191 23 Q171 37 150 40 Q129 37 109 23 Z"
        fill="${color}" ${borde}/>
      <path d="M109 23 Q150 47 191 23" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1.6"/>
      <path d="M116 16 Q150 31 184 16" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.3"/>
    </g>`;
  }
  return `<g class="capa capa-gorro">
    <path d="M107 23 C103 4 111 -21 130 -28 Q150 -35 170 -28 C189 -21 197 4 193 23
      L165 37 L150 43 L135 37 Z" fill="${color}" ${borde}/>
    <path d="M112 8 C113 -8 126 -19 150 -20 C174 -19 187 -8 188 8
      Q170 15 150 29 Q130 15 112 8 Z" fill="rgba(255,255,255,.14)"
      stroke="rgba(0,0,0,.65)" stroke-width="1.6"/>
    <path d="M107 23 Q126 29 150 43 Q174 29 193 23" fill="none"
      stroke="rgba(0,0,0,.65)" stroke-width="1.6"/>
    <path d="M112 8 Q132 20 150 29 Q168 20 188 8" fill="none"
      stroke="rgba(0,0,0,.48)" stroke-width="1.2"/>
  </g>`;
}

const SILUETA = {
  deportivaLarga: 'M108 22 Q150 56 192 22 L250 46 L284 272 L248 282 L238 126 L238 322 L62 322 L62 126 L52 282 L16 272 L50 46 Z',
  deportivaCorta: 'M108 22 Q150 56 192 22 L250 46 L280 118 L244 134 L238 112 L238 322 L62 322 L62 112 L56 134 L20 118 L50 46 Z'
};

const GEOMETRIA = {
  deportiva: {
    larga: { silueta: SILUETA.deportivaLarga, detalles: { front: deportivaFrente + deportivaCosturasLarga, back: deportivaEspalda + deportivaCosturasLarga } },
    corta: { silueta: SILUETA.deportivaCorta, detalles: { front: deportivaFrente + deportivaCosturasCorta, back: deportivaEspalda + deportivaCosturasCorta } }
  }
};

const ambas = (segmentos) => ({ front: segmentos, back: segmentos });
const CINTAS_CAMISA = {
  horizontal: ambas([[0, 175, 300, 175, 12]]),
  // Cinta 3.5": Dos bandas verticales paralelas en frente y espalda.
  cinta_35: ambas([[115, 130, 115, 270, 16], [185, 130, 185, 270, 16]]),
  hombro_abajo: ambas([[100, 20, 100, 322, 12], [200, 20, 200, 322, 12]]),
  bicolor:    ambas([[0, 115, 300, 115, 16], [62, 235, 238, 235, 16], [100, 20, 100, 115, 12], [200, 20, 200, 115, 12]])
};

const geometria = () => GEOMETRIA[lineaActual().modelo][estado.manga];

/* ==========================================================================
   VISOR POR CAPAS
   ========================================================================== */
function htmlCintas(vista) {
  const cinta = cintaActual();
  if (!cinta || !CINTAS_CAMISA[cinta.id]) return '';
  const segmentosVista = CINTAS_CAMISA[cinta.id][vista] || [];
  if (segmentosVista.length === 0) return '';
  const colorCinta = colorCintaActual();

  return segmentosVista.map(([x1, y1, x2, y2, w]) => {
    const linea = (atributos) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${atributos}/>`;
    return '<g>' +
      linea(`stroke="#64748b" stroke-width="${w + 2}"`) +
      linea(`stroke="${colorCinta.acento || colorCinta.base}" stroke-width="${w}"`) +
      (colorCinta.acento ? linea(`stroke="${colorCinta.base}" stroke-width="${w * 0.58}"`) : '') +
      linea(`class="cinta-brillo" stroke="#fff" stroke-opacity=".55" stroke-width="${w * 0.18}"`) +
      '</g>';
  }).join('');
}

function marcoLogo(ubicacion, tieneImagen) {
  const esManga = ubicacion.id === 'manga_izq' || ubicacion.id === 'manga_der';
  const escala = tieneImagen
    ? (esManga ? 1.3 : ubicacion.id === 'espalda' ? 1.45 : 1.55)
    : 1;
  const w = ubicacion.w * escala;
  const h = ubicacion.h * escala;
  return {
    x: ubicacion.x - (w - ubicacion.w) / 2,
    y: ubicacion.y - (h - ubicacion.h) / 2,
    w,
    h
  };
}

function rectLogo(ubicacion, uid, m, imagenBase64) {
  const { x, y, w, h } = marcoLogo(ubicacion, Boolean(imagenBase64));
  if (imagenBase64) {
    const filtro = m.estilo === 'serigrafia' ? ` filter="url(#serigrafia-${uid})"` : '';
    return `<image href="${esc(imagenBase64)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${filtro}/>`;
  }

  const tam = w <= 16 ? Math.max(4, w * 0.3) : Math.max(9, h * 0.3);
  let atributos, colorTexto;

  if (m.estilo === 'dtf') {
    atributos = `fill="url(#dtf-${uid})" stroke="#fff" stroke-width="1"`;
    colorTexto = '#ffffff';
  } else {
    atributos = 'fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"';
    colorTexto = '#0f172a';
  }

  return `<rect class="logo-pulso" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${atributos}/>
    <text x="${x + w / 2}" y="${y + h / 2 + tam * 0.35}" text-anchor="middle"
          font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700"
          font-size="${tam}" letter-spacing="1" fill="${colorTexto}">LOGO</text>`;
}

function htmlLogo(vista, uid) {
  const m = marcajeActual();
  if (!m) return '';

  const html = ubicacionesLogoActivas(vista).map(({ ubicacion, zona }) =>
    rectLogo(ubicacion, uid, m, estado.logos[zona])
  ).join('');
  return html ? `<g>${html}</g>` : '';
}

function ubicacionesLogoActivas(vista) {
  if (!marcajeActual()) return [];

  const activas = [];
  const agregar = (id, zona) => {
    const ubicacion = catalogo.ubicacionesLogo.find((u) => u.id === id);
    if (ubicacion && ubicacion.vista === vista) activas.push({ ubicacion, zona });
  };

  agregar(estado.ubicacion, 'principal');
  if (estado.ubicacion2 === 'pecho_der') agregar('pecho_der', 'pecho_der');
  if (estado.logoEspalda) agregar('espalda', estado.logoEspaldaIgual ? 'principal' : 'espalda');
  if (estado.ubicacionesManga.manga_izq) agregar('manga_izq', 'manga_izq');
  if (estado.ubicacionesManga.manga_der) agregar('manga_der', 'manga_der');
  return activas;
}

function contenidoMascaraCinta(vista) {
  const recortes = ubicacionesLogoActivas(vista).map(({ ubicacion, zona }) => {
    const marco = marcoLogo(ubicacion, Boolean(estado.logos[zona]));
    return `<rect x="${marco.x - 4}" y="${marco.y - 4}" width="${marco.w + 8}" height="${marco.h + 8}" fill="black" rx="4"/>`;
  }).join('');
  return `<rect x="-50" y="-50" width="400" height="450" fill="white"/>${recortes}`;
}

function htmlMascaraCinta(vista, uid) {
  return `<mask id="mask-cinta-${uid}" maskUnits="userSpaceOnUse">${contenidoMascaraCinta(vista)}</mask>`;
}

function claveEstadoLogo(vista) {
  const tamanosImagenes = Object.values(estado.logos).map((imagen) => imagen ? imagen.length : 0).join(',');
  return `${estado.linea}|${estado.manga}|${vista}|${estado.marcaje}|${estado.ubicacion}|${estado.ubicacion2}|${estado.logoEspalda}|${estado.logoEspaldaIgual}|${estado.ubicacionesManga.manga_izq}|${estado.ubicacionesManga.manga_der}|${estado.revisionLogos}|${tamanosImagenes}`;
}

function defsSVG(uid) {
  return `
    <linearGradient id="sombra-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="#000" stop-opacity=".30"/>
      <stop offset=".28" stop-color="#fff" stop-opacity=".05"/>
      <stop offset=".5"  stop-color="#fff" stop-opacity=".13"/>
      <stop offset=".72" stop-color="#fff" stop-opacity=".02"/>
      <stop offset="1"   stop-color="#000" stop-opacity=".32"/>
    </linearGradient>
    <linearGradient id="dtf-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ef4444"/><stop offset=".35" stop-color="#f59e0b"/>
      <stop offset=".7" stop-color="#22c55e"/><stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
    <filter id="serigrafia-${uid}" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="5" intercept="-2"/>
        <feFuncG type="linear" slope="5" intercept="-2"/>
        <feFuncB type="linear" slope="5" intercept="-2"/>
        <feFuncA type="identity"/>
      </feComponentTransfer>
    </filter>
    <pattern id="p-diamante-${uid}" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M3 0 L6 3 L3 6 L0 3 Z" fill="none" stroke="#000" stroke-opacity=".30" stroke-width="1"/></pattern>
    <pattern id="p-punto-${uid}" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0 1 L3 5 L6 1" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="1"/></pattern>
    <pattern id="p-liso-${uid}" width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="none"/></pattern>
    <pattern id="p-stretch-${uid}" width="4" height="4" patternUnits="userSpaceOnUse">
      <line x1="0" y1="1" x2="4" y2="1" stroke="#000" stroke-opacity=".18" stroke-width="1"/></pattern>`;
}

function svgPrenda(vista, uid, omitirSombras = false) {
  const geo = geometria();
  const tela = telaActual();
  const color = colorActual().hex;
  const nombreVista = vista === 'front' ? 'frontal' : 'posterior';

  return `<svg viewBox="0 -42 300 392" xmlns="http://www.w3.org/2000/svg" class="prenda-svg" role="img"
      aria-label="Vista ${nombreVista} de ${esc(lineaActual().nombre)}, ${esc(mangaActual().nombre.toLowerCase())}">
    <defs>
      <clipPath id="clip-${uid}"><path d="${geo.silueta}"/></clipPath>
      ${htmlMascaraCinta(vista, uid)}
      ${defsSVG(uid)}
    </defs>
    ${omitirSombras ? '' : '<ellipse cx="150" cy="345" rx="100" ry="5" fill="#000" opacity=".28"/>'}
    <g class="capa capa-base">
      <path class="js-base-fill fill-transition" d="${geo.silueta}" style="fill:${color}"
            stroke="rgba(0,0,0,.55)" stroke-width="2" stroke-linejoin="round"/>
      <path class="js-base-patron" d="${geo.silueta}" fill="url(#p-${tela.patron}-${uid})" opacity=".6"/>
      ${omitirSombras ? '' : `<path d="${geo.silueta}" fill="url(#sombra-${uid})"/>`}
      ${geo.detalles[vista]}
    </g>
    <!-- Capucha / Gorro integrado en cuello -->
    ${estado.conGorro ? dibujarCapucha(vista, color) : ''}
    <g class="capa capa-cintas js-capa-cintas" clip-path="url(#clip-${uid})" mask="url(#mask-cinta-${uid})">${htmlCintas(vista)}</g>
    <g class="capa capa-logo js-capa-logo">${htmlLogo(vista, uid)}</g>
  </svg>`;
}

let claveCintas = '';
let claveLogo = '';
let claveGorro = '';

function construirVisor() {
  $('#visorSvg').innerHTML = svgPrenda(estado.vista, 'v');
  claveCintas = `${estado.linea}|${estado.manga}|${estado.vista}|${estado.cinta}|${estado.colorCinta}`;
  claveLogo = claveEstadoLogo(estado.vista);
  claveGorro = `${estado.conGorro}`;
  actualizarChipsVisor();
}

function actualizarZoom(zoom) {
  estado.zoom = Math.max(1, Math.min(2, zoom));
  $('#visorSvg').style.transform = `scale(${estado.zoom})`;
  $('#zoomNivel').textContent = `${Math.round(estado.zoom * 100)}%`;
  $('#zoomMenos').disabled = estado.zoom <= 1;
  $('#zoomMas').disabled = estado.zoom >= 2;
}

function actualizarVisor() {
  const svg = $('#visorSvg svg');
  if (!svg) { construirVisor(); return; }
  const color = colorActual().hex;

  $('.js-base-fill', svg).style.fill = color;
  $$('.capa-gorro > path[fill]', svg).forEach((p) => { if (p.getAttribute('fill') !== 'rgba(255,255,255,.14)') p.setAttribute('fill', color); });
  $('.js-base-patron', svg).setAttribute('fill', `url(#p-${telaActual().patron}-v)`);

  if (`${estado.conGorro}` !== claveGorro) {
    construirVisor();
    return;
  }

  const nuevaCinta = `${estado.linea}|${estado.manga}|${estado.vista}|${estado.cinta}|${estado.colorCinta}`;
  if (nuevaCinta !== claveCintas) {
    $('.js-capa-cintas', svg).innerHTML = htmlCintas(estado.vista);
    claveCintas = nuevaCinta;
  }

  const nuevoLogo = claveEstadoLogo(estado.vista);
  if (nuevoLogo !== claveLogo) {
    $('.js-capa-logo', svg).innerHTML = htmlLogo(estado.vista, 'v');
    $('#mask-cinta-v', svg).innerHTML = contenidoMascaraCinta(estado.vista);
    claveLogo = nuevoLogo;
  }

  actualizarChipsVisor();
}

function actualizarChipsVisor() {
  const color = colorActual();
  const m = marcajeActual();
  const u = ubicacionActual();
  const u2 = ubicaciones2Actuales();
  const p = paqueteActual();
  const chip = (texto, extra = '') =>
    `<span class="inline-flex items-center gap-1.5 bg-white/10 text-slate-100 text-xs font-semibold px-2.5 py-1 rounded-full">${extra}${esc(texto)}</span>`;

  const textoUbicacion = ubicacionesLogoTexto();

  $('#visorChips').innerHTML =
    chip(`${lineaActual().nombre} · ${mangaActual().nombre}`) +
    chip(`${telaActual().nombre} · ${color.nombre}`,
      `<span class="inline-block w-3 h-3 rounded-full border border-white/60" style="background:${color.hex}"></span>`) +
    chip(nombreCintaConfigurada()) +
    chip(m ? `${m.nombre} · ${textoUbicacion}` : 'Sin logo') +
    (estado.conGorro ? chip('Con gorro integrado') : '') +
    chip(p.nombre);

  const aviso = $('#visorAviso');
  const coincideAlguna = (u.vista === estado.vista) || u2.some((ubicacion) => ubicacion.vista === estado.vista) ||
    (estado.logoEspalda && estado.vista === 'back');
  if (m && !coincideAlguna) {
    aviso.hidden = false;
    aviso.textContent = `Los logos están en otra vista: cambia de pestaña (Frente / Espalda) para visualizarlos.`;
  } else {
    aviso.hidden = true;
  }
}

/* ==========================================================================
   RENDER DEL PANEL
   ========================================================================== */
function precioDesde(l) {
  return Math.min(...l.paquetes.map((p) => p.precio));
}

function renderLineas() {
  $('#listaLineas').closest('.paso').hidden = catalogo.lineas.length === 1;
  $('#listaLineas').innerHTML = catalogo.lineas.map((l) => `
    <button type="button" class="opcion opcion-prenda" data-accion="linea" data-id="${l.id}" aria-pressed="${l.id === estado.linea}">
      <svg viewBox="0 -42 300 392" class="mini-prenda" aria-hidden="true"><path d="${GEOMETRIA[l.modelo].larga.silueta}"/></svg>
      <span class="opcion-titulo">${esc(l.nombre)}</span>
      <span class="opcion-detalle">${esc(l.descripcion)}</span>
      <span class="opcion-precio">Desde ${crc(precioDesde(l))}</span>
    </button>`).join('');
}

function renderMangas() {
  const modelo = lineaActual().modelo;
  $('#listaMangas').innerHTML = catalogo.mangas.map((m) => `
    <button type="button" class="opcion opcion-prenda" data-accion="manga" data-id="${m.id}" aria-pressed="${m.id === estado.manga}">
      <svg viewBox="0 -42 300 392" class="mini-prenda" aria-hidden="true"><path d="${GEOMETRIA[modelo][m.id].silueta}"/></svg>
      <span class="opcion-titulo">${esc(m.nombre)}</span>
      ${m.descripcion ? `<span class="opcion-detalle">${esc(m.descripcion)}</span>` : ''}
      <span class="opcion-precio">${m.extra > 0 ? '+' + crc(m.extra) : 'Mismo precio'}</span>
    </button>`).join('');
}

function renderPaquetes() {
  const l = lineaActual();
  $('#listaPaquetes').innerHTML = (l.paquetes || []).map((p) => `
    <button type="button" class="opcion" data-accion="paquete" data-id="${p.id}" aria-pressed="${p.id === estado.paquete}">
      <span class="opcion-titulo">${esc(p.nombre)}</span>
      <span class="opcion-detalle">${esc(p.descripcion)}</span>
      <span class="opcion-precio">${crc(p.precio)} por camisa</span>
    </button>`).join('');
}

function renderTelas() {
  $('#listaTelas').innerHTML = lineaActual().telas.map((t) => `
    <button type="button" class="opcion" data-accion="tela" data-id="${t.id}" aria-pressed="${t.id === estado.tela}">
      <span class="opcion-titulo">${esc(t.nombre)}</span>
      <span class="opcion-detalle">${esc(t.descripcion)}</span>
      <span class="opcion-precio">${etiquetaExtra(t.extra)}</span>
    </button>`).join('');
}

function renderColores() {
  $('#listaColores').innerHTML = catalogo.colores.map((c) => `
    <button type="button" class="swatch" data-accion="color" data-id="${c.id}"
            style="background:${c.hex}" title="${esc(c.nombre)}" aria-label="${esc(c.nombre)}"
            aria-pressed="${c.id === estado.color}"></button>`).join('');
  $('#nombreColor').textContent = colorActual().nombre;
}

function renderCintas() {
  $('#listaCintas').innerHTML = lineaActual().cintas.map((c) => `
    <button type="button" class="opcion" data-accion="cinta" data-id="${c.id}" aria-pressed="${c.id === estado.cinta}">
      <span class="opcion-titulo">${esc(c.nombre)}</span>
      <span class="opcion-detalle">${esc(c.descripcion)}</span>
      <span class="opcion-precio">${c.extra > 0 ? 'Incluida + ' + crc(c.extra) : 'Incluida en el paquete'}</span>
    </button>`).join('');
}

function renderColoresCinta() {
  $('#listaColoresCinta').innerHTML = COLORES_CINTA.map((c) => `
    <button type="button" class="swatch" data-accion="color-cinta" data-id="${c.id}"
            style="background:${c.fondo}" title="${esc(c.nombre)}" aria-label="${esc(c.nombre)}"
            aria-pressed="${c.id === estado.colorCinta}"></button>`).join('');
  $('#nombreColorCinta').textContent = colorCintaActual().nombre;
}

function renderMarcajes() {
  $('#listaMarcajes').innerHTML = lineaActual().marcajes.map((m) => `
    <button type="button" class="opcion" data-accion="marcaje" data-id="${m.id}" aria-pressed="${m.id === estado.marcaje}">
      <span class="opcion-titulo">${esc(m.nombre)}</span>
      <span class="opcion-detalle">${esc(m.descripcion)}</span>
      <span class="opcion-precio">Incluido en el paquete</span>
    </button>`).join('');
}

function renderUbicaciones() {
  const principales = catalogo.ubicacionesLogo.filter(u => u.id !== 'manga_izq' && u.id !== 'manga_der');
  $('#listaUbicaciones').innerHTML = principales.map((u) => {
    if (u.id !== 'espalda') {
      return `<button type="button" class="opcion" data-accion="ubicacion" data-id="${u.id}" aria-pressed="${u.id === estado.ubicacion}">
        <span class="opcion-titulo">${esc(u.nombre)}</span>
        ${u.descripcion ? `<span class="opcion-detalle">${esc(u.descripcion)}</span>` : ''}
      </button>`;
    }

    return `<div class="opcion">
      <button type="button" class="opcion-titulo opcion-ubicacion-principal w-full" data-accion="ubicacion" data-id="${u.id}" aria-pressed="${u.id === estado.ubicacion}" disabled>
        ${esc(u.nombre)}
      </button>
      ${u.descripcion ? `<span class="opcion-detalle">${esc(u.descripcion)}</span>` : ''}
      <div id="bloqueLogoEspalda" hidden class="mt-2 pt-2 border-t border-slate-200">
        <label for="checkLogoEspalda" class="flex items-center justify-between gap-2 cursor-pointer">
          <span>
            <span class="block text-xs font-semibold text-slate-700">Logo (incluido)</span>
          </span>
          <span class="relative inline-flex h-6 w-11 flex-none">
            <input type="checkbox" id="checkLogoEspalda" class="peer sr-only" aria-label="Logo incluido en espalda">
            <span class="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-amber-500"></span>
            <span class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
          </span>
        </label>
      </div>
    </div>`;
  }).join('');

  const nombresSecundarios = textosConfiguracion.ubicacionesLogoAdicionales || {};
  const secundarios = [{ id: 'ninguna', nombre: 'Ninguna', extra: 0 }];
  if (['pecho_izq', 'centro'].includes(estado.ubicacion)) {
    secundarios.push({ id: 'pecho_der', nombre: 'Pecho derecho adicional', extra: 200 });
  }
  $('#listaUbicaciones2').innerHTML = secundarios.map((opcion) => {
    const texto = nombresSecundarios[opcion.id];
    const nombre = texto && typeof texto.nombre === 'string' ? texto.nombre : opcion.nombre;
    const descripcion = texto && typeof texto.descripcion === 'string' ? texto.descripcion : '';
    return `<button type="button" class="opcion" data-accion="ubicacion2" data-id="${opcion.id}" aria-pressed="${opcion.id === estado.ubicacion2}">
      <span class="opcion-titulo">${esc(nombre)}</span>
      ${descripcion ? `<span class="opcion-detalle">${esc(descripcion)}</span>` : ''}
      <span class="opcion-precio">${opcion.extra > 0 ? '+' + crc(opcion.extra) : 'Sin costo adicional'}</span>
    </button>`;
  }).join('');
  renderCargadoresLogos();
}

function htmlCargadorLogo(zona, titulo) {
  const imagen = estado.logos[zona];
  const cargando = estado.cargaLogo[zona];
  const switchFondoId = `checkQuitarFondoLogo-${zona}`;
  const controlFondo = imagen && estado.quitarFondoLogo[zona]
    ? `<div class="mt-3">
        <div class="flex items-center justify-between gap-2">
          <label for="toleranciaFondoLogo-${zona}" class="text-xs font-semibold text-slate-700">Limpieza de fondo (tolerancia)</label>
          <output class="text-xs font-semibold text-slate-600" data-tolerancia-valor="${zona}">${estado.toleranciaFondoLogo[zona]}</output>
        </div>
        <input id="toleranciaFondoLogo-${zona}" type="range" min="5" max="120" value="${estado.toleranciaFondoLogo[zona]}"
               class="w-full accent-amber-500" data-tolerancia-zona="${zona}" aria-label="Tolerancia de limpieza para ${esc(titulo.toLowerCase())}">
      </div>
      <button type="button" class="btn-ia-logo" data-accion="quitar-fondo-ia" data-zona="${zona}" ${cargando ? 'disabled' : ''}>
        Usar IA (fondos complejos)
      </button>`
    : '';
  return `<div class="cargador-logo" aria-busy="${Boolean(cargando)}">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="text-sm font-bold text-slate-700">${esc(titulo)}</span>
      <label class="btn-cargar-logo">
        <span>${imagen ? 'Cambiar imagen' : 'Subir imagen'}</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" data-logo-zona="${zona}" aria-label="${esc(`Subir ${titulo.toLowerCase()}`)}" ${cargando ? 'disabled' : ''}>
      </label>
    </div>
    <label for="${switchFondoId}" class="flex items-center justify-between gap-2 mt-3 cursor-pointer">
      <span class="text-xs font-semibold text-slate-700">Quitar fondo automáticamente</span>
      <span class="relative inline-flex h-6 w-11 flex-none">
        <input type="checkbox" id="${switchFondoId}" class="peer sr-only" role="switch"
               data-quitar-fondo-zona="${zona}" aria-label="Quitar fondo automáticamente para ${esc(titulo.toLowerCase())}"
               ${estado.quitarFondoLogo[zona] ? 'checked' : ''}>
        <span class="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-amber-500"></span>
        <span class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
      </span>
    </label>
    <div class="flex items-center gap-3 mt-2">
      ${imagen
        ? `<img class="vista-previa-logo" data-logo-preview-zona="${zona}" src="${esc(imagen)}" alt="Vista previa de ${esc(titulo.toLowerCase())}">`
        : `<span class="text-xs text-slate-500">Sin imagen; se mostrará el marcador genérico “LOGO”.</span>`}
      ${imagen ? `<button type="button" class="btn-quitar-logo" data-accion="quitar-logo" data-zona="${zona}" ${cargando ? 'disabled' : ''}>Quitar</button>` : ''}
    </div>
    ${controlFondo}
    ${cargando ? `<p class="estado-carga-logo" role="status">${esc(cargando)}</p>` : ''}
  </div>`;
}

function renderCargadoresLogos() {
  if (!$('#cargaLogoPrincipal')) return;
  $('#cargaLogoPrincipal').innerHTML = htmlCargadorLogo('principal', 'Logo principal (Pecho / Espalda)');
  $('#bloqueLogoEspaldaIgual').hidden = !estado.logoEspalda;
  $('#checkLogoEspaldaIgual').checked = estado.logoEspaldaIgual;
  $('#cargaLogoEspalda').hidden = !estado.logoEspalda || estado.logoEspaldaIgual;
  $('#cargaLogoEspalda').innerHTML = htmlCargadorLogo('espalda', 'Logo de espalda');
  $('#cargaLogoPechoDer').hidden = estado.ubicacion2 !== 'pecho_der';
  $('#cargaLogoPechoDer').innerHTML = htmlCargadorLogo('pecho_der', 'Logo de pecho derecho adicional');
  $('#cargaLogoMangaIzq').hidden = !estado.ubicacionesManga.manga_izq;
  $('#cargaLogoMangaIzq').innerHTML = htmlCargadorLogo('manga_izq', 'Logo de manga izquierda');
  $('#cargaLogoMangaDer').hidden = !estado.ubicacionesManga.manga_der;
  $('#cargaLogoMangaDer').innerHTML = htmlCargadorLogo('manga_der', 'Logo de manga derecha');
  $('#checkLogoMangaIzq').checked = !estado.ambasMangas && estado.ubicacionesManga.manga_izq;
  $('#checkLogoMangaDer').checked = !estado.ambasMangas && estado.ubicacionesManga.manga_der;
  $('#checkAmbasMangas').checked = estado.ambasMangas;
}

function renderTallas() {
  $('#listaTallas').innerHTML = catalogo.tallas.map((t) => `
    <div class="talla-caja" data-talla-caja="${t}">
      <div class="etiqueta">${t}</div>
      <div class="talla-ctrl">
        <button type="button" data-accion="talla-menos" data-talla="${t}" aria-label="Quitar una talla ${t}">−</button>
        <input type="number" inputmode="numeric" min="0" max="9999" value="${estado.tallas[t]}"
               class="input-talla" data-talla="${t}" aria-label="Cantidad talla ${t}">
        <button type="button" data-accion="talla-mas" data-talla="${t}" aria-label="Agregar una talla ${t}">+</button>
      </div>
    </div>`).join('');
}

function actualizarSecciones() {
  const p = paqueteActual();
  $('#bloquePaquete').hidden = false;
  $('#bloqueCinta').hidden = !p.incluye.cinta;
  $('#bloqueMarcaje').hidden = !p.incluye.logo;
  $('#bloqueUbicacion').hidden = !marcajeActual();
  $('#bloqueLogoEspalda').hidden = p.id !== 'cinta_logo' || !marcajeActual();
  $('#checkLogoEspalda').checked = estado.logoEspalda;
}

function renderPanelDependiente() {
  renderMangas();
  renderPaquetes();
  renderTelas();
  renderCintas();
  renderColoresCinta();
  renderMarcajes();
  renderUbicaciones();
  actualizarSecciones();
}

/* ==========================================================================
   MOTOR DE COTIZACIÓN
   ========================================================================== */
function escalasPara(paquete) {
  const escalas = catalogo.escalasDescuento;
  return escalas.map((escala) => {
    const porcentajes = escala.pctPorPaquete;
    if (!porcentajes || !Number.isFinite(porcentajes[paquete.id])) {
      throw new Error(`Falta configurar el descuento del paquete "${paquete.id}" en ${escala.etiqueta}.`);
    }
    return { ...escala, pct: porcentajes[paquete.id] };
  });
}

function escalaPara(cantidad, escalas) {
  if (cantidad < 1) return escalas[0];
  return escalas.find((e) => cantidad >= e.min && (e.max === null || cantidad <= e.max)) || escalas[0];
}

function calcular() {
  const l = lineaActual();
  const t = telaActual();
  const c = cintaActual();
  const m = marcajeActual();
  const p = paqueteActual();
  const ma = mangaActual();

  const filas = [];
  const incluidos = [];

  const cantidadMangasLogo = Object.values(estado.ubicacionesManga).filter(Boolean).length;
  const costoLogoPecho = m && estado.ubicacion2 === 'pecho_der' ? 200 : 0;
  const costoLogoMangas = !m ? 0 : cantidadMangasLogo === 2 ? 300 : cantidadMangasLogo === 1 ? 200 : 0;
  const costoExtraLogo = costoLogoPecho + costoLogoMangas;

  const costoGorro = estado.conGorro ? 300 : 0;

  const precioUnitario = p.precio + t.extra + ma.extra + c.extra + costoExtraLogo + costoGorro;
  filas.push({ k: `Paquete: ${p.nombre}`, v: crc(p.precio) });
  filas.push({ k: `Tela (${t.nombre})`, v: etiquetaExtra(t.extra) });
  if (c.extra > 0) filas.push({ k: `Adicional cinta reflectiva (${nombreCintaConfigurada(c)})`, v: '+' + crc(c.extra) });
  if (ma.extra > 0) filas.push({ k: ma.nombre, v: '+' + crc(ma.extra) });
  if (estado.conGorro) filas.push({ k: 'Gorro / Capucha integrada', v: '+' + crc(costoGorro) });
  if (costoLogoPecho > 0) filas.push({ k: `Logo adicional (${ubicacion2Actual().nombre})`, v: '+' + crc(costoLogoPecho) });
  if (costoLogoMangas > 0) {
    const nombresMangas = ubicacionesMangaActivas().map((ubicacion) => ubicacion.nombre).join(' + ');
    filas.push({ k: `Logos en mangas (${nombresMangas})`, v: '+' + crc(costoLogoMangas) });
  }
  incluidos.push('camisa');
  if (p.incluye.cinta) incluidos.push(nombreCintaConfigurada(c).toLowerCase());
  if (p.incluye.logo) incluidos.push(`logo (${ubicacionesLogoTexto().toLowerCase()})`);

  const cantidad = totalPrendas();
  const escalasDescuento = escalasPara(p);
  const escala = escalaPara(cantidad, escalasDescuento);
  const pct = escala.pct;

  const unitarioConDescuento = Math.round(precioUnitario * (1 - pct / 100));
  const brutoSinDescuento = precioUnitario * cantidad;
  const subtotal = unitarioConDescuento * cantidad;
  const ahorro = brutoSinDescuento - subtotal;
  const iva = estado.aplicarIva ? Math.round(subtotal * catalogo.empresa.ivaPorcentaje / 100) : 0;
  const total = subtotal + iva;

  return { l, t, c, m, p, ma, filas, incluidos, costoGorro, precioUnitario, cantidad, escalasDescuento, escala, pct, unitarioConDescuento, brutoSinDescuento, subtotal, ahorro, iva, total };
}

function renderDesglose() {
  const r = calcular();
  const ivaPct = catalogo.empresa.ivaPorcentaje;

  const siguiente = r.escalasDescuento.find((e) => e.min > r.cantidad && e.pct > r.pct);
  let pista = '';
  if (r.cantidad === 0) {
    pista = 'Ingresa las cantidades por talla para calcular tu descuento por volumen.';
  } else if (siguiente) {
    pista = `Agrega <strong>${siguiente.min - r.cantidad}</strong> unidad(es) más y obtén <strong>${formatoPorcentaje(siguiente.pct)}%</strong> de descuento.`;
  } else {
    pista = r.escala.nota ? esc(r.escala.nota) : 'Ya tienes el máximo descuento por volumen.';
  }

  const escalasPaquetes = lineaActual().paquetes.map((paquete) => ({ paquete, escalas: escalasPara(paquete) }));
  const tablaDescuentos = `<div class="tabla-descuentos-contenedor" aria-label="Descuentos por paquete y cantidad">
        <table class="tabla-descuentos">
          <thead><tr><th scope="col">Unidades</th>${escalasPaquetes.map(({ paquete }) => `<th scope="col">${esc(paquete.nombre)}</th>`).join('')}</tr></thead>
          <tbody>${r.escalasDescuento.map((escala, indice) => `
            <tr>
              <th scope="row">${esc(escala.etiqueta.replace(' unidades', ''))}</th>
              ${escalasPaquetes.map(({ paquete, escalas }) => {
                const activa = r.cantidad > 0 && paquete.id === r.p.id && escala.min === r.escala.min;
                return `<td class="${activa ? 'actual' : ''}"${activa ? ' aria-current="true"' : ''}>${formatoPorcentaje(escalas[indice].pct)}%</td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  $('#desgloseContenido').innerHTML = `
    <p class="text-sm text-slate-600 mb-2"><strong>El paquete incluye:</strong> ${esc(r.incluidos.join(', '))}.</p>
    <dl>
      ${r.filas.map((f) => `<div class="fila-precio"><dt>${esc(f.k)}</dt><dd>${f.v}</dd></div>`).join('')}
      <div class="fila-precio border-t border-slate-200 mt-1 pt-2"><dt class="font-bold text-slate-800">Precio unitario regular</dt><dd>${crc(r.precioUnitario)}</dd></div>
      <div class="fila-precio"><dt>Cantidad total</dt><dd>${r.cantidad} prenda(s)</dd></div>
      <div class="fila-precio"><dt>Descuento por volumen</dt><dd class="${r.pct ? 'text-green-700' : ''}">${formatoPorcentaje(r.pct)}%${r.ahorro ? ' (−' + crc(r.ahorro) + ')' : ''}</dd></div>
      <div class="fila-precio"><dt class="font-bold text-slate-800">Precio unitario con descuento</dt><dd>${crc(r.unitarioConDescuento)}</dd></div>
      <div class="fila-precio border-t border-slate-200 mt-1 pt-2"><dt>Subtotal</dt><dd>${crc(r.subtotal)}</dd></div>
      <div class="fila-precio"><dt class="flex items-center gap-2"><label class="cursor-pointer inline-flex items-center gap-1.5"><input type="checkbox" id="checkIva" ${estado.aplicarIva ? 'checked' : ''} class="w-4 h-4 accent-seguridad"> IVA estimado (${ivaPct}%)</label></dt><dd>${crc(r.iva)}</dd></div>
    </dl>
    <div class="fila-total mt-2" aria-live="polite"><span class="font-bold uppercase text-sm tracking-wide">Total general</span><span class="monto">${crc(r.total)}</span></div>
    <p class="text-sm text-slate-600 mt-3">${pista}</p>
    ${tablaDescuentos}`;

  $('#totalTallas').textContent = r.cantidad;
  $('#barraTotal').textContent = crc(r.total);
  $('#barraCantidad').textContent = `${r.cantidad} prenda(s)`;
}

/* ==========================================================================
   WHATSAPP E IMPRESIÓN CON DESCARGA DE IMAGEN PNG
   ========================================================================== */
function datosCliente() {
  return {
    empresa:  $('#cliEmpresa').value.trim(),
    contacto: $('#cliContacto').value.trim(),
    telefono: $('#cliTelefono').value.trim(),
    notas:    $('#cliNotas').value.trim()
  };
}

function numeroCotizacion(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `COT-${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}-${dos(fecha.getHours())}${dos(fecha.getMinutes())}`;
}

const fechaLarga = (fecha = new Date()) =>
  fecha.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });

const tallasConCantidad = () => catalogo.tallas.filter((t) => estado.tallas[t] > 0);

const textoLogo = (m) => {
  if (!m) return 'Sin logo';
  return `${m.nombre} (${ubicacionesLogoTexto()})`;
};

function validarPedido() {
  if (totalPrendas() > 0) return true;
  mostrarAviso('Selecciona al menos una talla con cantidad antes de cotizar.', 'error');
  const bloque = $('#bloqueTallas');
  bloque.classList.remove('sacudir');
  void bloque.offsetWidth;
  bloque.classList.add('sacudir');
  bloque.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
}

function armarMensaje(r, cot, fecha) {
  const cli = datosCliente();
  const L = [];

  L.push(`*COTIZACIÓN / PEDIDO — ${catalogo.empresa.nombre}*`);
  L.push(`N.º ${cot}  |  ${fechaLarga(fecha)}`);
  L.push('');

  if (cli.empresa || cli.contacto || cli.telefono) {
    L.push('*Cliente*');
    if (cli.empresa)  L.push(`• Empresa / Nombre: ${cli.empresa}`);
    if (cli.contacto) L.push(`• Contacto: ${cli.contacto}`);
    if (cli.telefono) L.push(`• Teléfono: ${cli.telefono}`);
    L.push('');
  }

  L.push('*Detalle del producto*');
  L.push(`• Prenda: ${r.l.nombre} — ${r.ma.nombre}`);
  L.push(`• Paquete: ${r.p.nombre}`);
  L.push(`• Tela: ${r.t.nombre}`);
  L.push(`• Color: ${colorActual().nombre}`);
  L.push(`• Cinta reflectiva: ${nombreCintaConfigurada(r.c)}`);
  L.push(`• Gorro / Capucha integrada: ${estado.conGorro ? 'Sí (+' + crc(r.costoGorro) + ')' : 'No'}`);
  L.push(`• Logo: ${textoLogo(r.m)}`);
  L.push('');

  L.push('*Cantidades por talla*');
  tallasConCantidad().forEach((t) => L.push(`• ${t}: ${estado.tallas[t]}`));
  L.push(`• Total de prendas: ${r.cantidad}`);
  L.push('');

  L.push('*Valores (CRC)*');
  L.push(`• Precio unitario regular: ${crc(r.precioUnitario)}`);
  if (r.pct > 0) L.push(`• Descuento por volumen: ${formatoPorcentaje(r.pct)}%`);
  L.push(`• Precio unitario con descuento: ${crc(r.unitarioConDescuento)}`);
  L.push(`• Subtotal: ${crc(r.subtotal)}`);
  if (estado.aplicarIva) L.push(`• IVA (${catalogo.empresa.ivaPorcentaje}%): ${crc(r.iva)}`);
  L.push(`• *TOTAL: ${crc(r.total)}*`);

  if (cli.notas) { L.push(''); L.push(`*Observaciones:* ${cli.notas}`); }
  L.push('');
  L.push(`_Cotización estimada, válida por ${catalogo.empresa.validezDias} días._`);
  return L.join('\n');
}

function cargarVistaComoImagen(vista, uid) {
  const estilo = '<style>.det{fill:none;stroke:rgba(0,0,0,.45);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.det-relleno{fill:rgba(255,255,255,.07)}</style>';
  const omitirSombras = uid === 'pf' || uid === 'pb';
  const svg = svgPrenda(vista, uid, omitirSombras)
    .replace('<svg viewBox=', '<svg width="600" height="784" viewBox=')
    .replace('<defs>', estilo + '<defs>');
  const blobURL = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(blobURL);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(blobURL);
      reject(new Error(`No se pudo generar la vista ${vista === 'front' ? 'frontal' : 'posterior'}.`));
    };
    image.src = blobURL;
  });
}

async function rasterizarVistaParaHoja(vista, uid) {
  const imagen = await cargarVistaComoImagen(vista, uid);
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 784;
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('No se pudo crear el lienzo para la hoja de impresión.');

  contexto.fillStyle = '#fff';
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

async function descargarImagenMontaje() {
  const [frente, espalda] = await Promise.all([
    cargarVistaComoImagen('front', 'share-front'),
    cargarVistaComoImagen('back', 'share-back')
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el lienzo de la vista previa.');

  context.fillStyle = '#1e293b';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f59e0b';
  context.font = '700 28px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('FRENTE', 250, 38);
  context.fillText('ESPALDA', 750, 38);
  context.drawImage(frente, 10, 55, 480, 628);
  context.drawImage(espalda, 510, 55, 480, 628);

  const downloadLink = document.createElement('a');
  downloadLink.href = canvas.toDataURL('image/png');
  downloadLink.download = `montaje-uniforme-${estado.linea}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function enviarWhatsApp() {
  if (!validarPedido()) return;

  const numero = String(catalogo.empresa.telefonoWhatsApp).replace(/\D/g, '');
  if (numero.length < 8) {
    mostrarAviso('Configura el número de WhatsApp en productos.json', 'error');
    return;
  }

  const r = calcular();
  const fecha = new Date();
  const mensaje = armarMensaje(r, numeroCotizacion(fecha), fecha);
  const url = `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.target = '_blank';
  enlace.rel = 'noopener noreferrer';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  descargarImagenMontaje().then(() => {
    mostrarAviso('¡Imagen con frente y espalda descargada! Adjúntala en el chat de WhatsApp que se abrió.', 'ok');
  }).catch((err) => {
    console.error('No se pudo generar la vista previa de frente y espalda:', err);
    mostrarAviso('No se pudo generar la imagen de frente y espalda. Adjunta una vista previa manualmente.', 'error');
  });
}

async function construirHoja() {
  const r = calcular();
  const cli = datosCliente();
  const fecha = new Date();
  const e = catalogo.empresa;
  const fila = (k, v) => `<tr><th>${k}</th><td>${v}</td></tr>`;
  const filasPrecio = r.filas.map((f) => `<tr><th>${esc(f.k)}</th><td class="num">${f.v}</td></tr>`).join('');
  const [pngFrente, pngEspalda] = await Promise.all([
    rasterizarVistaParaHoja('front', 'pf'),
    rasterizarVistaParaHoja('back', 'pb')
  ]);

  $('#hojaCotizacion').innerHTML = `
    <div class="hoja-encabezado">
      <div>
        <h1>${esc(e.nombre.split(' ')[0])} <span>${esc(e.nombre.split(' ').slice(1).join(' '))}</span></h1>
        <p>${esc(e.eslogan)}</p>
      </div>
      <div class="hoja-meta">
        <strong>COTIZACIÓN</strong><br>N.º ${numeroCotizacion(fecha)}<br>${fechaLarga(fecha)}
      </div>
    </div>
    <div class="hoja-seccion">
      <h2>Datos del cliente</h2>
      <table class="hoja-tabla">
        ${fila('Empresa / Nombre', esc(cli.empresa || '—'))}
        ${fila('Contacto', esc(cli.contacto || '—'))}
        ${fila('Teléfono', esc(cli.telefono || '—'))}
      </table>
    </div>
    <div class="hoja-seccion hoja-producto">
      <h2>Producto configurado</h2>
      <div class="hoja-visuales">
        <figure><img src="${pngFrente}" alt="Frente"></figure>
        <figure><img src="${pngEspalda}" alt="Espalda"></figure>
      </div>
      <table class="hoja-tabla" style="margin-top:8px">
        ${fila('Prenda', esc(`${r.l.nombre} — ${r.ma.nombre}`))}
        ${fila('Paquete', esc(r.p.nombre))}
        ${fila('Tela', esc(r.t.nombre))}
        ${fila('Color', esc(colorActual().nombre))}
        ${fila('Cinta reflectiva', esc(nombreCintaConfigurada(r.c)))}
        ${fila('Gorro / Capucha', estado.conGorro ? 'Sí (+' + crc(r.costoGorro) + ')' : 'No')}
        ${fila('Logo', esc(textoLogo(r.m)))}
      </table>
    </div>
    <div class="hoja-seccion">
      <h2>Cantidades por talla</h2>
      <table class="hoja-tabla tallas">
        <tr>${catalogo.tallas.map((t) => `<th>${t}</th>`).join('')}<th>Total</th></tr>
        <tr>${catalogo.tallas.map((t) => `<td>${estado.tallas[t]}</td>`).join('')}<td><strong>${r.cantidad}</strong></td></tr>
      </table>
    </div>
    <div class="hoja-seccion">
      <h2>Desglose de precios (CRC)</h2>
      <table class="hoja-tabla">
        ${filasPrecio}
        <tr><th>Precio unitario regular</th><td class="num">${crc(r.precioUnitario)}</td></tr>
        <tr><th>Descuento por volumen (${formatoPorcentaje(r.pct)}%)</th><td class="num">${r.ahorro ? '−' + crc(r.ahorro) : '₡0'}</td></tr>
        <tr><th>Precio unitario con descuento</th><td class="num">${crc(r.unitarioConDescuento)}</td></tr>
        <tr><th>Subtotal</th><td class="num">${crc(r.subtotal)}</td></tr>
        ${estado.aplicarIva ? `<tr><th>IVA (${e.ivaPorcentaje}%)</th><td class="num">${crc(r.iva)}</td></tr>` : ''}
        <tr class="hoja-total"><td>TOTAL GENERAL</td><td class="num">${crc(r.total)}</td></tr>
      </table>
    </div>
    ${cli.notas ? `<p class="hoja-nota"><strong>Observaciones:</strong> ${esc(cli.notas)}</p>` : ''}
  `;
}

async function imprimirCotizacion() {
  if (!validarPedido()) return;
  try {
    await construirHoja();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    window.print();
  } catch (error) {
    console.error('No se pudo preparar la hoja para imprimir:', error);
    mostrarAviso('No se pudo preparar la hoja para el PDF. Inténtalo de nuevo.', 'error');
  }
}

/* ==========================================================================
   EVENTOS E INICIALIZACIÓN
   ========================================================================== */
function cambiarTalla(talla, valor, normalizar = false) {
  const input = $(`.input-talla[data-talla="${talla}"]`);
  if (valor === '' && !normalizar) {
    estado.tallas[talla] = 0;
    if (input) input.setAttribute('value', '0');
    renderDesglose();
    return;
  }
  const numero = typeof valor === 'number' ? valor : parseInt(valor, 10);
  const n = Math.max(0, Math.min(9999, Number.isFinite(numero) ? Math.floor(numero) : 0));
  estado.tallas[talla] = n;
  if (input && (input.value === '' || Number(input.value) !== n)) input.value = n;
  if (input) input.setAttribute('value', n);
  renderDesglose();
}

const URL_REMOCION_FONDO = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm';
const URL_REMOCION_FONDO_RESPALDO = 'https://esm.sh/@imgly/background-removal@1.4.5';
let promesaRemovedorFondo = null;

function cargarRemovedorFondo() {
  if (!promesaRemovedorFondo) {
    const importar = async (url) => {
      const modulo = await import(url);
      if (typeof modulo.removeBackground !== 'function') {
        throw new Error('El módulo no expone removeBackground.');
      }
      return modulo.removeBackground;
    };

    promesaRemovedorFondo = importar(URL_REMOCION_FONDO)
      .catch((error) => {
        console.warn('No se pudo cargar el removedor desde jsDelivr; se intentará el CDN de respaldo.', error);
        return importar(URL_REMOCION_FONDO_RESPALDO);
      })
      .catch((error) => {
        promesaRemovedorFondo = null;
        throw error;
      });
  }
  return promesaRemovedorFondo;
}

function leerDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === 'string') resolve(lector.result);
      else reject(new Error('No se pudo leer la imagen como Data URL.'));
    };
    lector.onerror = () => reject(lector.error || new Error('No se pudo leer la imagen.'));
    lector.readAsDataURL(blob);
  });
}

function quitarFondoCanvas(dataUrlOriginal, tolerancia) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => {
      try {
        const ancho = imagen.naturalWidth;
        const alto = imagen.naturalHeight;
        if (!ancho || !alto) throw new Error('La imagen no tiene dimensiones válidas.');

        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        const contexto = canvas.getContext('2d');
        if (!contexto) throw new Error('No se pudo crear el contexto de imagen.');

        contexto.drawImage(imagen, 0, 0, ancho, alto);
        const imagenData = contexto.getImageData(0, 0, ancho, alto);
        const pixeles = imagenData.data;
        const esquinas = [
          0,
          (ancho - 1) * 4,
          (alto - 1) * ancho * 4,
          ((alto - 1) * ancho + ancho - 1) * 4
        ];

        if (esquinas.some((indice) => pixeles[indice + 3] < 240)) {
          resolve(dataUrlOriginal);
          return;
        }

        const fondo = [0, 0, 0];
        esquinas.forEach((indice) => {
          fondo[0] += pixeles[indice];
          fondo[1] += pixeles[indice + 1];
          fondo[2] += pixeles[indice + 2];
        });
        fondo.forEach((_, canal) => { fondo[canal] /= esquinas.length; });

        for (let indice = 0; indice < pixeles.length; indice += 4) {
          const distancia = Math.hypot(
            pixeles[indice] - fondo[0],
            pixeles[indice + 1] - fondo[1],
            pixeles[indice + 2] - fondo[2]
          );
          if (distancia <= tolerancia) {
            pixeles[indice + 3] = 0;
          } else if (distancia < tolerancia + 18) {
            pixeles[indice + 3] = Math.round(((distancia - tolerancia) / 18) * 255);
          }
        }

        contexto.putImageData(imagenData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    imagen.onerror = () => reject(new Error('No se pudo cargar la imagen para limpiar su fondo.'));
    imagen.src = dataUrlOriginal;
  });
}

function actualizarVistaPreviaLogo(zona) {
  const previa = document.querySelector(`[data-logo-preview-zona="${zona}"]`);
  if (previa && estado.logos[zona]) previa.src = estado.logos[zona];
}

async function aplicarProcesoLogo(zona) {
  const original = estado.logosOriginales[zona];
  if (!original) return false;

  const version = ++estado.versionProcesoLogo[zona];
  const imagen = estado.quitarFondoLogo[zona]
    ? await quitarFondoCanvas(original, estado.toleranciaFondoLogo[zona])
    : original;
  if (version !== estado.versionProcesoLogo[zona]) return false;

  estado.logos = { ...estado.logos, [zona]: imagen };
  estado.revisionLogos += 1;
  actualizarVisor();
  actualizarVistaPreviaLogo(zona);
  return true;
}

function reportarErrorLogo(zona, error, mensaje) {
  console.error(`No se pudo procesar el logo de ${zona}:`, error);
  mostrarAviso(mensaje, 'error');
}

async function procesarLogo(zona, archivo) {
  const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
  if (!tiposPermitidos.includes(archivo.type)) {
    mostrarAviso('Formato no válido. Usa una imagen PNG, JPEG o WebP.', 'error');
    return;
  }

  estado.cargaLogo[zona] = 'Cargando imagen…';
  renderCargadoresLogos();

  try {
    const original = await leerDataUrl(archivo);
    estado.logosOriginales = { ...estado.logosOriginales, [zona]: original };
    estado.logos = { ...estado.logos, [zona]: null };
    estado.revisionLogos += 1;
    actualizarVisor();
    await aplicarProcesoLogo(zona);
    mostrarAviso('Logo cargado correctamente.', 'ok');
  } catch (error) {
    reportarErrorLogo(zona, error, 'No se pudo cargar o limpiar el logo. Inténtalo de nuevo.');
  } finally {
    estado.cargaLogo[zona] = '';
    renderCargadoresLogos();
  }
}

async function procesarLogoConIA(zona) {
  const original = estado.logosOriginales[zona];
  if (!original || !estado.quitarFondoLogo[zona]) return;

  const version = ++estado.versionProcesoLogo[zona];
  estado.cargaLogo[zona] = 'Eliminando fondo con IA…';
  renderCargadoresLogos();
  try {
    const removeBackground = await cargarRemovedorFondo();
    const imagen = await removeBackground(original, { output: { format: 'image/png' } });
    const imagenBase64 = await leerDataUrl(imagen);
    if (version !== estado.versionProcesoLogo[zona]) return;

    estado.logos = { ...estado.logos, [zona]: imagenBase64 };
    estado.revisionLogos += 1;
    actualizarVisor();
    actualizarVistaPreviaLogo(zona);
  } catch (error) {
    if (version === estado.versionProcesoLogo[zona]) {
      reportarErrorLogo(zona, error, 'No se pudo aplicar el quitafondos con IA. Verifica tu conexión e inténtalo de nuevo.');
    }
  } finally {
    estado.cargaLogo[zona] = '';
    renderCargadoresLogos();
  }
}

function manejarClic(ev) {
  const el = ev.target.closest('[data-accion]');
  if (!el || !catalogo) return;
  const { accion, id, talla } = el.dataset;

  switch (accion) {
    case 'linea': {
      estado.linea = id;
      const l = lineaActual();
      if (!l.telas.some((t) => t.id === estado.tela)) estado.tela = l.telas[0].id;
      if (!l.paquetes.some((p) => p.id === estado.paquete)) {
        estado.paquete = (l.paquetes.find((p) => p.incluye.cinta) || l.paquetes[0]).id;
      }
      normalizarSeleccion();
      sincronizar('#listaLineas', id);
      renderPanelDependiente();
      construirVisor();
      break;
    }
    case 'manga':
      estado.manga = id;
      sincronizar('#listaMangas', id);
      construirVisor();
      break;
    case 'paquete':
      estado.paquete = id;
      normalizarSeleccion();
      sincronizar('#listaPaquetes', id);
      renderCintas();
      renderMarcajes();
      actualizarSecciones();
      construirVisor();
      break;
    case 'tela':
      estado.tela = id;
      sincronizar('#listaTelas', id);
      actualizarVisor();
      break;
    case 'color':
      estado.color = id;
      sincronizar('#listaColores', id);
      $('#nombreColor').textContent = colorActual().nombre;
      actualizarVisor();
      break;
    case 'cinta':
      estado.cinta = id;
      sincronizar('#listaCintas', id);
      actualizarSecciones();
      actualizarVisor();
      break;
    case 'color-cinta':
      estado.colorCinta = id;
      sincronizar('#listaColoresCinta', id);
      $('#nombreColorCinta').textContent = colorCintaActual().nombre;
      actualizarVisor();
      break;
    case 'marcaje':
      estado.marcaje = id;
      sincronizar('#listaMarcajes', id);
      actualizarSecciones();
      estado.vista = ubicacionActual().vista;
      sincronizar('#toggleVista', estado.vista);
      construirVisor();
      break;
    case 'ubicacion':
      estado.ubicacion = id;
      if (!['pecho_izq', 'centro'].includes(id)) estado.ubicacion2 = 'ninguna';
      estado.vista = ubicacionActual().vista;
      renderUbicaciones();
      actualizarSecciones();
      sincronizar('#listaUbicaciones', id);
      sincronizar('#toggleVista', estado.vista);
      construirVisor();
      break;
    case 'ubicacion2':
      estado.ubicacion2 = id;
      sincronizar('#listaUbicaciones2', id);
      renderCargadoresLogos();
      actualizarVisor();
      break;
    case 'quitar-logo':
      if (!Object.prototype.hasOwnProperty.call(estado.logos, el.dataset.zona)) return;
      estado.versionProcesoLogo[el.dataset.zona] += 1;
      estado.logos = { ...estado.logos, [el.dataset.zona]: null };
      estado.logosOriginales = { ...estado.logosOriginales, [el.dataset.zona]: null };
      estado.revisionLogos += 1;
      renderCargadoresLogos();
      actualizarVisor();
      return;
    case 'quitar-fondo-ia':
      if (!Object.prototype.hasOwnProperty.call(estado.logosOriginales, el.dataset.zona)) return;
      procesarLogoConIA(el.dataset.zona);
      return;
    case 'vista':
      estado.vista = id;
      sincronizar('#toggleVista', id);
      construirVisor();
      break;
    case 'zoom-mas':
      actualizarZoom(estado.zoom + 0.25);
      return;
    case 'zoom-menos':
      actualizarZoom(estado.zoom - 0.25);
      return;
    case 'zoom-restablecer':
      actualizarZoom(1);
      return;
    case 'talla-mas':   cambiarTalla(talla, (estado.tallas[talla] || 0) + 1); return;
    case 'talla-menos': cambiarTalla(talla, (estado.tallas[talla] || 0) - 1); return;
    case 'limpiar-tallas':
      catalogo.tallas.forEach((t) => { estado.tallas[t] = 0; });
      renderTallas();
      renderDesglose();
      return;
    case 'whatsapp': enviarWhatsApp(); return;
    case 'imprimir': imprimirCotizacion(); return;
    default: return;
  }
  renderDesglose();
}

function manejarInput(ev) {
  const controlTolerancia = ev.target.closest('[data-tolerancia-zona]');
  if (controlTolerancia) {
    if (ev.type === 'input') {
      const zona = controlTolerancia.dataset.toleranciaZona;
      const tolerancia = Number(controlTolerancia.value);
      if (Object.prototype.hasOwnProperty.call(estado.toleranciaFondoLogo, zona) && Number.isFinite(tolerancia)) {
        estado.toleranciaFondoLogo[zona] = tolerancia;
        const salida = document.querySelector(`[data-tolerancia-valor="${zona}"]`);
        if (salida) salida.textContent = String(tolerancia);
        aplicarProcesoLogo(zona).catch((error) => {
          reportarErrorLogo(zona, error, 'No se pudo actualizar la limpieza del logo.');
        });
      }
    }
    return;
  }

  if (ev.type === 'change') {
    const switchFondo = ev.target.closest('[data-quitar-fondo-zona]');
    if (switchFondo) {
      const zona = switchFondo.dataset.quitarFondoZona;
      if (Object.prototype.hasOwnProperty.call(estado.quitarFondoLogo, zona)) {
        estado.quitarFondoLogo[zona] = switchFondo.checked;
        renderCargadoresLogos();
        if (estado.logosOriginales[zona]) {
          aplicarProcesoLogo(zona)
            .then(() => renderCargadoresLogos())
            .catch((error) => {
              reportarErrorLogo(zona, error, 'No se pudo actualizar la limpieza del logo.');
              renderCargadoresLogos();
            });
        }
      }
      return;
    }

    const inputLogo = ev.target.closest('[data-logo-zona]');
    if (inputLogo) {
      const archivo = inputLogo.files && inputLogo.files[0];
      const zona = inputLogo.dataset.logoZona;
      inputLogo.value = '';
      if (archivo && Object.prototype.hasOwnProperty.call(estado.logos, zona)) {
        procesarLogo(zona, archivo);
      }
      return;
    }
  }

  const input = ev.target.closest('.input-talla');
  if (input) {
    cambiarTalla(input.dataset.talla, input.value, ev.type !== 'input');
    return;
  }
  if (ev.type === 'blur') return;
  if (ev.target.id === 'checkIva') {
    estado.aplicarIva = ev.target.checked;
    renderDesglose();
  }
  if (ev.target.id === 'checkGorro') {
    estado.conGorro = ev.target.checked;
    actualizarVisor();
    renderDesglose();
  }
  if (ev.target.id === 'checkLogoEspalda' && estado.logoEspalda !== ev.target.checked) {
    estado.logoEspalda = ev.target.checked;
    renderCargadoresLogos();
    actualizarVisor();
    renderDesglose();
  }
  if (ev.target.id === 'checkLogoEspaldaIgual') {
    estado.logoEspaldaIgual = ev.target.checked;
    renderCargadoresLogos();
    actualizarVisor();
  }
  if (ev.target.id === 'checkLogoMangaIzq' || ev.target.id === 'checkLogoMangaDer') {
    const zona = ev.target.id === 'checkLogoMangaIzq' ? 'manga_izq' : 'manga_der';
    estado.ambasMangas = false;
    estado.ubicacionesManga = ev.target.checked
      ? { manga_izq: zona === 'manga_izq', manga_der: zona === 'manga_der' }
      : { manga_izq: false, manga_der: false };
    renderCargadoresLogos();
    actualizarVisor();
    renderDesglose();
  }
  if (ev.target.id === 'checkAmbasMangas') {
    estado.ambasMangas = ev.target.checked;
    estado.ubicacionesManga = {
      manga_izq: estado.ambasMangas,
      manga_der: estado.ambasMangas
    };
    renderCargadoresLogos();
    actualizarVisor();
    renderDesglose();
  }
}

async function iniciar() {
  try {
    const respuestas = await Promise.all([
      fetch(RUTA_CATALOGO, { cache: 'no-cache' }),
      fetch(RUTA_TEXTOS, { cache: 'no-cache' })
    ]);
    if (!respuestas[0].ok) throw new Error('Error al cargar ' + RUTA_CATALOGO + ': HTTP ' + respuestas[0].status);
    if (!respuestas[1].ok) throw new Error('Error al cargar ' + RUTA_TEXTOS + ': HTTP ' + respuestas[1].status);
    catalogo = await respuestas[0].json();
    textosConfiguracion = await respuestas[1].json();
    aplicarTextos();
  } catch (err) {
    console.error('No se pudo cargar la configuración:', err);
    $('#errorCatalogo').hidden = false;
    $('#app').hidden = true;
    return;
  }

  const l0 = catalogo.lineas[0];
  estado.linea = l0.id;
  estado.tela = l0.telas[0].id;
  estado.color = catalogo.colores[0].id;
  estado.ubicacion = catalogo.ubicacionesLogo[0].id;
  estado.paquete = (l0.paquetes.find((p) => p.incluye.cinta) || l0.paquetes[0]).id;
  catalogo.tallas.forEach((t) => { estado.tallas[t] = 0; });
  normalizarSeleccion();

  $('#empresaNombre').textContent = catalogo.empresa.nombre;
  $('#empresaEslogan').textContent = catalogo.empresa.eslogan;
  $('#empresaTelefono').textContent = catalogo.empresa.telefonoVisible;
  const textoGorro = textosConfiguracion.interfaz && textosConfiguracion.interfaz.gorro;
  if (typeof textoGorro === 'string') $('#textoGorro').textContent = textoGorro;
  $('#anioActual').textContent = new Date().getFullYear();
  $('#ivaTexto').textContent = catalogo.empresa.ivaPorcentaje;

  renderLineas();
  renderColores();
  renderUbicaciones();
  renderPanelDependiente();
  renderTallas();
  construirVisor();
  actualizarZoom(estado.zoom);
  renderDesglose();

  document.addEventListener('click', manejarClic);
  document.addEventListener('input', manejarInput);
  document.addEventListener('change', manejarInput);
  document.addEventListener('blur', manejarInput, true);
}

document.addEventListener('DOMContentLoaded', iniciar);
