'use client';

import { useState } from 'react';
import type { Messages } from '@/i18n/messages';
import { Button } from './Button';

type Values = { name: string; company: string; phone: string; email: string; application: string; pressure: string; fluid: string; diameter: string; connection: string; message: string };
const initialValues: Values = { name: '', company: '', phone: '', email: '', application: '', pressure: '', fluid: '', diameter: '', connection: '', message: '' };

export function TechnicalSupportForm({ messages }: { messages: Messages }) {
  const copy = messages.Forms.support;
  const [values, setValues] = useState<Values>(initialValues);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const errorId = 'technical-support-form-error';
  const update = (key: keyof Values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.name || !values.email || !values.phone || !values.application || !values.message) return setError(copy.required);
    if (!/^\S+@\S+\.\S+$/.test(values.email)) return setError(copy.invalidEmail);
    setError('');
    setSuccess(true);
  };

  if (success) return <div className="border-t-4 border-statusSuccessAccent bg-statusSuccessSurface p-7" role="status"><p className="text-lg font-extrabold text-navy">{copy.successTitle}</p><p className="mt-2 text-sm leading-6 text-steel">{copy.successText}</p><button type="button" onClick={() => setSuccess(false)} className="mt-5 text-sm font-bold text-signal underline underline-offset-4">{copy.newRequest}</button></div>;

  return (
    <form noValidate onSubmit={submit} className="space-y-5" aria-label={copy.aria}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id="support-name" label={copy.name} required invalid={Boolean(error && !values.name)} errorId={error ? errorId : undefined} value={values.name} onChange={(value) => update('name', value)} autoComplete="name" />
        <Input id="support-company" label={copy.company} value={values.company} onChange={(value) => update('company', value)} autoComplete="organization" />
        <Input id="support-phone" label={copy.phone} required invalid={Boolean(error && !values.phone)} errorId={error ? errorId : undefined} type="tel" dir="ltr" value={values.phone} onChange={(value) => update('phone', value)} autoComplete="tel" />
        <Input id="support-email" label={copy.email} required invalid={Boolean(error && (!values.email || !/^\S+@\S+\.\S+$/.test(values.email)))} errorId={error ? errorId : undefined} type="email" dir="ltr" value={values.email} onChange={(value) => update('email', value)} autoComplete="email" />
        <Input id="support-application" label={copy.application} required invalid={Boolean(error && !values.application)} errorId={error ? errorId : undefined} value={values.application} onChange={(value) => update('application', value)} placeholder={copy.applicationPlaceholder} />
        <Input id="support-pressure" label={copy.pressure} value={values.pressure} onChange={(value) => update('pressure', value)} placeholder={copy.pressurePlaceholder} />
        <Input id="support-fluid" label={copy.fluid} value={values.fluid} onChange={(value) => update('fluid', value)} placeholder={copy.fluidPlaceholder} />
        <Input id="support-diameter" label={copy.diameter} value={values.diameter} onChange={(value) => update('diameter', value)} placeholder={copy.diameterPlaceholder} />
        <Input id="support-connection" label={copy.connection} value={values.connection} onChange={(value) => update('connection', value)} placeholder={copy.connectionPlaceholder} />
      </div>
      <label htmlFor="support-message" className="block text-sm font-bold text-navy">{copy.message} <span className="text-signal" aria-hidden="true">*</span><textarea id="support-message" required aria-required="true" aria-invalid={Boolean(error && !values.message)} aria-describedby={error ? errorId : undefined} rows={5} value={values.message} onChange={(event) => update('message', event.target.value)} className="mt-2 w-full border border-line bg-white p-3 text-sm font-normal outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20" placeholder={copy.messagePlaceholder} /></label>
      <div className="border border-dashed border-line bg-mist p-4"><p className="text-sm font-bold text-navy">{copy.file}</p><p className="mt-1 text-xs leading-5 text-steel">{copy.fileSoon}</p><button type="button" disabled className="mt-3 cursor-not-allowed border border-line bg-white px-3 py-2 text-xs font-bold text-steel/60">{copy.chooseFile}</button></div>
      {error && <p id={errorId} className="text-sm font-semibold text-statusAttention" role="alert">{error}</p>}
      <Button type="submit">{copy.send}</Button><p className="text-xs leading-5 text-steel">{copy.demo}</p>
    </form>
  );
}

function Input({ id, label, required, invalid = false, errorId, type = 'text', dir, value, onChange, placeholder, autoComplete }: { id: string; label: string; required?: boolean; invalid?: boolean; errorId?: string; type?: string; dir?: 'ltr' | 'rtl'; value: string; onChange: (value: string) => void; placeholder?: string; autoComplete?: string }) {
  return <label htmlFor={id} className="block text-sm font-bold text-navy">{label} {required && <span className="text-signal" aria-hidden="true">*</span>}<input id={id} required={required} aria-required={required || undefined} aria-invalid={invalid} aria-describedby={errorId} type={type} dir={dir} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm font-normal outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20" /></label>;
}
