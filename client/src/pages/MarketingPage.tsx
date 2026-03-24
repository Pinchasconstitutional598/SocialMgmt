import { Button, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function MarketingPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Reklamy (Marketing API)
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Integracja z Meta Marketing API — miejsce na kampanie i zestawienia.
      </Typography>
      <Button component={RouterLink} to="/ad-spend" variant="outlined">
        Ad Spend Overview (ostatnie 7 dni)
      </Button>
    </Paper>
  );
}
