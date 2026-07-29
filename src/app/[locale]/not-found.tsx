'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';

export default function NotFound() {
  const t = useTranslations('NotFound');
  return (
    <section className="flex min-h-[62vh] items-center bg-mist py-20">
      <Container className="text-center">
        <p className="text-sm font-black tracking-[0.2em] text-signal">404</p>
        <h1 className="mt-4 text-4xl font-extrabold text-navy sm:text-5xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-steel">{t('text')}</p>
        <Button href="/" className="mt-8">{t('button')}</Button>
      </Container>
    </section>
  );
}
