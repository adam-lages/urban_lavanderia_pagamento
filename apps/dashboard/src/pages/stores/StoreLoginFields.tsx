import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useState } from "react";

export const MIN_PASSWORD_LENGTH = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isLoginValid(email: string, password: string, hasLogin: boolean) {
  const e = email.trim();
  if (!e) return !hasLogin && !password;
  if (!EMAIL.test(e)) return false;
  if (!password) return hasLogin;
  return password.length >= MIN_PASSWORD_LENGTH;
}

interface Props {
  email: string;
  password: string;
  hasLogin: boolean;
  locked?: boolean;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
}

export function StoreLoginFields({ email, password, hasLogin, locked = false, onEmail, onPassword }: Props) {
  const [show, setShow] = useState(false);
  const shortPassword = !locked && !!password && password.length < MIN_PASSWORD_LENGTH;
  return (
    <>
      <TextField
        label="E-mail de acesso"
        type="email"
        value={email}
        onChange={(e) => onEmail(e.target.value)}
        required={!locked && !hasLogin}
        disabled={locked}
        autoComplete="off"
        helperText={locked ? "E-mail compartilhado da franquia. Não pode ser alterado." : "Será o login do franqueado no painel."}
        slotProps={{ htmlInput: { "aria-label": "E-mail de acesso", readOnly: locked } }}
      />
      <TextField
        label={hasLogin ? "Nova senha" : "Senha"}
        type={show ? "text" : "password"}
        value={locked ? "" : password}
        onChange={(e) => onPassword(e.target.value)}
        required={!locked && !hasLogin}
        disabled={locked}
        autoComplete="new-password"
        error={shortPassword}
        helperText={
          locked
            ? "A senha da franquia é a mesma para todas as lojas com essa permissão."
            : hasLogin
              ? "Deixe em branco para manter a senha atual."
              : `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`
        }
        slotProps={{
          htmlInput: { "aria-label": "Senha de acesso" },
          input: locked
            ? undefined
            : {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShow(!show)} edge="end">
                      {show ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
        }}
      />
    </>
  );
}
