import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { loginRequest } from "../api";
import { useAuth } from "../auth";
import { Logo } from "../components/Logo";
import { AuthHero } from "../layout/AuthHero";

export function Login() {
  const { authed, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const ready = !!email.trim() && !!password && !busy;

  if (authed) return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      const session = await loginRequest(email.trim(), password);
      login(session.token, session.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <AuthHero />
      <Box sx={{ flex: { xs: 1, md: "0 0 560px" }, display: "flex", flexDirection: "column", px: { xs: 2, sm: 6 }, py: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Logo size={36} />
          <Typography variant="subtitle1">Urban Lavanderia</Typography>
        </Stack>
        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{ my: "auto", width: 1, maxWidth: 420, mx: "auto", py: 6 }}
        >
          <Stack spacing={1} sx={{ mb: 5 }}>
            <Typography variant="h5" component="h1">
              Entrar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Acesse o painel de operação das lavanderias.
            </Typography>
          </Stack>
          {error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : null}
          <Stack spacing={3}>
            <TextField
              label="E-mail"
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="username"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Senha"
              placeholder="Senha"
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setVisible((v) => !v)}
                      >
                        {visible ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button type="submit" variant="contained" color="inherit" size="large" fullWidth disabled={!ready}>
              Entrar
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
