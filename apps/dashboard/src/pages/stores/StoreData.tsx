import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { Store } from "../../api";
import { formatCnpj, roleLabel } from "./format";

export function StoreData({ store }: { store: Store }) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ p: 3, height: 1 }}>
          <Stack sx={{ alignItems: "center", textAlign: "center" }}>
            <Box
              sx={(t) => ({
                width: 144,
                height: 144,
                borderRadius: "50%",
                border: `1px dashed ${alpha(t.palette.grey[500], 0.32)}`,
                p: 1,
                mb: 2,
              })}
            >
              <Avatar
                sx={(t) => ({
                  width: 1,
                  height: 1,
                  bgcolor: alpha(t.palette.primary.main, 0.12),
                  color: "primary.dark",
                })}
              >
                <BusinessOutlined sx={{ fontSize: 64 }} />
              </Avatar>
            </Box>
            <Typography variant="subtitle1">{store.name}</Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary", mt: 0.5 }}>
              <PlaceOutlined sx={{ fontSize: 16 }} />
              <Typography variant="body2">{store.address || "Sem endereço"}</Typography>
            </Stack>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
              Código {store.code}
            </Typography>
          </Stack>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ p: 3 }}>
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <TextField label="Razão social" value={store.legalName || "—"} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Nome fantasia" value={store.name} slotProps={{ input: { readOnly: true } }} />
            <TextField
              label="Código"
              value={store.code}
              disabled
              slotProps={{ htmlInput: { "aria-label": "Código", readOnly: true } }}
            />
            <TextField label="CNPJ" value={formatCnpj(store.cnpj) || "—"} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Tipo" value={roleLabel(store.role)} slotProps={{ input: { readOnly: true } }} />
            <TextField
              label="Endereço"
              value={store.address || "—"}
              multiline
              minRows={3}
              sx={{ gridColumn: { sm: "1 / -1" } }}
              slotProps={{ input: { readOnly: true } }}
            />
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
}
