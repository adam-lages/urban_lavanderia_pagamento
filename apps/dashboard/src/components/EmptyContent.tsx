import InboxOutlined from "@mui/icons-material/InboxOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

export function EmptyContent({ title, description }: { title: string; description?: string }) {
  return (
    <Box
      sx={(theme) => ({
        py: 8,
        px: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        borderRadius: 2,
        border: `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
        bgcolor: alpha(theme.palette.grey[500], 0.04),
      })}
    >
      <InboxOutlined sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
      <Typography variant="h6" color="text.disabled">
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, maxWidth: 360 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}
