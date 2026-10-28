import { describe, expect, it } from 'vitest';
import { parseMessage } from './messages';

describe('contact form messages', () => {
  it('keeps a valid message and trims it', () => {
    const r = parseMessage({ name: ' سارة ', phone: '+966 55 123 4567', message: 'مجلس', email: '', city: 'الرياض' });
    expect(r).toEqual({ message: { name: 'سارة', phone: '+966 55 123 4567', email: null, city: 'الرياض', message: 'مجلس' } });
  });

  it('explains what is missing or wrong', () => {
    expect(parseMessage({})).toEqual({ error: 'اكتب الاسم' });
    expect(parseMessage({ name: 'a', phone: 'abc', message: 'x' })).toEqual({ error: 'اكتب رقم جوال صحيح' });
    expect(parseMessage({ name: 'a', phone: '0551234567', email: 'bad', message: 'x' })).toEqual({ error: 'البريد الإلكتروني غير صحيح' });
    expect(parseMessage({ name: 'a', phone: '0551234567' })).toEqual({ error: 'اكتب رسالتك' });
  });
});
