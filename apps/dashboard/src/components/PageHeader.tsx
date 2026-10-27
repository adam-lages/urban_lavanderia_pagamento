import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

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

export function PageHeader({ title, description, action, crumbs }: Props) {
  const trail = crumbs?.length ? crumbs : [{ label: title }];
  return (
    <Box sx={{ display: "flex", alignItems: { sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 5 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          {title}
        </Typography>
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
