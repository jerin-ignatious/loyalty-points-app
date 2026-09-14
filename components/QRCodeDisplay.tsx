'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeDisplay({ qrToken }: { qrToken: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(qrToken, { width: 200, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        // Leave dataUrl null — the fallback text below covers this case.
      });

    return () => {
      cancelled = true;
    };
  }, [qrToken]);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--ink)',
        padding: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '240px',
        height: '240px',
      }}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL, not a static asset
        <img src={dataUrl} alt="Your loyalty QR code" width={200} height={200} />
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Generating code…</p>
      )}
    </div>
  );
}