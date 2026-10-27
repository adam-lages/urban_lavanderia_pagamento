import Card from "@mui/material/Card";
import { EmptyContent } from "../components/EmptyContent";
import { PageHeader } from "../components/PageHeader";

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card sx={{ p: 3 }}>
        <EmptyContent title="Em breve." description="Esta área está em construção e vai aparecer aqui assim que estiver pronta." />
      </Card>
    </>
  );
}
