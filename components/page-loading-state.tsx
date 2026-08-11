type PageLoadingStateProps = {
  eyebrow?: string;
  title: string;
  detail?: string;
};

export default function PageLoadingState({
  eyebrow = "Loading",
  title,
  detail = "Getting your agency workspace ready.",
}: PageLoadingStateProps) {
  return (
    <main className="main">
      <section className="container">
        <div className="pageLoadingState" role="status" aria-live="polite">
          <span className="miniBadge">{eyebrow}</span>
          <h1 className="pageTitle">{title}</h1>
          <p className="muted">{detail}</p>
          <div className="pageLoadingBars" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
