'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export function QRScanner({
  onScan,
  onError,
}: {
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
}) {
  const containerId = 'qr-scanner-region';
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    hasScannedRef.current = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          scanner.pause(true);
          onScan(decodedText);
        },
        () => {
          // Fires constantly while no QR is in frame — expected, ignore.
        }
      )
      .catch((err) => {
        onError?.(err instanceof Error ? err.message : 'Could not start camera');
      });

    return () => {
      scanner
        .stop()
        .catch(() => {})
        .finally(() => scanner.clear());
    };
  }, [onScan, onError]);

  return <div id={containerId} style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }} />;
}