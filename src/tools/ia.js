// Herramientas tipo C (IA). Se procesan en el backend (/api/ai/<slug>) con la clave en variables de entorno.
// Solo se publican si hay proveedor configurado en el build (AI_PROVIDER); si no, quedan en borrador.
const enabled = !!process.env.AI_PROVIDER;

export default [
  {
    slug: 'resumir-texto', name: 'Resumir texto con IA', family: 'ai', type: 'ai', icon: 'sparkles', status: enabled ? 'published' : 'draft', popularity: 50, submit: 'Resumir',
    short: 'Obtén un resumen claro de un texto largo, en párrafo o en puntos clave.',
    seoTitle: 'Resumir texto con IA',
    description: 'Resume textos largos con inteligencia artificial: elige extensión y formato (párrafo o puntos clave). Revisa siempre el resultado.',
    keywords: ['resumir texto', 'resumen automatico', 'resumidor', 'sintetizar texto', 'ia resumen'],
    fields: [{ name: 'texto', type: 'textarea', label: 'Texto a resumir', rows: 10, maxLength: 20000, counter: 20000 }, { name: 'formato', type: 'select', label: 'Formato', value: 'puntos', half: true, options: [['puntos', 'Puntos clave'], ['parrafo', 'Párrafo']] }, { name: 'longitud', type: 'select', label: 'Extensión', value: 'media', half: true, options: [['corta', 'Corta'], ['media', 'Media'], ['larga', 'Detallada']] }],
    howto: { title: 'Cómo resumir un texto', steps: ['Pega el texto (hasta 20.000 caracteres).', 'Elige el formato y la extensión.', 'Revisa el resumen antes de usarlo.'] },
    about: ['El texto se envía a un proveedor de IA para generar el resumen y no se almacena en nuestros servidores. La IA puede omitir matices o cometer errores: compruébalo con el original si es importante.'],
    faq: [['¿Se guarda mi texto?', 'No lo almacenamos. Se envía al proveedor de IA solo para generar la respuesta, según su política de uso de la API (sin entrenamiento con tus datos).']],
    related: ['contador-palabras', 'limpiar-texto', 'pdf-a-texto'],
  },
];

// Hoja de ruta visible en /herramientas/ia (no indexable mientras no haya herramientas publicadas).
export const planned = ['Análisis de documentos', 'OCR inteligente', 'Análisis de imágenes', 'Extracción de datos de facturas', 'Clasificación de textos', 'Asistentes especializados'];
