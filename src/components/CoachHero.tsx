import Link from "next/link";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  bottleneck?: string | null;
};

export function CoachHero({ eyebrow, title, body, href, cta, bottleneck }: Props) {
  return (
    <section className="coach-hero appear" aria-labelledby="coach-focus-title">
      <div className="coach-hero-top">
        <span className="coach-pill">Coach</span>
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <div className="coach-hero-copy">
        <h1 id="coach-focus-title">{title}</h1>
        <p>{body}</p>
      </div>
      {bottleneck ? (
        <div className="coach-bottleneck">
          <span className="eyebrow">Current bottleneck</span>
          <strong>{bottleneck}</strong>
        </div>
      ) : null}
      <Link className="coach-primary" href={href}>
        {cta} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
