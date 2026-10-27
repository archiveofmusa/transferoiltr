'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Messages } from '@/i18n/messages';
import { Button } from './Button';

type ContactValues = { name: string; company: string; phone: string; email: string; requestType: string; message: string };
const requestIds = ['quote', 'support', 'catalogue', 'certificate', 'other'] as const;

export function ContactForm({ messages }: { messages: Messages }) {
  const copy = messages.Forms.contact;
  const searchParams = useSearchParams();
  const product = searchParams.get('urun');
  const incomingRequest = searchParams.get('request');
  const requestType = requestIds.includes(incomingRequest as (typeof requestIds)[number]) ? incomingRequest! : 'quote';
  const [values, setValues] = useState<ContactValues>({ name: '', company: '', phone: '', email: '', requestType, message: product ? copy.productMessage.replace('{product}', product) : '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const errorId = 'contact-form-error';
  const invalidEmail = Boolean(error && (!values.email || !/^\S+@\S+\.\S+$/.test(values.email)));
  const update = (key: keyof ContactValues, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.name || !values.phone || !values.email || !values.requestType || !values.message) return setError(copy.required);
    if (!/^\S+@\S+\.\S+$/.test(values.email)) return setError(copy.invalidEmail);
    setError('');
    setSuccess(true);
  };

  if (success) return <div className="rounded-sm border border-green-700/20 bg-green-50 p-7" role="status"><p className="text-lg font-extrabold text-navy">{copy.successTitle}</p><p className="mt-2 text-sm leading-6 text-steel">{copy.successText}</p><button type="button" onClick={() => setSuccess(false)} className="mt-5 text-sm font-bold text-signal underline underline-offset-4">{copy.newRequest}</button></div>;

  return (
    <form noValidate onSubmit={submit} className="space-y-5" aria-label={copy.aria}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label={copy.name} required><input id="contact-name" required aria-required="true" aria-invalid={Boolean(error && !values.name)} aria-describedby={error ? errorId : undefined} value={values.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" /></Field>
        <Field id="contact-company" label={copy.company}><input id="contact-company" value={values.company} onChange={(event) => update('company', event.target.value)} autoComplete="organization" /></Field>
        <Field id="contact-phone" label={copy.phone} required><input id="contact-phone" required aria-required="true" aria-invalid={Boolean(error && !values.phone)} aria-describedby={error ? errorId : undefined} type="tel" dir="ltr" value={values.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" /></Field>
        <Field id="contact-email" label={copy.email} required><input id="contact-email" required aria-required="true" aria-invalid={invalidEmail} aria-describedby={error ? errorId : undefined} type="email" dir="ltr" value={values.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" /></Field>
      </div>
      <Field id="contact-request-type" label={copy.requestType} required><select id="contact-request-type" required aria-required="true" aria-invalid={Boolean(error && !values.requestType)} aria-describedby={error ? errorId : undefined} value={values.requestType} onChange={(event) => update('requestType', event.target.value)}>{requestIds.map((id, index) => <option key={id} value={id}>{copy.types[index]}</option>)}</select></Field>
      <Field id="contact-message" label={copy.message} required><textarea id="contact-message" required aria-required="true" aria-invalid={Boolean(error && !values.message)} aria-describedby={error ? errorId : undefined} rows={5} value={values.message} onChange={(event) => update('message', event.target.value)} /></Field>
      {error && <p id={errorId} className="text-sm font-semibold text-statusAttention" role="alert">{error}</p>}
      <Button type="submit">{copy.send}</Button>
      <p className="text-xs leading-5 text-steel">{copy.demo}</p>
    </form>
  );
}

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return <label htmlFor={id} className="block text-sm font-bold text-navy">{label} {required && <span className="text-signal" aria-hidden="true">*</span>}<span className="mt-2 block [&_input]:h-11 [&_input]:w-full [&_input]:border [&_input]:border-navy/15 [&_input]:bg-white [&_input]:px-3 [&_input]:text-sm [&_input]:font-normal [&_input]:outline-none [&_input]:transition [&_input:focus]:border-signal [&_input:focus]:ring-2 [&_input:focus]:ring-signal/20 [&_select]:h-11 [&_select]:w-full [&_select]:border [&_select]:border-navy/15 [&_select]:bg-white [&_select]:px-3 [&_select]:text-sm [&_select]:font-normal [&_select]:outline-none [&_select:focus]:border-signal [&_select:focus]:ring-2 [&_select:focus]:ring-signal/20 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-navy/15 [&_textarea]:bg-white [&_textarea]:p-3 [&_textarea]:text-sm [&_textarea]:font-normal [&_textarea]:outline-none [&_textarea]:transition [&_textarea:focus]:border-signal [&_textarea:focus]:ring-2 [&_textarea:focus]:ring-signal/20">{children}</span></label>;
}
