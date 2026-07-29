import { Link } from '@/i18n/navigation';
import {
  getTransferOilPage,
  type TransferOilLocale,
  type TransferOilRoute,
} from '@/data/transferoil/registry';
import { getManifestTitle } from './manifest-page-utils';
import type { ManifestPageCopy } from './manifest-page-copy';

type Props = {
  route: TransferOilRoute;
  locale: TransferOilLocale;
  copy: ManifestPageCopy;
  light?: boolean;
};

export function TransferOilManifestBreadcrumbs({ route, locale, copy, light = false }: Props) {
  return (
    <nav aria-label={copy.breadcrumb} className={light ? 'text-white/65' : 'text-steel'}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {route.breadcrumbs.map((breadcrumb, index) => {
          const page = getTransferOilPage(breadcrumb.id);
          const label = page ? getManifestTitle(page, locale) : breadcrumb.label;
          const current = index === route.breadcrumbs.length - 1;
          return (
            <li key={`${breadcrumb.id}-${breadcrumb.routePath}`} className="flex min-w-0 items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" dir="ltr" className={light ? 'text-white/35' : 'text-line'}>
                  {locale === 'ar' ? '‹' : '›'}
                </span>
              )}
              {current ? (
                <span aria-current="page" dir="auto" className={light ? 'font-semibold text-white' : 'font-semibold text-navy'}>
                  {label}
                </span>
              ) : (
                <Link href={breadcrumb.routePath} dir="auto" className="transition hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
