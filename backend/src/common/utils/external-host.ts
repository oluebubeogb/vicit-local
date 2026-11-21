import { Logger } from '@nestjs/common';

const log = new Logger('ExternalHost');

/**
 * v32 hook for hosts without an account (paper requests). Nothing is sent yet: alerts go to the
 * admin who typed the request in. When SMS to hosts is switched on later, send from here
 * (e.g. sendSms(phone, message) from notifications/providers/sms.provider) behind EXTERNAL_HOST_SMS=true.
 */
export async function notifyExternalHost(host: { name: string; phone?: string | null }, message: string): Promise<{ sent: boolean; reason: string }> {
  if (String(process.env.EXTERNAL_HOST_SMS || 'false').toLowerCase() !== 'true') return { sent: false, reason: 'disabled' };
  log.log(`(hook) would SMS ${host.name} <${host.phone || 'no phone'}>: ${message.slice(0, 120)}`);
  return { sent: false, reason: 'not-implemented' };
}

export function cleanHostPhone(raw: unknown): string | null {
  const v = String(raw ?? '').trim().replace(/[^\d+]/g, '');
  return v.replace(/\D/g, '').length >= 7 ? v.slice(0, 20) : null;
}
