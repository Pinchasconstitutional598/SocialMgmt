import { randomUUID } from "crypto";
import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const uploadsDir = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

function extForStoredFile(originalName: string): ".jpg" | ".png" | null {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".png") return ".png";
  if (ext === ".jpg" || ext === ".jpeg") return ".jpg";
  return null;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = extForStoredFile(file.originalname)!;
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extForStoredFile(file.originalname);
    const okMime = file.mimetype === "image/jpeg" || file.mimetype === "image/png";
    if (ext && okMime) {
      cb(null, true);
    } else {
      cb(new Error("Dozwolone są tylko obrazy JPG i PNG (max 5 MB)"));
    }
  },
});

function getBackendBaseUrl(): string {
  const port = Number(process.env.PORT) || 3001;
  const raw = process.env.BACKEND_URL ?? `http://localhost:${port}`;
  return raw.replace(/\/$/, "");
}

router.post("/upload", authMiddleware, (req, res) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "Plik jest za duży (maks. 5 MB)" });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Błąd uploadu";
      res.status(400).json({ error: message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Brak pliku" });
      return;
    }

    const base = getBackendBaseUrl();
    const url = `${base}/uploads/${req.file.filename}`;
    res.json({ url });
  });
});

export default router;
