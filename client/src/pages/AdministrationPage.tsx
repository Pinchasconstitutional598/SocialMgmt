import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { apiJson } from "../lib/api";
import type { PanelRole } from "../lib/api";

type UserRow = {
  id: number;
  email: string;
  role: PanelRole;
  createdAt: string;
  updatedAt: string;
};

type FormAdd = {
  email: string;
  password: string;
  role: PanelRole;
};

export function AdministrationPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await apiJson<UserRow[]>("/api/admin/users");
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const { register, handleSubmit, reset } = useForm<FormAdd>({
    defaultValues: { email: "", password: "", role: "MARKETING" },
  });

  const onAdd = async (data: FormAdd) => {
    await apiJson("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
    reset();
    setOpenAdd(false);
    void load();
  };

  const { register: regPwd, handleSubmit: subPwd, reset: resetPwd } = useForm<{ password: string }>();

  const onChangePassword = async (data: { password: string }) => {
    if (!editId) return;
    await apiJson(`/api/admin/users/${editId}`, {
      method: "PATCH",
      body: JSON.stringify({ password: data.password }),
    });
    setEditId(null);
    resetPwd();
    void load();
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Usunąć użytkownika?")) return;
    await apiJson(`/api/admin/users/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Administracja</Typography>
        <Button variant="contained" onClick={() => setOpenAdd(true)}>
          Dodaj użytkownika
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rola</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role === "ADMINISTRATOR" ? "Administrator" : "Marketing"}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setEditId(u.id)}>
                    Zmień hasło
                  </Button>
                  <IconButton size="small" color="error" onClick={() => void onDelete(u.id)} aria-label="Usuń">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmit(onAdd)}>
          <DialogTitle>Nowy użytkownik panelu</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Email" fullWidth {...register("email", { required: true })} />
            <TextField
              label="Hasło"
              type="password"
              fullWidth
              {...register("password", { required: true, minLength: 8 })}
            />
            <TextField label="Rola" select fullWidth {...register("role")}>
              <MenuItem value="ADMINISTRATOR">Administrator</MenuItem>
              <MenuItem value="MARKETING">Marketing</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAdd(false)}>Anuluj</Button>
            <Button type="submit" variant="contained">
              Utwórz
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={editId !== null} onClose={() => setEditId(null)} fullWidth maxWidth="xs">
        <form onSubmit={subPwd(onChangePassword)}>
          <DialogTitle>Zmiana hasła</DialogTitle>
          <DialogContent>
            <TextField
              label="Nowe hasło (min. 8 znaków)"
              type="password"
              fullWidth
              sx={{ mt: 1 }}
              {...regPwd("password", { required: true, minLength: 8 })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditId(null)}>Anuluj</Button>
            <Button type="submit" variant="contained">
              Zapisz
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
