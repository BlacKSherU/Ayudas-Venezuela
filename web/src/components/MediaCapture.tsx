import { useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";

const PHOTO_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;

/** Captura/selecciona una foto o video desde el móvil, con validación de tamaño. */
export function MediaCapture({
  label,
  accept = "image/*",
  onCapture,
}: {
  label: string;
  accept?: string;
  onCapture: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) {
      setName(null);
      onCapture(null);
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const max = isVideo ? VIDEO_MAX : PHOTO_MAX;
    if (file.size > max) {
      setError(`El archivo excede el tamaño permitido (${isVideo ? "25 MB video" : "5 MB foto"}).`);
      onCapture(null);
      return;
    }
    setName(file.name);
    onCapture(file);
  }

  return (
    <div>
      <button
        type="button"
        className="btn secondary"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
        onClick={() => inputRef.current?.click()}
      >
        <Camera size={18} aria-hidden="true" /> {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture="environment"
        style={{ display: "none" }}
        onChange={onChange}
      />
      {name && <p className="muted">Archivo: {name}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
