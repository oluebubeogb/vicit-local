'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, RefreshCw, SwitchCamera, UserRound } from 'lucide-react';
import clsx from 'clsx';
import SleekOverlay from '@/components/ui/SleekOverlay';
import CaptureThumbGrid from '@/components/CaptureThumbGrid';
import { api } from '@/lib/api';

type Guest = {
  id: string;
  fullName: string;
  status: string;
  photoPath?: string | null;
  gatePhotoPath?: string | null;
  identityStatus?: string | null;
};

/**
 * v33: the only guest photo — a live photo taken by the gate officer before entry.
 * Grid of guest cards → live camera → saved as the guest's photo (never sent to the host).
 * Retake is allowed until the guest is admitted.
 */
export default function NoContactCapture({
  guests,
  photoUrl,
  onChanged,
  onError,
  disabled,
}: {
  guests: Guest[];
  photoUrl: (p: string) => string;
  onChanged: () => Promise<void> | void;
  onError: (msg: string) => void;
  disabled?: boolean;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [busy, setBusy] = useState('');
  const [shots, setShots] = useState<{ preview: string; alt: string }[]>([]);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const urls = useRef<string[]>([]);

  const needsPhoto = (g: Guest) => g.status === 'INVITED';

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    urls.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera(face = facing) {
    setCameraError('');
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera needs HTTPS and a supported browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.muted = true;
        v.setAttribute('playsinline', '');
        await v.play().catch(() => {});
      }
    } catch (err: any) {
      setCameraError(err?.name === 'NotAllowedError' ? 'Allow camera access to photograph the guest.' : 'Could not open the camera. Check permissions and try again.');
    }
  }

  function open(id: string) {
    if (disabled) return;
    setTarget(id);
    setTimeout(() => startCamera(), 60);
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function close() {
    stopCamera();
    setTarget(null);
  }

  async function capture() {
    const v = videoRef.current;
    const guest = guests.find((g) => g.id === target);
    if (!v || !guest || v.readyState < 2 || !v.videoWidth) {
      setCameraError('Camera is still starting — try again in a moment.');
      return;
    }
    const size = Math.min(v.videoWidth, v.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(900, size);
    canvas.height = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Square centre crop, like the self-registration selfie.
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    if (!blob) return;
    setBusy(guest.id);
    try {
      await api.uploadGatePhoto(guest.id, blob);
      const preview = URL.createObjectURL(blob);
      urls.current.push(preview);
      setShots((s) => [...s, { preview, alt: guest.fullName }]);
      await onChanged();
      // Auto-advance to the next guest still without a photo.
      const order = guests.map((g) => g.id);
      const next = guests.find((g, i) => i > order.indexOf(guest.id) && !g.photoPath) || guests.find((g) => g.id !== guest.id && !g.photoPath);
      if (next) {
        setTarget(next.id);
        cardRefs.current[next.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else close();
    } catch (e: any) {
      setCameraError(e.message || 'Upload failed');
    } finally {
      setBusy('');
    }
  }

  const current = guests.find((g) => g.id === target);
  const missingCount = guests.filter((g) => !g.photoPath).length;

  return (
    <section className="surface space-y-3 !p-3" data-testid="no-contact-capture">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Camera size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Guest photo</p>
          <p className="text-xs text-slate-500">Take a live photo of each guest before entry.</p>
        </div>
      </div>

      <div className={clsx('grid gap-2.5', guests.length === 1 ? 'grid-cols-1 sm:max-w-[220px]' : 'grid-cols-2 sm:grid-cols-3')}>
        {guests.map((g) => {
          const img = g.photoPath;
          const confirmed = !!g.photoPath;
          const canShoot = !disabled && needsPhoto(g);
          return (
            <div key={g.id} ref={(el) => { cardRefs.current[g.id] = el; }} className={clsx('overflow-hidden rounded-2xl border bg-white shadow-sm transition', target === g.id ? 'border-brand-300 ring-2 ring-brand-200' : confirmed ? 'border-emerald-200' : 'border-slate-200')}>
              <button type="button" disabled={!canShoot} onClick={() => open(g.id)} className="group relative block w-full disabled:cursor-default" aria-label={img ? `Retake photo of ${g.fullName}` : `Take photo of ${g.fullName}`}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl(img)} alt={g.fullName} className="aspect-square w-full object-cover" />
                ) : (
                  <span className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-300">
                    <UserRound size={44} strokeWidth={1.5} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100 group-hover:bg-brand-50"><Camera size={12} /> Take photo</span>
                  </span>
                )}
                {confirmed && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow ring-2 ring-white" aria-label="Photo taken"><Check size={16} strokeWidth={3} /></span>}
                {canShoot && img && <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow"><RefreshCw size={10} /> Retake</span>}
              </button>
              <p className="truncate px-2.5 py-2 text-center text-xs font-semibold text-slate-700">{g.fullName}</p>
            </div>
          );
        })}
      </div>

      {missingCount > 0 && (
        <button type="button" className="btn-primary w-full" disabled={disabled} onClick={() => { const first = guests.find((g) => !g.photoPath); if (first) open(first.id); }}>
          <Camera size={16} /> Take photo{missingCount > 1 ? 's' : ''}
        </button>
      )}

      <SleekOverlay
        open={!!target}
        onClose={close}
        placement="sheet"
        icon={<Camera size={20} />}
        title={current ? `Photo of ${current.fullName}` : 'Take photo'}
        subtitle="Centre the face in the frame"
        footer={
          <div className="flex w-full gap-2">
            <button type="button" className="btn-ghost !px-3" onClick={() => { const f = facing === 'environment' ? 'user' : 'environment'; setFacing(f); startCamera(f); }} aria-label="Switch camera"><SwitchCamera size={17} /></button>
            <button type="button" className="btn-primary flex-1" onClick={capture} disabled={!!busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} Capture
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-square w-full object-cover" />
            <span className="pointer-events-none absolute inset-[14%] rounded-full border-2 border-dashed border-white/50" />
          </div>
          {cameraError && <p className="text-xs text-rose-600">{cameraError}</p>}
          <CaptureThumbGrid photos={shots} />
        </div>
      </SleekOverlay>
    </section>
  );
}
