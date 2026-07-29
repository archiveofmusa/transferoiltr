import type { Messages } from '@/i18n/messages';

export function createWhatsAppLink(message: string) {
  return `https://wa.me/905446369122?text=${encodeURIComponent(message)}`;
}

export function WhatsAppFloatingButton({ messages }: { messages: Messages }) {
  return (
    <a href={createWhatsAppLink(messages.WhatsApp.message)} target="_blank" rel="noopener noreferrer" aria-label={messages.WhatsApp.aria} className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-signal text-xs font-black text-white shadow-xl transition hover:-translate-y-1 hover:bg-[#c86416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2">
      VA
    </a>
  );
}
