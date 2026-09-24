import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stats, changeCase, clean, sortLines, dedupe, slugify, diffLines } from '../public/js/tools/text.js';
import calc, { ymd, workdays, parseTime, numbers, compound } from '../public/js/tools/calc.js';
import { b64encode, b64decode, md5, formatJson, jsonError, parseColor, toHex, toHsl, contrast, minifyCss, formatCss, parseInstant } from '../public/js/tools/dev.js';
import { convert } from '../public/js/tools/units-data.js';
import { parseRanges, crc32 } from '../public/js/tools/_shared.js';
import { robots, sitemap, density, cut } from '../public/js/tools/seo.js';
import { exifOrientation } from '../public/js/tools/pdf.js';
import { palette } from '../public/js/tools/image.js';
import { search } from '../public/js/search.js';
import { cross } from '../public/js/tools/money.js';
import { searchIndex } from '../src/registry.js';

test('texto', () => {
  const s = stats('Hola mundo. Esto es una prueba.\n\nSegundo párrafo, con más palabras.');
  assert.equal(s.palabras, 11); assert.equal(s.parrafos, 2); assert.equal(s.frases, 3);
  assert.equal(stats('👍🏽 ñ').caracteres, 3);
  assert.equal(changeCase('hola ñandú', 'upper'), 'HOLA ÑANDÚ');
  assert.equal(changeCase('Hola Mundo feliz', 'camel'), 'holaMundoFeliz');
  assert.equal(changeCase('hola. adiós', 'sentence'), 'Hola. Adiós');
  assert.equal(clean('  a   b \n\n\n c ', { espacios: true, recortar: true, vacias: true }), 'a b\nc');
  assert.equal(clean('linea uno que\nsigue aquí\n\nOtro', { saltos: true }), 'linea uno que sigue aquí\n\nOtro');
  assert.equal(sortLines('b\n10\n2\na', 'az'), '2\n10\na\nb');
  assert.deepEqual(dedupe('a\nA\nb\na', { mayus: true }), { text: 'a\nb', removed: 2 });
  assert.equal(slugify('¿Cómo comprimir un PDF sin perder calidad?', '-', true), 'comprimir-pdf-sin-perder-calidad');
  assert.equal(slugify('Año & niño'), 'ano-y-nino');
  assert.deepEqual(diffLines('a\nb\nc', 'a\nx\nc').map((d) => d[0]).join(''), ' -+ ');
});

test('calculadoras', () => {
  assert.deepEqual(ymd(Date.UTC(2000, 1, 29), Date.UTC(2026, 2, 1)), { y: 26, m: 0, d: 0 }); // 29-feb cumple el 1-mar
  assert.equal(workdays(Date.UTC(2026, 8, 21), Date.UTC(2026, 8, 28)), 5); // lunes a lunes
  assert.equal(parseTime('1:02:03'), 3723); assert.equal(parseTime('50:00'), 3000);
  assert.deepEqual(numbers('7,5; 8 9'), [7.5, 8, 9]); assert.deepEqual(numbers('1,2,3'), [1, 2, 3]); assert.deepEqual(numbers('7, 8.5, 6'), [7, 8.5, 6]);
  const iva = calc['calculadora-iva']({ importe: 121, tipo: '21', modo: 'con' });
  assert.equal(iva.stats[0][1].replace(/\s/g, ' '), '100,00 €');
  assert.equal(calc['regla-de-tres']({ a: 4, b: 6, c: 8, tipo: 'inversa' }).stats[0][1], '3');
  const rows = compound({ capital: 1000, aporte: 0, tasa: 12, anios: 1, freq: 1 });
  assert.ok(Math.abs(rows[0][2] - 1120) < 1e-6);
  assert.throws(() => calc['calculadora-imc']({ peso: 70, altura: 1.75 }), /centímetros/);
});

test('conversores', () => {
  assert.equal(convert('longitud', 1, 'in', 'cm'), 2.54);
  assert.ok(Math.abs(convert('peso', 1, 'kg', 'lb') - 2.2046226218) < 1e-9);
  assert.equal(convert('temperatura', 100, 'c', 'f'), 212);
  assert.equal(Math.round(convert('temperatura', 0, 'k', 'c') * 100) / 100, -273.15);
  assert.equal(convert('datos', 1, 'gib', 'mib'), 1024);
});

test('desarrollo', () => {
  assert.equal(b64decode(b64encode('¡Hola ñ 😀!')), '¡Hola ñ 😀!');
  assert.equal(b64encode('??>', true), 'Pz8-');
  assert.equal(md5(''), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(md5('The quick brown fox jumps over the lazy dog'), '9e107d9d372bb6826bd81d3542a419d6');
  assert.equal(formatJson('{"b":1,"a":2}', 'min', true), '{"a":2,"b":1}');
  let err; try { JSON.parse('{\n  "a": 1,\n}'); } catch (e) { err = e; }
  assert.equal(jsonError('{\n  "a": 1,\n}', err).line, 3);
  assert.equal(toHex(parseColor('rgb(79, 70, 229)')), '#4f46e5');
  assert.equal(toHex(parseColor('#fff')), '#ffffff');
  assert.equal(toHex(parseColor('hsl(0 100% 50%)')), '#ff0000');
  assert.deepEqual(toHsl({ r: 255, g: 0, b: 0 }), { h: 0, s: 100, l: 50 });
  assert.equal(contrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21);
  assert.equal(minifyCss('/* x */ .a > b , .c { color : red ; margin : 0 auto ; }'), '.a>b,.c{color:red;margin:0 auto}');
  assert.equal(minifyCss('a{content:"a  ;  b"}'), 'a{content:"a  ;  b"}');
  assert.equal(minifyCss('.a{width:calc(1px + 2px)}'), '.a{width:calc(1px + 2px)}');
  assert.match(formatCss('@media (x){.d{color:red}}'), /@media \(x\) \{\n {2}\.d \{\n {4}color: red;\n {2}\}\n\}/);
  assert.equal(parseInstant('1767225600').toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(parseInstant('1767225600000').toISOString(), '2026-01-01T00:00:00.000Z');
});

test('monedas: tipo cruzado', () => {
  const r = { EUR: 1, USD: 1.25, MXN: 20 };
  assert.equal(cross(r, 100, 'EUR', 'USD'), 125);
  assert.equal(cross(r, 125, 'USD', 'MXN'), 2000);
  assert.throws(() => cross(r, 1, 'EUR', 'XXX'), /no está disponible/);
  assert.equal(search(searchIndex, 'euros a dolares', { limit: 1 })[0].s, 'conversor-moneda');
});

test('seo', () => {
  assert.match(robots({ modo: 'permitir', bloquear: 'admin/', ia: true, sitemap: 'https://e.com/s.xml' }), /Disallow: \/admin\/[\s\S]*User-agent: GPTBot\nDisallow: \/[\s\S]*Sitemap: https:\/\/e.com\/s.xml/);
  const s = sitemap('https://e.com/a&b\nhttps://e.com/a&b\nftp://x\nnope', '2026-09-24');
  assert.equal(s.ok.length, 1); assert.equal(s.bad.length, 2); assert.match(s.xml, /a&amp;b/);
  assert.equal(density('pdf pdf gratis', 1, true).rows[0][0], 'pdf');
  assert.equal(cut('corto', 580, '20px Arial')[1], false);
});

test('utilidades', () => {
  assert.deepEqual(parseRanges('1-3, 5, 8-', 9), [0, 1, 2, 4, 7, 8]);
  assert.throws(() => parseRanges('0-2', 5), /no existe/); assert.throws(() => parseRanges('abc', 5), /no es un rango/);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(exifOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda])), 1);
  const px = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255]);
  assert.deepEqual(palette(px, 2).map(([c]) => c), [[255, 0, 0], [0, 0, 255]]);
});

test('buscador', () => {
  const top = (q) => search(searchIndex, q, { limit: 3 }).map((t) => t.s);
  assert.equal(top('pasar foto a pdf')[0], 'jpg-a-pdf');
  assert.ok(top('pasar foto a pdf').includes('png-a-pdf'));
  assert.equal(top('juntar pdf')[0], 'unir-pdf');
  assert.equal(top('calcular iva')[0], 'calculadora-iva');
  assert.equal(top('reducir peso foto')[0], 'comprimir-imagen');
  assert.equal(top('contraseña')[0], 'generador-contrasenas');
  assert.equal(top('hex a rgb')[0], 'conversor-colores');
  assert.deepEqual(top(''), []);
});
