import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { type ReactNode } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "../nav";

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  crumbs?: Crumb[];
}

function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => (location.key === "default" ? navigate(fallback) : navigate(-1));
  return (
    <IconButton size="small" aria-label="Voltar" onClick={goBack} sx={{ ml: -0.5, p: 0.25 }}>
      <ArrowBackRounded fontSize="small" />
    </IconButton>
  );
}

export function PageHeader({ title, description, action, crumbs }: Props) {
  const { pathname } = useLocation();
  const trail = crumbs?.length ? crumbs : [{ label: title }];
  const fromMenu = NAV_ITEMS.some((item) => item.to === pathname);
  const fallback = [...trail].reverse().find((c) => c.to)?.to ?? "/";
  return (
    <Box sx={{ display: "flex", alignItems: { sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 5 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {!fromMenu && <BackButton fallback={fallback} />}
        <Breadcrumbs separator="•" aria-label="Trilha de navegação">
          <Link component={RouterLink} to="/" underline="hover" color="text.primary" variant="body2">
            Painel
          </Link>
          {trail.map((c, i) =>
            c.to && i < trail.length - 1 ? (
              <Link key={c.label} component={RouterLink} to={c.to} underline="hover" color="text.primary" variant="body2">
                {c.label}
              </Link>
            ) : (
              <Typography key={c.label} variant="body2" color="text.disabled">
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
        </Box>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
