import { Paper, Typography } from "@mui/material";

export function MarketingPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Reklamy (Marketing API)
      </Typography>
      <Typography color="text.secondary">
        Integracja z Meta Marketing API — miejsce na kampanie i zestawienia.
      </Typography>
    </Paper>
  );
}
