'use client';

import { Phone } from 'lucide-react';
import clsx from 'clsx';

/** Phone call (tel: link) — the only call option in v33. */
export function PhoneCallLink({
  phone,
  className,
  compact,
}: {
  phone?: string | null;
  className?: string;
  compact?: boolean;
}) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone}`}
      className={clsx(compact ? 'btn-quiet inline-flex items-center justify-center gap-1 !px-2 !py-1 text-xs' : 'btn-quiet inline-flex items-center justify-center gap-1.5', className)}
    >
      <Phone size={compact ? 12 : 14} /> Phone call
    </a>
  );
}
