import { useEffect, useRef } from 'react';

import './SignaturePad.css';

type SignaturePadProps = {
  label: string;
  helper?: string;
  onChange?: (dataUrl: string | null) => void;
};

const SignaturePad = ({ label, helper, onChange }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const emitChange = () => {
    if (!canvasRef.current || !onChange) return;
    onChange(canvasRef.current.toDataURL('image/png'));
  };

  const getCssVar = (variable: string) =>
    getComputedStyle(document.body).getPropertyValue(variable).trim();

  const getBackgroundColor = () => getCssVar('--card-bg') || '#ffffff';
  const getStrokeColor = () => getCssVar('--text-primary') || '#0f172a';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;

      // Set the internal pixel size
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      // Make sure the drawn area matches the visual size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const context = canvas.getContext('2d');
      if (context) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 2;
        context.strokeStyle = getStrokeColor();
        context.fillStyle = getBackgroundColor();
        context.clearRect(0, 0, rect.width, rect.height);
        context.fillRect(0, 0, rect.width, rect.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastX = 0;
    let lastY = 0;

    const getPos = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      drawing.current = true;
      ctx.strokeStyle = getStrokeColor();
      const position = getPos(event);
      lastX = position.x;
      lastY = position.y;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!drawing.current) return;
      event.preventDefault();
      ctx.strokeStyle = getStrokeColor();
      const position = getPos(event);
      ctx.lineTo(position.x, position.y);
      ctx.stroke();
      lastX = position.x;
      lastY = position.y;
    };

    const stopDrawing = () => {
      drawing.current = false;
      emitChange();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', stopDrawing);
      canvas.removeEventListener('pointerleave', stopDrawing);
      canvas.removeEventListener('pointercancel', stopDrawing);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getBackgroundColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange?.(null);
  };

  return (
    <div className="signature-card">
      <div className="signature-title">
        <p>{label}</p>
        {helper && <span>{helper}</span>}
      </div>
      <div className="signature-canvas">
        <canvas ref={canvasRef} />
        <button type="button" onClick={handleClear}>
          Zurücksetzen
        </button>
      </div>
      <p className="signature-hint">
        Unterschreiben Sie mit der Maus oder per Berührung auf dem Touchscreen
      </p>
    </div>
  );
};

export default SignaturePad;
