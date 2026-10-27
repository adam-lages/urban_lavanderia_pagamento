import PersonRounded from "@mui/icons-material/PersonRounded";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { Customer } from "../../api";
import { Label } from "../../components/Label";
import { formatBirth, formatCpf, formatCreated, formatPhone, whatsappUrl } from "./format";

export function ClientProfile({
  customer,
  onToggleBlock,
}: {
  customer: Customer;
  onToggleBlock: (blocked: boolean) => void;
}) {
  const created = formatCreated(customer.createdAt);
  const blocked = customer.blocked;
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ p: 3, height: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Label color={blocked ? "error" : "success"}>{blocked ? "BLOQUEADO" : "ATIVO"}</Label>
          </Box>
          <Stack sx={{ alignItems: "center", textAlign: "center", pt: 1 }}>
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
                  bgcolor: alpha(t.palette.grey[500], 0.12),
                  color: "text.secondary",
                })}
              >
                <PersonRounded sx={{ fontSize: 64 }} />
              </Avatar>
            </Box>
            <Typography variant="subtitle1">{customer.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {formatCpf(customer.cpf)}
            </Typography>
          </Stack>
          <Box sx={{ mt: 4 }}>
            <FormControlLabel
              sx={{ alignItems: "flex-start", ml: 0, gap: 1 }}
              control={
                <Switch
                  checked={blocked}
                  onChange={(_, v) => onToggleBlock(v)}
                  slotProps={{ input: { "aria-label": "Bloquear cliente" } }}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2">Bloqueado</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Impede o cliente de usar as lavanderias.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField label="Nome" value={customer.name} slotProps={{ input: { readOnly: true } }} />
            <TextField label="Email" value={customer.email} slotProps={{ input: { readOnly: true } }} />
            <TextField label="CPF" value={formatCpf(customer.cpf)} slotProps={{ input: { readOnly: true } }} />
            <TextField
              label="Celular"
              value={formatPhone(customer.phone)}
              helperText={
                <Link href={whatsappUrl(customer.phone)} target="_blank" rel="noopener noreferrer" underline="hover">
                  WhatsApp
                </Link>
              }
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              label="Dt Nascimento"
              value={`${formatBirth(customer.birthDate)} · ${customer.age} anos`}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              label="Data Cadastro"
              value={`${created.date} ${created.time}`}
              slotProps={{ input: { readOnly: true } }}
            />
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
}
