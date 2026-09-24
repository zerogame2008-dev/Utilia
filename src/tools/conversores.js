import { UNITS } from '../../public/js/tools/units-data.js';
import { CURRENCIES } from '../../public/js/tools/money.js';

// Un conversor por magnitud, generado desde la tabla de unidades (fuente única).
const KINDS = {
  longitud: { name: 'longitud', from: 'km', to: 'mi', pop: 70, kw: ['km a millas', 'metros a pies', 'cm a pulgadas', 'convertir distancia'], about: 'Una pulgada son exactamente 2,54 cm y una milla terrestre 1.609,344 m. La milla náutica (1.852 m) se usa en navegación marítima y aérea.' },
  peso: { name: 'peso', from: 'kg', to: 'lb', pop: 70, kw: ['kilos a libras', 'libras a kilos', 'gramos a onzas', 'convertir masa'], about: 'Una libra equivale exactamente a 0,45359237 kg y una onza a 28,349523125 g. Un stone (usado en Reino Unido) son 14 libras.' },
  temperatura: { name: 'temperatura', from: 'c', to: 'f', pop: 65, kw: ['celsius a fahrenheit', 'fahrenheit a celsius', 'grados kelvin', 'convertir grados'], about: '°F = °C × 9/5 + 32 y K = °C + 273,15. El agua se congela a 0 °C (32 °F) y hierve a 100 °C (212 °F) a nivel del mar.' },
  velocidad: { name: 'velocidad', from: 'kmh', to: 'mph', pop: 40, kw: ['km/h a mph', 'nudos a km/h', 'metros por segundo', 'convertir velocidad'], about: '1 m/s = 3,6 km/h exactos. Un nudo es una milla náutica por hora: 1,852 km/h.' },
  tiempo: { name: 'tiempo', from: 'h', to: 'min', pop: 35, kw: ['horas a minutos', 'segundos a horas', 'dias a horas', 'convertir tiempo'], about: 'Para meses y años se usan valores medios del calendario gregoriano: un año de 365,25 días y un mes de 30,44 días.' },
  area: { name: 'área', from: 'm2', to: 'ft2', pop: 35, kw: ['metros cuadrados a pies', 'hectareas a acres', 'm2', 'convertir superficie'], about: 'Una hectárea son 10.000 m² (un cuadrado de 100 × 100 m) y un acre unos 4.047 m².' },
  volumen: { name: 'volumen', from: 'l', to: 'galus', pop: 35, kw: ['litros a galones', 'ml a onzas', 'metros cubicos a litros', 'tazas'], about: 'El galón estadounidense (3,785 L) y el imperial británico (4,546 L) son distintos: comprueba cuál usa tu receta o ficha técnica.' },
  energia: { name: 'energía', from: 'kcal', to: 'kj', pop: 25, kw: ['kcal a kj', 'calorias a julios', 'kwh', 'btu'], about: 'La «caloría» de las etiquetas nutricionales es en realidad una kilocaloría (kcal) = 4,184 kJ.' },
  datos: { name: 'datos digitales', from: 'gb', to: 'mb', pop: 40, kw: ['mb a gb', 'gb a tb', 'bytes', 'megas a gigas', 'gib'], about: 'Los fabricantes de discos usan múltiplos de 1000 (1 GB = 1.000.000.000 bytes) y muchos sistemas operativos múltiplos de 1024 (GiB). Por eso un disco de 1 TB aparece como unos 931 GiB.' },
  frecuencia: { name: 'frecuencia', from: 'mhz', to: 'ghz', pop: 15, kw: ['hz a khz', 'mhz a ghz', 'rpm a hz'], about: '1 Hz es un ciclo por segundo. 60 rpm equivalen a 1 Hz.' },
  presion: { name: 'presión', from: 'bar', to: 'psi', pop: 25, kw: ['bar a psi', 'psi a bar', 'atmosferas', 'presion neumaticos'], about: '1 bar = 100.000 Pa, casi una atmósfera (1,01325 bar). La presión de neumáticos suele darse en bar o en PSI (1 bar ≈ 14,5 PSI).' },
};

const opts = (kind) => Object.entries(UNITS[kind].units).map(([k, [label]]) => [k, `${label} (${k})`]);

const cur = Object.entries(CURRENCIES).map(([k, v]) => [k, `${k} · ${v}`]);
const moneda = {
  slug: 'conversor-moneda', name: 'Conversor de monedas', family: 'money', icon: 'euro', live: true, popularity: 75,
  short: 'Convierte euros, dólares, pesos y otras 40 monedas con el tipo de cambio de referencia del día.',
  seoTitle: 'Conversor de monedas: euros, dólares, pesos y más',
  description: 'Convierte entre euros, dólares, libras, pesos mexicanos, argentinos, colombianos y otras monedas con tipos de referencia de bancos centrales.',
  keywords: ['cambio de moneda', 'euros a dolares', 'dolares a euros', 'tipo de cambio', 'convertir divisas', 'euro a peso', 'divisas', 'moneda'],
  fields: [{ name: 'importe', type: 'number', label: 'Importe', value: 100, min: 0, step: 'any' }, { name: 'de', type: 'select', label: 'De', value: 'EUR', half: true, options: cur }, { name: 'a', type: 'select', label: 'A', value: 'USD', half: true, options: cur }],
  swap: ['de', 'a'],
  howto: { title: 'Cómo convertir monedas', steps: ['Escribe el importe.', 'Elige la moneda de origen y la de destino.', 'Consulta el resultado, el tipo aplicado y su fecha.'] },
  about: ['Los tipos proceden de Frankfurter, un servicio abierto que publica tipos de referencia de bancos centrales como el BCE. Se actualizan cada día laborable; los fines de semana se mantiene el último.', 'Son tipos medios de mercado: casas de cambio, bancos y tarjetas aplican su propio margen, así que el importe final que pagues o recibas será algo distinto.'],
  faq: [['¿Se envía el importe que escribo?', 'No. La página descarga la tabla de tipos del día y el cálculo se hace en tu navegador.'], ['¿Con qué frecuencia se actualizan los tipos?', 'Una vez por día laborable, cuando los bancos centrales publican sus tipos de referencia. Se indica siempre la fecha del tipo usado.']],
  related: ['calculadora-porcentajes', 'calculadora-iva', 'calculadora-descuentos'],
};

export default [moneda, ...Object.entries(KINDS).map(([kind, k]) => ({
  slug: `conversor-${kind}`, name: `Conversor de ${k.name}`, family: 'units', icon: 'ruler', live: true, popularity: k.pop,
  options: { kind },
  short: `Convierte unidades de ${k.name} al instante y mira la equivalencia en todas las unidades.`,
  seoTitle: `Conversor de ${k.name} online`,
  description: `Convierte unidades de ${k.name}: ${Object.values(UNITS[kind].units).slice(0, 5).map((u) => u[0].toLowerCase()).join(', ')} y más, con factores exactos.`,
  keywords: [...k.kw, `convertir ${k.name}`, `unidades de ${k.name}`],
  fields: [{ name: 'valor', type: 'number', label: 'Valor', value: 1, step: 'any' }, { name: 'de', type: 'select', label: 'De', value: k.from, half: true, options: opts(kind) }, { name: 'a', type: 'select', label: 'A', value: k.to, half: true, options: opts(kind) }],
  swap: ['de', 'a'],
  howto: { title: `Cómo convertir unidades de ${k.name}`, steps: ['Escribe el valor.', 'Elige la unidad de origen y la de destino.', 'Consulta el resultado y la tabla con todas las unidades.'] },
  about: [k.about],
  faq: [['¿Cuántos decimales muestra?', 'Hasta 6 decimales para valores normales y hasta 10 para valores menores que 1, sin redondear el cálculo interno.']],
  related: Object.keys(KINDS).filter((x) => x !== kind).slice(0, 4).map((x) => `conversor-${x}`),
}))];
