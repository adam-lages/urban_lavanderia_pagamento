import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: Props) {
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
          <Typography variant="body2" color="text.disabled">
            {title}
          </Typography>
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
