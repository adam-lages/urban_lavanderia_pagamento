import EditOutlined from "@mui/icons-material/EditOutlined";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { brl, type MachinePricing } from "../../../api";
import { Label } from "../../../components/Label";
import { kindService, weekdaysLabel } from "./format";

const COLUMNS = 7;

export function PricingRow({ item, onEdit }: { item: MachinePricing; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const count = item.schedules.length;
  return (
    <>
      <TableRow hover sx={{ "& > td": { borderBottom: open ? "none" : undefined } }}>
        <TableCell padding="checkbox">
          <IconButton size="small" aria-label={`${open ? "Recolher" : "Expandir"} ${item.label}`} onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpRounded /> : <KeyboardArrowDownRounded />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="subtitle2">{item.label}</Typography>
        </TableCell>
        <TableCell>{kindService(item.kind)}</TableCell>
        <TableCell>{item.cycleMinutes} min</TableCell>
        <TableCell>{item.priceCents === null ? "—" : brl(item.priceCents)}</TableCell>
        <TableCell>
          <Label color={count ? "info" : "default"}>{count ? `${count} programação${count > 1 ? "ões" : ""}` : "Sem promoção"}</Label>
        </TableCell>
        <TableCell align="right">
          <Tooltip title="Editar preço">
            <IconButton aria-label={`Editar preço de ${item.label}`} onClick={onEdit}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={COLUMNS} sx={{ py: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ py: 2, pl: 6 }}>
              {count ? (
                <Table size="small" aria-label={`Programações de ${item.label}`}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Dias</TableCell>
                      <TableCell>Horário</TableCell>
                      <TableCell>Valor promocional</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {item.schedules.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{weekdaysLabel(s.weekdays)}</TableCell>
                        <TableCell>{s.startTime} às {s.endTime}</TableCell>
                        <TableCell>{brl(s.amountCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sem valores programados. Vale o valor padrão em todos os dias e horários.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
