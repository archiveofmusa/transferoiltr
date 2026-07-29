import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { NavigationMenu, NavigationTreeNode } from './navigation-types';

type Props = {
  menu: NavigationMenu;
  overviewLabel: string;
  technicalInformation: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

function TreeNode({ node, overviewLabel, onNavigate, depth = 0 }: {
  node: NavigationTreeNode;
  overviewLabel: string;
  onNavigate?: () => void;
  depth?: number;
}) {
  if (node.children.length === 0) {
    return <Link href={node.href} onClick={onNavigate} className="to-mega-link">{node.label}</Link>;
  }

  return (
    <details className="to-mega-branch" data-depth={depth}>
      <summary className="to-mega-summary">
        <span>{node.label}</span>
        <span aria-hidden="true" className="to-mega-summary-icon">+</span>
      </summary>
      <div className="to-mega-children">
        <Link href={node.href} onClick={onNavigate} className="to-mega-overview-link">
          {overviewLabel} <span aria-hidden="true">›</span>
        </Link>
        {node.children.map((child) => (
          <TreeNode key={child.id} node={child} overviewLabel={overviewLabel} onNavigate={onNavigate} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

function MenuColumns({ menu, overviewLabel, onNavigate }: Pick<Props, 'menu' | 'overviewLabel' | 'onNavigate'>) {
  return (
    <div className="to-mega-columns">
      {menu.nodes.map((node) => (
        <section key={node.id} className="to-mega-column" aria-labelledby={`to-menu-group-${menu.key}-${node.id}`}>
          <h3 id={`to-menu-group-${menu.key}-${node.id}`} className="to-mega-heading">
            <Link href={node.href} onClick={onNavigate}>{node.label}</Link>
          </h3>
          <div className="grid gap-0">
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} overviewLabel={overviewLabel} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TransferOilProductMegaMenu({ menu, overviewLabel, technicalInformation, mobile = false, onNavigate }: Props) {
  if (mobile) {
    return (
      <div className="grid gap-5 border-b border-t border-[rgb(255_255_255_/_16%)] py-5 text-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(255_255_255_/_68%)]">{menu.eyebrow}</p>
          <p className="mt-2 text-xs leading-5 text-[rgb(255_255_255_/_74%)]">{menu.description}</p>
          <Link href={menu.href} onClick={onNavigate} className="to-mobile-overview-link">
            {overviewLabel}: {menu.title} <span aria-hidden="true">›</span>
          </Link>
        </div>
        <MenuColumns menu={menu} overviewLabel={overviewLabel} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div
      id={`transferoil-menu-${menu.key}`}
      className="to-mega-menu absolute inset-x-0 top-full z-[80] max-h-[calc(100vh-138px)] overflow-y-auto border-b border-[rgb(0_0_0_/_25%)]"
    >
      <div className="mx-auto grid max-w-[1540px] grid-cols-[300px_minmax(0,1fr)] gap-8 px-[30px] py-8">
        <div className="border-e border-[rgb(255_255_255_/_22%)] pe-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(255_255_255_/_68%)]">{menu.eyebrow}</p>
          <h2 className="mt-3 text-[25px] font-semibold tracking-tight text-[var(--to-white)]">{menu.title}</h2>
          <p className="mt-4 max-w-[280px] text-[12px] leading-5 text-[rgb(255_255_255_/_74%)]">{menu.description}</p>
          <Link href={menu.href} onClick={onNavigate} className="mt-6 inline-flex border-b-2 border-[var(--to-red)] pb-1 text-[12px] font-semibold text-[var(--to-white)] transition hover:text-[rgb(255_255_255_/_75%)]">
            {technicalInformation}
          </Link>
          <div className="relative mt-7 aspect-[16/9] overflow-hidden border border-[rgb(255_255_255_/_18%)] bg-[rgb(255_255_255_/_7%)]">
            <Image src={menu.image} alt={menu.imageAlt} fill sizes="300px" className="object-contain p-3" />
          </div>
        </div>
        <MenuColumns menu={menu} overviewLabel={overviewLabel} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
