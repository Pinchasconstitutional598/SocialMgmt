import { ChatBubbleOutline as CommentIcon } from "@mui/icons-material";
import { Box, Button, Card, CardActions, CardContent, CardMedia, Typography } from "@mui/material";

export type FeedItem =
  | {
      kind: "facebook";
      socialAccountId: number;
      pageId: string;
      id: string;
      message?: string;
      created_time?: string;
      permalink_url?: string;
    }
  | {
      kind: "instagram";
      socialAccountId: number;
      igUserId: string;
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      permalink?: string;
      timestamp?: string;
      thumbnail_url?: string;
    };

type Props = {
  items: FeedItem[];
  onManageComments: (item: FeedItem) => void;
};

export function FeedList({ items, onManageComments }: Props) {
  if (items.length === 0) {
    return <Typography color="text.secondary">Brak postów / mediów.</Typography>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((item) => (
        <Card key={`${item.kind}-${item.id}`} variant="outlined">
          {item.kind === "instagram" && (item.thumbnail_url || item.media_url) && item.media_type !== "VIDEO" && (
            <CardMedia
              component="img"
              height="200"
              image={item.thumbnail_url ?? item.media_url}
              sx={{ objectFit: "cover" }}
            />
          )}
          {item.kind === "instagram" && item.media_type === "VIDEO" && item.thumbnail_url && (
            <CardMedia component="img" height="200" image={item.thumbnail_url} sx={{ objectFit: "cover" }} />
          )}
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {item.kind === "facebook" ? "Facebook" : "Instagram"} · {item.id}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
              {item.kind === "facebook" ? (item.message ?? "—") : (item.caption ?? "—")}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {item.kind === "facebook" ? item.created_time : item.timestamp}
            </Typography>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              startIcon={<CommentIcon />}
              data-testid="feed-manage-comments-button"
              onClick={() => onManageComments(item)}
            >
              Zarządzaj komentarzami
            </Button>
            {item.kind === "facebook" && item.permalink_url && (
              <Button size="small" href={item.permalink_url} target="_blank" rel="noreferrer">
                Otwórz
              </Button>
            )}
            {item.kind === "instagram" && item.permalink && (
              <Button size="small" href={item.permalink} target="_blank" rel="noreferrer">
                Otwórz
              </Button>
            )}
          </CardActions>
        </Card>
      ))}
    </Box>
  );
}
