import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { apiJson } from "../lib/api";

const schema = z.object({
  name: z.string().min(1, "Wymagane"),
  email: z.string().email("Nieprawidłowy email"),
  industry: z.string().optional(),
  status: z.string().min(1, "Wymagane"),
});

export type ClientFormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function AddClientDialog({ open, onClose, onCreated }: Props) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      industry: "",
      status: "active",
    },
  });

  const onSubmit = async (data: ClientFormValues) => {
    await apiJson("/api/clients", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        industry: data.industry || undefined,
        status: data.status,
      }),
    });
    reset();
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Dodaj klienta</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Nazwa"
            fullWidth
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            {...register("email")}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Branża"
            fullWidth
            {...register("industry")}
            error={!!errors.industry}
            helperText={errors.industry?.message}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Status"
                fullWidth
                select
                error={!!errors.status}
                helperText={errors.status?.message}
              >
                <MenuItem value="active">Aktywny</MenuItem>
                <MenuItem value="inactive">Nieaktywny</MenuItem>
                <MenuItem value="lead">Lead</MenuItem>
              </TextField>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Anuluj</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Zapisz
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
