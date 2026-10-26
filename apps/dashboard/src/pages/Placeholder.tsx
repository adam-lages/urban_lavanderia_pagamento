export function Placeholder({ title }: { title: string }) {
  return (
    <section className="page">
      <header className="page-header">
        <h1>{title}</h1>
      </header>
      <div className="card placeholder-card">
        <p>Em breve.</p>
      </div>
    </section>
  );
}
