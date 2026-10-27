import BoltRounded from "@mui/icons-material/BoltRounded";
import LocalLaundryServiceOutlined from "@mui/icons-material/LocalLaundryServiceOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Label, type LabelColor } from "../components/Label";

interface Highlight {
  icon: SvgIconComponent;
  title: string;
  value: string;
  label: string;
  color: LabelColor;
  offset: number;
}

const HIGHLIGHTS: Highlight[] = [
  { icon: LocalLaundryServiceOutlined, title: "Máquinas conectadas", value: "Tempo real", label: "Online", color: "success", offset: 0 },
  { icon: BoltRounded, title: "Liberação remota", value: "Em segundos", label: "Pix", color: "info", offset: 48 },
  { icon: ReceiptLongOutlined, title: "Vendas do dia", value: "Sempre à mão", label: "Relatório", color: "warning", offset: 16 },
];

function HighlightCard({ icon: Icon, title, value, label, color, offset }: Highlight) {
  return (
    <Card sx={{ p: 2, ml: `${offset}px`, display: "flex", alignItems: "center", gap: 2, width: 320 }}>
      <Box
        sx={(theme) => ({
          width: 44,
          height: 44,
          borderRadius: 1.5,
          display: "grid",
          placeItems: "center",
          color: "primary.dark",
          bgcolor: alpha(theme.palette.primary.main, 0.12),
        })}
      >
        <Icon />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {value}
        </Typography>
      </Box>
      <Label color={color}>{label}</Label>
    </Card>
  );
}

export function AuthHero() {
  return (
    <Box
      sx={(theme) => ({
        flex: "1 1 auto",
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        px: 3,
        background: `radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.light, 0.16)}, transparent 45%),
          radial-gradient(circle at 80% 90%, ${alpha(theme.palette.warning.light, 0.12)}, transparent 40%),
          ${theme.palette.grey[100]}`,
      })}
    >
      <Box sx={{ textAlign: "center", maxWidth: 480 }}>
        <Typography variant="h3" component="p">
          Olá, bem-vindo de volta
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Acompanhe suas lavanderias, máquinas e vendas em um só lugar.
        </Typography>
      </Box>
      <Stack spacing={2}>
        {HIGHLIGHTS.map((h) => (
          <HighlightCard key={h.title} {...h} />
        ))}
      </Stack>
    </Box>
  );
}
