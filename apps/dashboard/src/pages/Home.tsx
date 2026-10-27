import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useState } from "react";
import { api, brl, type Overview } from "../api";
import { PageHeader } from "../components/PageHeader";
import { useStores } from "../hooks";
import { BarsCard } from "./home/BarsCard";
import { DonutCard } from "./home/DonutCard";
import { HomeFilters } from "./home/HomeFilters";
import { MachineRevenueCard } from "./home/MachineRevenueCard";
import { formatDayShort, rangeFor, type PeriodPreset } from "./home/periods";
import { SignupsCard } from "./home/SignupsCard";
import { StatCard } from "./home/StatCard";

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function Home() {
  const theme = useTheme();
  const { stores } = useStores();
  const [storeId, setStoreId] = useState("");
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [range, setRange] = useState(() => rangeFor("today"));
  const [query, setQuery] = useState(() => ({ storeId: "", ...rangeFor("today") }));
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  const changePreset = (next: PeriodPreset) => {
    setPreset(next);
    if (next !== "custom") setRange(rangeFor(next));
  };

  const search = () => setQuery({ storeId, ...range });

  const clear = () => {
    const today = rangeFor("today");
    setStoreId("");
    setPreset("today");
    setRange(today);
    setQuery({ storeId: "", ...today });
  };

  const load = useCallback(() => {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.storeId) params.set("storeId", query.storeId);
    api<Overview>(`/dashboard/overview?${params}`)
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const { primary, warning, secondary } = theme.palette;
  const washers = data?.machines.filter((m) => m.kind === "WASHER") ?? [];
  const dryers = data?.machines.filter((m) => m.kind === "DRYER") ?? [];
  const cycles = data ? data.kinds.washers + data.kinds.dryers : 0;
  const recurrence = data?.recurrence;

  return (
    <>
      <PageHeader title="Início" description="Resumo da operação por unidade e período." />
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <HomeFilters
        stores={stores}
        storeId={storeId}
        preset={preset}
        from={range.from}
        to={range.to}
        onStore={setStoreId}
        onPreset={changePreset}
        onFrom={(v) => setRange((r) => ({ ...r, from: v }))}
        onTo={(v) => setRange((r) => ({ ...r, to: v }))}
        onSearch={search}
        onClear={clear}
      />
      {data && recurrence && (
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatCard
              title="Quantidade de ciclos"
              value={String(data.cycles)}
              caption="Lavagens + secagens"
              color={primary.main}
              series={data.byDay.map((d) => d.cycles)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatCard
              title="Faturamento"
              value={brl(data.revenueCents)}
              caption="Soma das vendas pagas"
              color={secondary.main}
              series={data.byDay.map((d) => d.revenueCents)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <StatCard
              title="Ticket médio"
              value={brl(data.avgTicketCents)}
              caption="Faturamento por ciclo"
              color={warning.main}
              series={data.byDay.map((d) => (d.cycles ? d.revenueCents / d.cycles : 0))}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <BarsCard
              title="Faturamento por dia"
              subtitle={`${formatDayShort(data.period.from)} a ${formatDayShort(data.period.to)}`}
              data={data.byDay}
              xKey="date"
              yKey="revenueCents"
              unit="money"
              color={primary.main}
              name="Faturamento"
              xLabel={(v) => formatDayShort(String(v))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <DonutCard
              title="Lavagem x secagem"
              subtitle="Porcentagem por quantidade de ciclos"
              centerLabel="Ciclos"
              centerValue={String(cycles)}
              slices={[
                { name: "Lavagem", value: data.kinds.washers, color: secondary.main },
                { name: "Secagem", value: data.kinds.dryers, color: warning.main },
              ]}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <BarsCard
              title="Faturamento por horário do dia"
              subtitle="Horário de Brasília"
              data={data.byHour}
              xKey="hour"
              yKey="revenueCents"
              unit="money"
              color={warning.main}
              name="Faturamento"
              xLabel={(v) => `${String(v).padStart(2, "0")}h`}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <BarsCard
              title="Vendas por semana"
              subtitle="Ciclos vendidos, semanas começando na segunda"
              data={data.byWeek}
              xKey="weekStart"
              yKey="cycles"
              unit="count"
              color={primary.main}
              name="Ciclos"
              xLabel={(v) => `Sem. ${formatDayShort(String(v))}`}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <MachineRevenueCard title="Faturamento por máquina de lavar" color="secondary" machines={washers} showStore={!query.storeId} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <MachineRevenueCard title="Faturamento por máquina de secar" color="warning" machines={dryers} showStore={!query.storeId} />
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <SignupsCard signups={data.signups} color={primary.main} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <DonutCard
              title="Recorrência de compras"
              subtitle={`${recurrence.customers} clientes no período, ${recurrence.returning} recorrentes (${percent(recurrence.returning, recurrence.customers)}%)`}
              centerLabel="Clientes"
              centerValue={String(recurrence.customers)}
              slices={[
                { name: recurrence.buckets[0]!.label, value: recurrence.buckets[0]!.customers, color: secondary.main },
                { name: recurrence.buckets[1]!.label, value: recurrence.buckets[1]!.customers, color: warning.main },
                { name: recurrence.buckets[2]!.label, value: recurrence.buckets[2]!.customers, color: primary.main },
              ]}
              footer={recurrence.anonymousOrders ? `${recurrence.anonymousOrders} compras sem cliente identificado ficaram fora.` : undefined}
            />
          </Grid>
        </Grid>
      )}
    </>
  );
}
