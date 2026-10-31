'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/** Native modal top layer makes the rest of the document inert, above sticky headers. */
export function IndustriesPanel({ title, closeLabel, returnFocus, onClose, children }: {
  title: string;
  closeLabel: string;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = returnFocus.current;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const original = {
      position: body.style.position, top: body.style.top, left: body.style.left,
      width: body.style.width, overflow: body.style.overflow,
      paddingInlineEnd: body.style.paddingInlineEnd, scrollBehavior: html.style.scrollBehavior,
    };
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const existingPadding = Number.parseFloat(getComputedStyle(body).paddingInlineEnd) || 0;
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, left: `-${scrollX}px`, width: '100%', overflow: 'hidden' });
    if (scrollbarWidth > 0) body.style.paddingInlineEnd = `${existingPadding + scrollbarWidth}px`;
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      dialog.close();
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.left = original.left;
      body.style.width = original.width;
      body.style.overflow = original.overflow;
      body.style.paddingInlineEnd = original.paddingInlineEnd;
      // Restore synchronously before a client-side navigation applies its own scroll policy.
      html.style.scrollBehavior = 'auto';
      window.scrollTo(scrollX, scrollY);
      html.style.scrollBehavior = original.scrollBehavior;
      const currentTrigger = trigger?.isConnected ? trigger : Array.from(document.querySelectorAll<HTMLElement>('[data-industries-trigger]')).find((element) => element.getClientRects().length > 0);
      currentTrigger?.focus({ preventScroll: true });
    };
  }, [returnFocus]);

  return createPortal(
    <dialog
      ref={dialogRef}
      id="industries-panel"
      data-industries-panel
      aria-labelledby="industries-panel-title"
      aria-describedby="industries-panel-description"
      aria-modal="true"
      className="to-industries-panel"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a[href]')) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'));
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}
    >
      <div className="to-industries-panel-bar">
        <h2 id="industries-panel-title" className="text-xl font-extrabold text-navy sm:text-3xl">{title}</h2>
        <button ref={closeRef} data-industries-close type="button" onClick={onClose} className="to-industries-close">
          {closeLabel}<span aria-hidden="true" className="text-2xl font-normal leading-none">×</span>
        </button>
      </div>
      <div className="to-industries-panel-content">{children}</div>
    </dialog>,
    document.body,
  );
}
