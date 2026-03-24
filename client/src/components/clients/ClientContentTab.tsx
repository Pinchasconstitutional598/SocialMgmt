import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ApiError, apiJson } from "../../lib/api";
import { FeedList, type FeedItem } from "./FeedList";

type CommentRow = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id: string; name?: string };
};

type Props = {
  clientId: string;
  onMetaAuthRequired: (msg: string) => void;
};

export function ClientContentTab({ clientId, onMetaAuthRequired }: Props) {
  const { user } = useAuth();
  const canDeleteComments = user?.role === "ADMINISTRATOR";
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const [publishMsg, setPublishMsg] = useState("");
  const [publishImage, setPublishImage] = useState("");
  const [publishPlatform, setPublishPlatform] = useState<"facebook" | "instagram">("facebook");
  const [publishing, setPublishing] = useState(false);

  const platformForItem = (item: FeedItem) => (item.kind === "facebook" ? "facebook" : "instagram");

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{
        facebook: Array<{ socialAccountId: number; pageId: string; posts: Array<{ id: string; message?: string; created_time?: string; permalink_url?: string }> }>;
        instagram: Array<{ socialAccountId: number; igUserId: string; media: Array<{ id: string; caption?: string; media_type?: string; media_url?: string; permalink?: string; timestamp?: string; thumbnail_url?: string }> }>;
      }>(`/api/clients/${clientId}/meta/feed`);

      const items: FeedItem[] = [];
      for (const block of data.facebook) {
        for (const p of block.posts) {
          items.push({
            kind: "facebook",
            socialAccountId: block.socialAccountId,
            pageId: block.pageId,
            ...p,
          });
        }
      }
      for (const block of data.instagram) {
        for (const m of block.media) {
          items.push({
            kind: "instagram",
            socialAccountId: block.socialAccountId,
            igUserId: block.igUserId,
            ...m,
          });
        }
      }
      setFeedItems(items);
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, onMetaAuthRequired]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const openComments = async (item: FeedItem) => {
    setActiveItem(item);
    setDrawerOpen(true);
    setCommentsLoading(true);
    try {
      const platform = platformForItem(item);
      const data = await apiJson<{ data: CommentRow[] }>(
        `/api/clients/${clientId}/meta/comments?objectId=${encodeURIComponent(item.id)}&platform=${platform}`,
      );
      setComments(data.data ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const reply = async (commentId: string) => {
    if (!activeItem) return;
    const text = replyById[commentId]?.trim();
    if (!text) return;
    try {
      await apiJson(`/api/clients/${clientId}/meta/comment`, {
        method: "POST",
        body: JSON.stringify({
          platform: platformForItem(activeItem),
          commentId,
          message: text,
        }),
      });
      setReplyById((m) => ({ ...m, [commentId]: "" }));
      await openComments(activeItem);
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
    }
  };

  const remove = async (commentId: string) => {
    if (!activeItem) return;
    try {
      await apiJson(
        `/api/clients/${clientId}/meta/comment/${encodeURIComponent(commentId)}?platform=${platformForItem(activeItem)}`,
        { method: "DELETE" },
      );
      await openComments(activeItem);
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await apiJson(`/api/clients/${clientId}/meta/publish`, {
        method: "POST",
        body: JSON.stringify({
          platform: publishPlatform,
          message: publishMsg,
          imageUrl: publishImage || undefined,
        }),
      });
      setPublishMsg("");
      setPublishImage("");
      await loadFeed();
    } catch (e) {
      if (e instanceof ApiError && e.tokenExpired) {
        onMetaAuthRequired(e.message);
      }
    } finally {
      setPublishing(false);
    }
  };

  const drawerTitle = useMemo(() => {
    if (!activeItem) return "";
    return activeItem.kind === "facebook" ? "Komentarze (Facebook)" : "Komentarze (Instagram)";
  }, [activeItem]);

  if (loading) {
    return <Typography>Ładowanie treści…</Typography>;
  }

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Publikacja
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3, alignItems: "flex-end" }}>
        <TextField select label="Platforma" value={publishPlatform} onChange={(e) => setPublishPlatform(e.target.value as "facebook" | "instagram")} sx={{ minWidth: 200 }}>
          <MenuItem value="facebook">Facebook</MenuItem>
          <MenuItem value="instagram">Instagram (wymaga obrazu)</MenuItem>
        </TextField>
        <TextField label="Treść" value={publishMsg} onChange={(e) => setPublishMsg(e.target.value)} sx={{ flex: 1, minWidth: 200 }} multiline maxRows={3} />
        <TextField label="URL obrazu (HTTPS, publiczny)" value={publishImage} onChange={(e) => setPublishImage(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
        <Button variant="contained" onClick={() => void publish()} disabled={publishing || !publishMsg.trim()}>
          Opublikuj
        </Button>
      </Box>

      <Typography variant="subtitle1" gutterBottom>
        Feed
      </Typography>
      <FeedList items={feedItems} onManageComments={(item) => void openComments(item)} />

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
      >
        <Box data-testid="comments-drawer" sx={{ p: 2, width: "100%" }}>
          <Typography variant="h6" gutterBottom>
            {drawerTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Post / media ID: {activeItem?.id}
          </Typography>
          {commentsLoading ? (
            <Typography>Ładowanie komentarzy…</Typography>
          ) : (
            <List dense>
              {comments.map((c) => (
                <ListItem key={c.id} alignItems="flex-start" sx={{ flexDirection: "column", alignItems: "stretch", borderBottom: 1, borderColor: "divider", py: 2 }}>
                  <ListItemText
                    primary={c.from?.name ?? "Użytkownik"}
                    secondary={
                      <>
                        <Typography variant="body2" component="span" display="block">
                          {c.message}
                        </Typography>
                        <Typography variant="caption">{c.created_time}</Typography>
                      </>
                    }
                  />
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Odpowiedz"
                      value={replyById[c.id] ?? ""}
                      onChange={(e) => setReplyById((m) => ({ ...m, [c.id]: e.target.value }))}
                    />
                    <Button size="small" variant="outlined" onClick={() => void reply(c.id)}>
                      Wyślij
                    </Button>
                    {canDeleteComments && (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Usuń"
                        data-testid="comment-delete-button"
                        onClick={() => void remove(c.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
