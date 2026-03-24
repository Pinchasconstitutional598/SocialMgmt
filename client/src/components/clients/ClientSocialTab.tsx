import { Facebook as FacebookIcon } from "@mui/icons-material";
import InstagramIcon from "@mui/icons-material/Instagram";
import { Box, Button, Card, CardContent, CardMedia, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiFetch, apiJson } from "../../lib/api";

type CardStat = {
  socialAccountId: number;
  platform: string;
  platformId: string;
  name?: string;
  username?: string;
  fanCount?: number;
  followersCount?: number;
  mediaCount?: number;
  profileUrl?: string;
  pictureUrl?: string;
};

type Props = {
  clientId: string;
  onMetaAuthRequired: (msg: string) => void;
};

export function ClientSocialTab({ clientId, onMetaAuthRequired }: Props) {
  const [cards, setCards] = useState<CardStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ cards: CardStat[] }>(`/api/clients/${clientId}/meta/social-stats`);
      setCards(data.cards);
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- przeładowanie przy zmianie klienta
  }, [clientId]);

  const connectFacebook = async () => {
    setConnecting(true);
    try {
      const res = await apiFetch("/api/auth/facebook/connect", {
        method: "POST",
        body: JSON.stringify({ clientId: Number(clientId) }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return <Typography>Ładowanie statystyk…</Typography>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<FacebookIcon />}
          onClick={() => void connectFacebook()}
          disabled={connecting}
          sx={{ mr: 1 }}
        >
          Połącz Facebook / Instagram
        </Button>
        <Button component={Link} to="/settings" size="small">
          Globalny filtr spamu (admin)
        </Button>
      </Box>

      {cards.length === 0 ? (
        <Typography color="text.secondary">Brak połączonych kont — użyj przycisku powyżej.</Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {cards.map((c) => (
            <Box
              key={`${c.platform}-${c.socialAccountId}`}
              sx={{ width: { xs: "100%", sm: "calc(50% - 8px)", md: "calc(33.33% - 11px)" } }}
            >
              <Card variant="outlined" sx={{ height: "100%" }}>
                {c.pictureUrl ? (
                  <CardMedia component="img" height="140" image={c.pictureUrl} sx={{ objectFit: "cover" }} />
                ) : (
                  <Box
                    sx={{
                      height: 140,
                      bgcolor: "action.hover",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.platform === "instagram" ? (
                      <InstagramIcon fontSize="large" color="action" />
                    ) : (
                      <FacebookIcon fontSize="large" color="primary" />
                    )}
                  </Box>
                )}
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {c.platform === "facebook" ? "Facebook Page" : "Instagram"}
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {c.name ?? c.username ?? c.platformId}
                  </Typography>
                  {c.platform === "facebook" && (
                    <Typography variant="body2">Polubienia strony: {c.fanCount ?? "—"}</Typography>
                  )}
                  {c.platform === "instagram" && (
                    <>
                      <Typography variant="body2">Obserwujący: {c.followersCount ?? "—"}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Publikacje: {c.mediaCount ?? "—"}
                      </Typography>
                    </>
                  )}
                  {c.profileUrl && (
                    <Button size="small" href={c.profileUrl} target="_blank" rel="noreferrer" sx={{ mt: 1 }}>
                      Otwórz w Meta
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
