import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ApiError, apiFetch } from "../lib/api";

type MediaMode = "upload" | "url";

type Props = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  label?: string;
};

export function MediaInput({ value, onChange, disabled = false, label = "Obraz do posta" }: Props) {
  const [mode, setMode] = useState<MediaMode>("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const accept = "image/jpeg,image/png,.jpg,.jpeg,.png";

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      setUploadError(null);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await apiFetch("/api/media/upload", { method: "POST", body: fd });
        if (!res.ok) {
          let msg = res.statusText;
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          throw new ApiError(msg, res.status);
        }
        const data = (await res.json()) as { url: string };
        setPreviewBroken(false);
        onChange(data.url);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Błąd uploadu");
      } finally {
        setUploading(false);
      }
    },
    [disabled, onChange],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  return (
    <Box sx={{ flex: 1, minWidth: 280 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={mode}
        onChange={(_, v) => {
          if (v != null) setMode(v);
        }}
        disabled={disabled}
        sx={{ mb: 1 }}
      >
        <ToggleButton value="upload">Wgraj z dysku</ToggleButton>
        <ToggleButton value="url">Link URL</ToggleButton>
      </ToggleButtonGroup>

      {mode === "upload" && (
        <>
          <input ref={fileRef} type="file" accept={accept} hidden onChange={onInputChange} />
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            role="presentation"
            aria-label="Strefa przeciągania pliku obrazu"
            sx={{
              border: 2,
              borderStyle: "dashed",
              borderColor: dragOver ? "primary.main" : "divider",
              borderRadius: 1,
              p: 2,
              textAlign: "center",
              bgcolor: dragOver ? "action.hover" : "background.default",
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              pointerEvents: disabled || uploading ? "none" : "auto",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {uploading ? (
              <CircularProgress size={28} aria-label="Wysyłanie pliku" />
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Przeciągnij plik JPG lub PNG (max 5 MB)
                </Typography>
                <Button variant="outlined" size="small" onClick={() => fileRef.current?.click()} disabled={disabled}>
                  Wybierz plik
                </Button>
              </>
            )}
          </Box>
        </>
      )}

      {mode === "url" && (
        <TextField
          label="URL obrazu (HTTPS, publiczny)"
          fullWidth
          value={value}
          onChange={(e) => {
            setPreviewBroken(false);
            onChange(e.target.value);
          }}
          disabled={disabled}
          size="small"
        />
      )}

      {uploadError && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      {value.trim() && !previewBroken && (
        <Box
          component="img"
          src={value}
          alt="Podgląd obrazu"
          onError={() => setPreviewBroken(true)}
          sx={{
            mt: 1,
            maxWidth: "100%",
            maxHeight: 220,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            objectFit: "contain",
            display: "block",
          }}
        />
      )}
      {value.trim() && previewBroken && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Nie udało się wczytać podglądu (sprawdź adres URL lub dostępność pliku).
        </Typography>
      )}
    </Box>
  );
}
