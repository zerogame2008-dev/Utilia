// Orden = orden de aparición en navegación y home.
export const categories = [
  {
    slug: 'pdf', name: 'PDF', icon: 'file', title: 'Herramientas PDF',
    description: 'Une, divide, rota, ordena y convierte PDF directamente en tu navegador. Tus documentos no salen de tu dispositivo.',
    seoTitle: 'Herramientas PDF online gratis: unir, dividir, convertir',
    faq: [
      ['¿Se suben mis PDF a algún servidor?', 'No en las herramientas marcadas como «En tu dispositivo»: el documento se procesa con JavaScript dentro de tu navegador y nunca se envía. Las herramientas que necesitan servidor lo indican antes de subir nada.'],
      ['¿Hay límite de tamaño?', 'El límite lo marca la memoria de tu dispositivo. Como referencia, documentos de hasta 100 MB funcionan bien en un ordenador; en móvil conviene no pasar de 30–40 MB.'],
      ['¿Funcionan con PDF protegidos con contraseña?', 'Los PDF cifrados no se pueden modificar sin la contraseña. Si el documento tiene contraseña de apertura, la herramienta te avisará.'],
    ],
  },
  {
    slug: 'imagenes', name: 'Imágenes', icon: 'image', title: 'Herramientas de imágenes',
    description: 'Comprime, redimensiona, recorta y convierte imágenes entre JPG, PNG y WebP sin instalar nada y sin subirlas.',
    seoTitle: 'Herramientas de imágenes online: comprimir, redimensionar, convertir',
    faq: [
      ['¿Pierde calidad la imagen?', 'Convertir a PNG no pierde calidad. JPG y WebP comprimen con pérdida: con una calidad del 80 % la diferencia rara vez es visible y el archivo pesa mucho menos.'],
      ['¿Se conservan los metadatos EXIF?', 'No. Al procesar la imagen se eliminan los metadatos (ubicación GPS, modelo de cámara…), lo que además mejora tu privacidad.'],
    ],
  },
  {
    slug: 'texto', name: 'Texto', icon: 'text', title: 'Herramientas de texto',
    description: 'Cuenta palabras, limpia, ordena, compara y transforma texto al instante.',
    seoTitle: 'Herramientas de texto online: contar, limpiar, comparar',
    faq: [
      ['¿Se guarda el texto que escribo?', 'No. Todo el procesamiento ocurre en tu navegador y el texto no se envía ni se almacena.'],
    ],
  },
  {
    slug: 'conversores', name: 'Conversores', icon: 'ruler', title: 'Conversores de unidades',
    description: 'Convierte longitud, peso, temperatura, velocidad, datos y más con factores exactos.',
    seoTitle: 'Conversores de unidades online: longitud, peso, temperatura',
    faq: [
      ['¿De dónde salen los factores de conversión?', 'Se usan las definiciones exactas del Sistema Internacional y de las unidades anglosajonas (por ejemplo, 1 pulgada = 2,54 cm exactos; 1 libra = 0,45359237 kg exactos).'],
    ],
  },
  {
    slug: 'calculadoras', name: 'Calculadoras', icon: 'calc', title: 'Calculadoras online',
    description: 'Porcentajes, IVA, descuentos, intereses, fechas, edad, IMC y más, con el cálculo explicado.',
    seoTitle: 'Calculadoras online gratis: IVA, porcentajes, fechas, intereses',
    faq: [
      ['¿Son fiables los resultados?', 'Los cálculos son deterministas y se muestran con la fórmula aplicada para que puedas comprobarlos. En temas fiscales, de salud o financieros son orientativos y no sustituyen a un profesional.'],
    ],
  },
  {
    slug: 'desarrollo', name: 'Desarrollo', icon: 'code', title: 'Herramientas para desarrolladores',
    description: 'JSON, Base64, URL, UUID, hashes, expresiones regulares, JWT, colores y más. Sin enviar tus datos.',
    seoTitle: 'Herramientas para desarrolladores: JSON, Base64, UUID, Regex',
    faq: [
      ['¿Es seguro pegar datos sensibles, como un JWT?', 'Las herramientas de esta categoría se ejecutan en tu navegador y no envían lo que pegas. Aun así, trata los tokens de producción como secretos.'],
    ],
  },
  {
    slug: 'seo', name: 'SEO', icon: 'search', title: 'Herramientas SEO',
    description: 'Previsualiza resultados de Google, genera robots.txt y etiquetas meta, y analiza densidad de palabras clave.',
    seoTitle: 'Herramientas SEO online: SERP preview, robots.txt, meta tags',
    faq: [
      ['¿La vista previa de Google es exacta?', 'Es una aproximación: Google recorta títulos por anchura en píxeles (unos 580 px) y puede reescribir el título o la descripción. Úsala como guía, no como garantía.'],
    ],
  },
  {
    slug: 'ia', name: 'IA', icon: 'sparkles', title: 'Herramientas con IA',
    description: 'Herramientas que usan modelos de inteligencia artificial. Se identifican siempre con la etiqueta IA porque sus resultados no son deterministas.',
    seoTitle: 'Herramientas con inteligencia artificial',
    faq: [
      ['¿En qué se diferencian del resto?', 'Las calculadoras y conversores dan siempre el mismo resultado exacto. Las herramientas con IA generan una respuesta probable que conviene revisar, y el contenido se envía a un proveedor de IA para procesarlo.'],
    ],
  },
];

export const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
