import Image from 'next/image';
import { Container } from '@/components/Container';
import { Link } from '@/i18n/navigation';
import {
  getTransferOilPage,
  getTransferOilRoute,
  getTransferOilSource,
  type TransferOilContentPage,
  type TransferOilLocale,
  type TransferOilRoute,
  type TransferOilSourceRow,
} from '@/data/transferoil/registry';
import {
  getManifestPageTypeLabel,
  getManifestSectionLabel,
  manifestPageCopy,
  type ManifestPageCopy,
} from './manifest-page-copy';
import {
  getManifestDescription,
  getManifestDocuments,
  getManifestImage,
  getManifestTables,
  getManifestTechnicalEntries,
  getManifestTitle,
  getManifestTranslation,
  localizeTechnicalLabel,
} from './manifest-page-utils';
import { TransferOilManifestBreadcrumbs } from './TransferOilManifestBreadcrumbs';

type ManifestTemplateProps = {
  page: TransferOilContentPage;
  source: TransferOilSourceRow;
  route: TransferOilRoute;
  locale: TransferOilLocale;
  copy: ManifestPageCopy;
};

type ManifestMode = 'category' | 'product' | 'editorial' | 'document';

function PageHero({ page, source, route, locale, copy, mode }: ManifestTemplateProps & { mode: ManifestMode }) {
  const translation = getManifestTranslation(page, locale);
  const title = getManifestTitle(page, locale);
  const description = getManifestDescription(page, locale);
  const image = getManifestImage(page);
  const eyebrow = translation.eyebrow || getManifestSectionLabel(locale, page.mainSection);
  const altText = translation.altText || title;
  const showProductVisual = mode === 'product' && Boolean(image);

  return (
    <section className="border-b border-line bg-white">
      <Container>
        <div className="rounded-b-2xl border-x border-b border-line bg-white px-5 py-4 sm:px-8">
          <TransferOilManifestBreadcrumbs route={route} locale={locale} copy={copy} />
        </div>

        {showProductVisual ? (
          <div className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
            <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-[#f3f3f3] sm:min-h-[380px]">
              <Image
                src={image!}
                alt={altText}
                fill
                priority={false}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-contain p-7 sm:p-10"
              />
            </div>
            <div className="pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="border border-line px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-steel">
                  {getManifestPageTypeLabel(locale, page.pageType)}
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-signal">{eyebrow}</span>
              </div>
              <h1 dir="auto" className="to-product-title mt-5 max-w-3xl text-graphiteDark">
                {title}
              </h1>
              {description && <p dir="auto" className="mt-6 max-w-2xl text-base leading-8 text-steel sm:text-lg">{description}</p>}
              <span aria-hidden="true" className="mt-8 block h-1 w-12 bg-signal" />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl py-12 text-center sm:py-14">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="border border-line px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-steel">
                {getManifestPageTypeLabel(locale, page.pageType)}
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-signal">{eyebrow}</span>
            </div>
            <h1 dir="auto" className="mt-5 text-4xl font-bold leading-tight tracking-[-0.025em] text-graphiteDark sm:text-5xl lg:text-[3.75rem]">
              {title}
            </h1>
            {description && <p dir="auto" className="mx-auto mt-6 max-w-5xl text-base leading-7 text-steel">{description}</p>}
            <span aria-hidden="true" className="mx-auto mt-8 block h-1 w-12 bg-signal" />
          </div>
        )}
      </Container>
    </section>
  );
}

function Overview({ page, locale, copy }: Pick<ManifestTemplateProps, 'page' | 'locale' | 'copy'>) {
  const description = getManifestDescription(page, locale);
  if (!description) return null;
  return (
    <section aria-labelledby={`overview-${page.id}`}>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-signal">{copy.overview}</p>
      <h2 id={`overview-${page.id}`} dir="auto" className="sr-only">{getManifestTitle(page, locale)}</h2>
      <p className="mt-4 max-w-4xl text-base leading-8 text-steel">{description}</p>
    </section>
  );
}

function TranslationLists({ page, locale, copy }: Pick<ManifestTemplateProps, 'page' | 'locale' | 'copy'>) {
  const translation = getManifestTranslation(page, locale);
  const lists = [
    { title: copy.benefits, items: translation.benefits },
    { title: copy.applications, items: translation.applications },
  ].filter((group) => group.items.length > 0);
  if (!lists.length) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {lists.map((group) => (
        <section key={group.title} className="border border-line bg-white p-6" aria-label={group.title}>
          <h2 className="text-xl font-extrabold text-navy">{group.title}</h2>
          <ul className="mt-5 space-y-3">
            {group.items.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-steel">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-signal" />
                <span dir="auto">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function formatTechnicalValue(value: string | number | boolean, copy: ManifestPageCopy): string {
  if (typeof value === 'boolean') return value ? copy.yes : copy.no;
  return String(value);
}

function TechnicalData({ page, locale, copy, showEmpty = false }: Pick<ManifestTemplateProps, 'page' | 'locale' | 'copy'> & { showEmpty?: boolean }) {
  const entries = getManifestTechnicalEntries(page, locale, copy);
  if (!entries.length && !showEmpty) return null;
  return (
    <section aria-labelledby={`technical-${page.id}`}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-0.5 w-8 bg-signal" />
        <h2 id={`technical-${page.id}`} className="text-2xl font-extrabold text-navy">{copy.technicalHeading}</h2>
      </div>
      {entries.length ? (
        <dl className="mt-6 grid border-s border-t border-line sm:grid-cols-2">
          {entries.map((entry, index) => (
            <div key={`${entry.label}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] border-b border-e border-line bg-white">
              <dt dir="auto" className="bg-mist px-4 py-3 text-xs font-bold text-steel">{entry.label}</dt>
              <dd dir="ltr" className="px-4 py-3 text-start text-sm font-semibold text-navy [unicode-bidi:plaintext]">
                {formatTechnicalValue(entry.value, copy)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-5 border-s-2 border-signal bg-mist p-4 text-sm leading-6 text-steel">{copy.technicalEmpty}</p>
      )}
    </section>
  );
}

function TechnicalTables({ page, locale, copy }: Pick<ManifestTemplateProps, 'page' | 'locale' | 'copy'>) {
  const tables = getManifestTables(page);
  if (!tables.length) return null;
  return (
    <section aria-labelledby={`tables-${page.id}`}>
      <h2 id={`tables-${page.id}`} className="text-2xl font-extrabold text-navy">{copy.tableHeading}</h2>
      <div className="mt-6 space-y-7">
        {tables.map((table, tableIndex) => (
          <div key={`${table.caption ?? copy.tableLabel}-${tableIndex}`} className="overflow-x-auto border border-line bg-white">
            <table dir="ltr" className="min-w-full border-collapse text-start text-xs text-navy">
              <caption className="border-b border-line bg-mist px-4 py-3 text-start font-extrabold">
                {table.caption || `${copy.tableLabel} ${tableIndex + 1}`}
              </caption>
              {table.headers.some(Boolean) && (
                <thead className="bg-graphiteDark text-white">
                  <tr>{table.headers.map((header, index) => <th key={`${header}-${index}`} scope="col" className="whitespace-nowrap border-e border-white/15 px-4 py-3 font-bold last:border-e-0">{localizeTechnicalLabel(header, locale)}</th>)}</tr>
                </thead>
              )}
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-line odd:bg-white even:bg-mist/55">
                    {row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap border-e border-line px-4 py-3 last:border-e-0">{localizeTechnicalLabel(cell, locale)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

function Documents({ page, copy }: Pick<ManifestTemplateProps, 'page' | 'copy'>) {
  const documents = getManifestDocuments(page);
  if (!documents.length) return null;
  return (
    <section aria-labelledby={`documents-${page.id}`}>
      <h2 id={`documents-${page.id}`} className="text-2xl font-extrabold text-navy">{copy.documents}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {documents.map((document, index) => (
          <article key={document.href} className="border border-line bg-white p-5 shadow-card">
            <p dir="auto" className="font-extrabold text-navy">{document.title || `${copy.document} ${index + 1}`}</p>
            <p className="mt-2 text-xs leading-5 text-steel">{copy.externalNotice}</p>
            <a
              href={document.href}
              target={document.external ? '_blank' : undefined}
              rel={document.external ? 'noopener noreferrer' : undefined}
              className="mt-4 inline-flex border-b-2 border-signal pb-1 text-sm font-bold text-navy transition hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {copy.viewDocument}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function LinkedPages({ ids, locale, copy, title }: { ids: number[]; locale: TransferOilLocale; copy: ManifestPageCopy; title: string }) {
  const records = ids.flatMap((id) => {
    const page = getTransferOilPage(id);
    const route = getTransferOilRoute(id);
    if (!page || !route) return [];
    return [{ page, route }];
  });
  if (!records.length) return null;

  return (
    <section aria-label={title}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-0.5 w-8 bg-signal" />
        <h2 className="text-2xl font-extrabold text-navy">{title}</h2>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {records.map(({ page, route }) => {
          const description = getManifestDescription(page, locale);
          return (
            <Link
              key={page.id}
              href={route.routePath}
              className="group flex min-h-36 flex-col border border-line bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-signal hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-signal">
                {getManifestPageTypeLabel(locale, page.pageType)}
              </span>
              <h3 dir="auto" className="mt-3 text-lg font-extrabold text-navy group-hover:text-signal">{getManifestTitle(page, locale)}</h3>
              {description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-steel">{description}</p>}
              <span aria-hidden="true" dir="ltr" className="mt-auto pt-4 text-lg font-bold text-signal">{locale === 'ar' ? '←' : '→'}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SourcePanel({ page, source, locale, copy }: Pick<ManifestTemplateProps, 'page' | 'source' | 'locale' | 'copy'>) {
  const sourceUrl = page.resolvedUrl || page.sourceUrl || source.sourceUrl;
  return (
    <aside className="self-start border-t-4 border-signal bg-graphiteDark p-7 text-white lg:sticky lg:top-32">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-signal">{copy.officialSource}</p>
      <p dir="auto" className="mt-3 text-lg font-extrabold">{getManifestTitle(page, locale)}</p>
      <p className="mt-4 text-sm leading-6 text-white/68">{copy.sourceNote}</p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex w-full items-center justify-center bg-signal px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#c86416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {copy.sourceButton}
      </a>
      <div className="mt-7 border-t border-white/15 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">{copy.recordLabel}</p>
        <p dir="ltr" className="mt-1 text-start text-xs font-bold text-white/75">TO-{String(page.id).padStart(3, '0')}</p>
      </div>
      <div className="mt-6 grid gap-2">
        <Link href={`/teknik-destek?kayit=${page.id}`} className="inline-flex items-center justify-center border border-white/35 px-4 py-3 text-center text-xs font-bold text-white transition hover:border-signal hover:bg-signal">
          {copy.requestSupport}
        </Link>
        <Link href={`/iletisim?request=quote&kayit=${page.id}`} className="inline-flex items-center justify-center border border-white/20 px-4 py-3 text-center text-xs font-bold text-white/85 transition hover:border-white hover:text-white">
          {copy.requestQuote}
        </Link>
      </div>
    </aside>
  );
}

function PageBody({ page, source, route, locale, copy, mode }: ManifestTemplateProps & { mode: ManifestMode }) {
  const childIds = source.childIds;
  const relatedIds = page.relatedPageIds.filter((id) => !childIds.includes(id) && id !== page.id);
  const showTechnicalEmpty = mode === 'product';

  return (
    <>
      <PageHero page={page} source={source} route={route} locale={locale} copy={copy} mode={mode} />
      <section className="bg-mist/35 py-14 sm:py-16">
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-12">
            <Overview page={page} locale={locale} copy={copy} />
            {mode === 'category' && <LinkedPages ids={childIds} locale={locale} copy={copy} title={copy.childPages} />}
            {mode === 'document' && <Documents page={page} copy={copy} />}
            <TranslationLists page={page} locale={locale} copy={copy} />
            <TechnicalData page={page} locale={locale} copy={copy} showEmpty={showTechnicalEmpty} />
            <TechnicalTables page={page} locale={locale} copy={copy} />
            {mode !== 'document' && <Documents page={page} copy={copy} />}
            {mode !== 'category' && <LinkedPages ids={childIds} locale={locale} copy={copy} title={copy.childPages} />}
            <LinkedPages ids={relatedIds} locale={locale} copy={copy} title={copy.relatedPages} />
          </div>
          <SourcePanel page={page} source={source} locale={locale} copy={copy} />
        </Container>
      </section>
    </>
  );
}

function CategoryTemplate(props: ManifestTemplateProps) {
  return <PageBody {...props} mode="category" />;
}

function ProductTemplate(props: ManifestTemplateProps) {
  return <PageBody {...props} mode="product" />;
}

function EditorialTemplate(props: ManifestTemplateProps) {
  return <PageBody {...props} mode="editorial" />;
}

function DocumentTemplate(props: ManifestTemplateProps) {
  return <PageBody {...props} mode="document" />;
}

const categoryPageTypes = new Set(['Kategori / seri', 'Bağlantı kategorisi', 'Adaptör kategorisi', 'Liste sayfası']);
const productPageTypes = new Set(['Aksesuar', 'Insert', 'Ferrule', 'Ürün', 'Adaptör', 'UHP fitting']);
const documentPageTypes = new Set(['Doküman sayfası']);

export function TransferOilManifestPage({ page, source, route, locale }: Omit<ManifestTemplateProps, 'copy'>) {
  const props = { page, source, route, locale, copy: manifestPageCopy[locale] };
  if (categoryPageTypes.has(page.pageType)) return <CategoryTemplate {...props} />;
  if (productPageTypes.has(page.pageType)) return <ProductTemplate {...props} />;
  if (documentPageTypes.has(page.pageType)) return <DocumentTemplate {...props} />;
  return <EditorialTemplate {...props} />;
}
