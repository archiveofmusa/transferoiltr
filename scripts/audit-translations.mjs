import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const locales = ['tr', 'en', 'ru', 'ar'];
const errors = [];
const warnings = [];

const flatten = (value, prefix = '', result = new Map()) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, result));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key, result));
  } else {
    result.set(prefix, value);
  }
  return result;
};

const placeholders = (value) => typeof value === 'string'
  ? [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort().join(',')
  : '';

const parsed = {};
for (const locale of locales) {
  const file = path.join(root, 'messages', `${locale}.json`);
  try {
    parsed[locale] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${locale}: JSON okunamadı (${error.message})`);
  }
}

if (parsed.tr) {
  const reference = flatten(parsed.tr);
  for (const locale of locales.slice(1)) {
    if (!parsed[locale]) continue;
    const current = flatten(parsed[locale]);
    for (const [key, value] of reference) {
      if (!current.has(key)) errors.push(`${locale}: eksik anahtar ${key}`);
      else if (typeof current.get(key) === 'string' && !current.get(key).trim()) errors.push(`${locale}: boş çeviri ${key}`);
      else if (placeholders(value) !== placeholders(current.get(key))) errors.push(`${locale}: yer tutucu uyuşmazlığı ${key}`);
    }
    for (const key of current.keys()) if (!reference.has(key)) errors.push(`${locale}: fazla anahtar ${key}`);
  }
}

if (parsed.ar) {
  for (const [key, value] of flatten(parsed.ar)) {
    if (typeof value !== 'string' || key.startsWith('LocaleSwitcher.options')) continue;
    const scrubbed = value.replace(/Transfer Oil Türkiye/gi, '').replace(/TRANSFER OIL TÜRKİYE/g, '').replace(/Umut Gündoğdu/gi, '');
    if (/[çğıöşüÇĞİÖŞÜ]/.test(scrubbed)) warnings.push(`ar: olası Türkçe kalıntı ${key}`);
    if (/\b(Home|Company|Contact|News|Exhibitions|Request|Read More|Download|Technical Support)\b/i.test(scrubbed)) warnings.push(`ar: olası İngilizce arayüz metni ${key}`);
  }
}

const sourceRoots = [path.join(root, 'src', 'app', '[locale]'), path.join(root, 'src', 'components')];
const sourceFiles = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) sourceFiles.push(full);
  }
};
sourceRoots.filter(fs.existsSync).forEach(collect);

const suspiciousUi = /["'`](Ana Sayfa|İletişim|Teknik Destek|Teklif Al|Ürünler|Haberler|Fuarlar|Sertifikalar|Kurumsal|Uygulamalar)["'`]/g;
for (const file of sourceFiles) {
  // This module is an explicit four-locale copy dictionary used by generated
  // manifest pages, so its Turkish values are not untranslated UI literals.
  if (path.basename(file) === 'manifest-page-copy.ts') continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(suspiciousUi)) warnings.push(`kaynak: olası sabit arayüz metni ${path.relative(root, file)} -> ${match[1]}`);
}

console.log(`Çeviri denetimi: ${locales.length} dil, ${parsed.tr ? flatten(parsed.tr).size : 0} yaprak anahtar.`);
warnings.forEach((warning) => console.warn(`UYARI: ${warning}`));
if (errors.length) {
  errors.forEach((error) => console.error(`HATA: ${error}`));
  process.exit(1);
}
console.log(`Başarılı. ${warnings.length} uyarı, 0 hata.`);
