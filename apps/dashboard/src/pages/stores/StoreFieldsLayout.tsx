import Typography from "@mui/material/Typography";

export const STORE_FIELDS_GRID = {
  display: "grid",
  gap: 3,
  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
} as const;

export function StoreSection({ title }: { title: string }) {
  return <Typography variant="subtitle2" sx={{ gridColumn: "1 / -1" }}>{title}</Typography>;
}
