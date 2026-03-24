import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiJson } from "../lib/api";

type BannedRow = { id: number; word: string; createdAt: string };

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMINISTRATOR";
  const [words, setWords] = useState<BannedRow[]>([]);
  const [newWord, setNewWord] = useState("");
  const [sweepResult, setSweepResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const rows = await apiJson<BannedRow[]>("/api/admin/banned-words");
      setWords(rows);
    } catch {
      setWords([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const addWord = async () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    setLoading(true);
    try {
      await apiJson("/api/admin/banned-words", { method: "POST", body: JSON.stringify({ word: w }) });
      setNewWord("");
      await load();
    } catch (e) {
      setSweepResult(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    await apiJson(`/api/admin/banned-words/${id}`, { method: "DELETE" });
    await load();
  };

  const runSweep = async () => {
    setLoading(true);
    setSweepResult(null);
    try {
      const r = await apiJson<{
        clientsScanned: number;
        commentsChecked: number;
        commentsDeleted: number;
        errors: string[];
      }>("/api/admin/spam-sweep", { method: "POST" });
      setSweepResult(
        `Skan: klienci ${r.clientsScanned}, komentarze sprawdzone ${r.commentsChecked}, usunięte ${r.commentsDeleted}. ` +
          (r.errors.length ? `Uwagi: ${r.errors.slice(0, 5).join("; ")}` : ""),
      );
    } catch (e) {
      setSweepResult(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Ustawienia
      </Typography>
      <Typography color="text.secondary" paragraph>
        Konfiguracja konta i narzędzia administracyjne.
      </Typography>

      {isAdmin && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Global Spam Filter
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Lista zakazanych słów (dopasowanie podciągu, bez rozróżniania wielkości liter). Endpoint „spam sweep”
            skanuje feedy i usuwa pasujące komentarze przy użyciu zapisanych tokenów Meta.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <TextField size="small" label="Nowe słowo" value={newWord} onChange={(e) => setNewWord(e.target.value)} />
            <Button variant="contained" onClick={() => void addWord()} disabled={loading}>
              Dodaj
            </Button>
            <Button variant="outlined" color="warning" onClick={() => void runSweep()} disabled={loading}>
              Uruchom skan (wszystkie konta)
            </Button>
          </Box>
          {sweepResult && (
            <Alert severity="info" sx={{ mb: 2 }} onClose={() => setSweepResult(null)}>
              {sweepResult}
            </Alert>
          )}
          <List dense>
            {words.map((w) => (
              <ListItem
                key={w.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => void remove(w.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={w.word} secondary={new Date(w.createdAt).toLocaleString()} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {!isAdmin && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Globalny filtr spamu jest dostępny tylko dla administratora.
        </Alert>
      )}
    </Paper>
  );
}
