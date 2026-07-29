import type { Messages } from '@/i18n/messages';
import { Button } from './Button';
import { Container } from './Container';

export function CTASection({ messages }: { messages: Messages }) {
  return <section className="bg-graphiteDark py-14"><Container className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-extrabold tracking-[0.18em] text-signal">{messages.CTA.eyebrow}</p><h2 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-white">{messages.CTA.title}</h2></div><Button href="/teknik-destek" variant="light" className="shrink-0">{messages.CTA.button}</Button></Container></section>;
}
