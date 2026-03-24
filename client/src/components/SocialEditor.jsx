import FormatBold from "@mui/icons-material/FormatBold";
import FormatClear from "@mui/icons-material/FormatClear";
import FormatItalic from "@mui/icons-material/FormatItalic";
import FormatListBulleted from "@mui/icons-material/FormatListBulleted";
import FormatListNumbered from "@mui/icons-material/FormatListNumbered";
import FormatQuote from "@mui/icons-material/FormatQuote";
import FormatUnderlined from "@mui/icons-material/FormatUnderlined";
import LinkIcon from "@mui/icons-material/Link";
import LooksOne from "@mui/icons-material/LooksOne";
import LooksTwo from "@mui/icons-material/LooksTwo";
import Looks3 from "@mui/icons-material/Looks3";
import { Box, Divider, Paper, Stack, ToggleButton, Tooltip } from "@mui/material";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

const PLACEHOLDER_DEFAULT = "Napisz coś ciekawego dla swoich fanów…";

function plainTextToDocHtml(text) {
  if (!text) return "<p></p>";
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "</p><p>");
  return `<p>${escaped}</p>`;
}

/**
 * @param {object} props
 * @param {string} [props.value] — kontrolowana treść (tekst zwykły)
 * @param {(payload: { text: string; html: string }) => void} props.onChange — zawsze zwraca `text` (np. Facebook) i `html`
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 * @param {string} [props.minHeight] — np. "140px"
 */
export function SocialEditor({
  value = "",
  onChange,
  placeholder = PLACEHOLDER_DEFAULT,
  disabled = false,
  minHeight = "140px",
}) {
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
    ],
    editable: !disabled,
    content: plainTextToDocHtml(value),
    onUpdate: ({ editor: ed }) => {
      onChange?.({ text: ed.getText(), html: ed.getHTML() });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getText();
    if (value === current) return;
    editor.commands.setContent(plainTextToDocHtml(value));
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const run = (fn) => {
    if (disabled) return;
    fn();
  };

  const setLink = () => {
    if (disabled) return;
    const prev = editor.getAttributes("link").href ?? "";
    const next = window.prompt("Adres URL odnośnika", prev);
    if (next === null) return;
    const trimmed = next.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        spacing={1}
        useFlexGap
        divider={<Divider orientation="vertical" flexItem sx={{ alignSelf: "stretch", my: 0.5 }} />}
        sx={{
          px: 1,
          py: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Stack direction="row" spacing={0.25} useFlexGap flexWrap="wrap" alignItems="center">
          <Tooltip title="Pogrubienie" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="bold"
                selected={editor.isActive("bold")}
                disabled={disabled}
                aria-label="Pogrubienie"
                onClick={() => run(() => editor.chain().focus().toggleBold().run())}
              >
                <FormatBold fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Kursywa" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="italic"
                selected={editor.isActive("italic")}
                disabled={disabled}
                aria-label="Kursywa"
                onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
              >
                <FormatItalic fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Podkreślenie" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="underline"
                selected={editor.isActive("underline")}
                disabled={disabled}
                aria-label="Podkreślenie"
                onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
              >
                <FormatUnderlined fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={0.25} useFlexGap flexWrap="wrap" alignItems="center">
          <Tooltip title="Nagłówek 1" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="h1"
                selected={editor.isActive("heading", { level: 1 })}
                disabled={disabled}
                aria-label="Nagłówek 1"
                onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
              >
                <LooksOne fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Nagłówek 2" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="h2"
                selected={editor.isActive("heading", { level: 2 })}
                disabled={disabled}
                aria-label="Nagłówek 2"
                onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
              >
                <LooksTwo fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Nagłówek 3" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="h3"
                selected={editor.isActive("heading", { level: 3 })}
                disabled={disabled}
                aria-label="Nagłówek 3"
                onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
              >
                <Looks3 fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={0.25} useFlexGap flexWrap="wrap" alignItems="center">
          <Tooltip title="Lista punktowana" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="bulletList"
                selected={editor.isActive("bulletList")}
                disabled={disabled}
                aria-label="Lista punktowana"
                onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
              >
                <FormatListBulleted fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Lista numerowana" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="orderedList"
                selected={editor.isActive("orderedList")}
                disabled={disabled}
                aria-label="Lista numerowana"
                onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
              >
                <FormatListNumbered fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Cytat" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="blockquote"
                selected={editor.isActive("blockquote")}
                disabled={disabled}
                aria-label="Cytat"
                onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}
              >
                <FormatQuote fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={0.25} useFlexGap flexWrap="wrap" alignItems="center">
          <Tooltip title={editor.isActive("link") ? "Edytuj odnośnik" : "Odnośnik"} enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="link"
                selected={editor.isActive("link")}
                disabled={disabled}
                aria-label="Odnośnik"
                onClick={() => setLink()}
              >
                <LinkIcon fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Wyczyść formatowanie" enterDelay={400} disableInteractive>
            <span>
              <ToggleButton
                size="small"
                value="clear"
                selected={false}
                disabled={disabled}
                aria-label="Wyczyść formatowanie"
                onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}
              >
                <FormatClear fontSize="small" />
              </ToggleButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
      <Box
        sx={{
          "& .ProseMirror": {
            minHeight,
            outline: "none",
            px: 1.5,
            py: 1,
            fontFamily: "inherit",
            fontSize: "1rem",
            lineHeight: 1.5,
            "& p": { margin: 0 },
            "& p + p": { marginTop: 1 },
            "& ul, & ol": { pl: 2.5, my: 0.5 },
            "& blockquote": {
              borderLeft: (theme) => `4px solid ${theme.palette.divider}`,
              pl: 2,
              my: 1,
              color: "text.secondary",
            },
            "& hr": {
              border: "none",
              borderTop: 1,
              borderColor: "divider",
              my: 2,
            },
            "& h1": { fontSize: "1.75rem", fontWeight: 700, mt: 1, mb: 0.5 },
            "& h2": { fontSize: "1.35rem", fontWeight: 600, mt: 1, mb: 0.5 },
            "& h3": { fontSize: "1.15rem", fontWeight: 600, mt: 1, mb: 0.5 },
            "& a": {
              color: "primary.main",
              textDecoration: "underline",
            },
          },
          "& .ProseMirror-focused": { outline: "none" },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}
