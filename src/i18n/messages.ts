import tr from '../../messages/tr.json';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';
import ar from '../../messages/ar.json';
import type { Locale } from './routing';

export type Messages = typeof tr;

const messages = { tr, en, ru, ar } as Record<Locale, Messages>;

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}
