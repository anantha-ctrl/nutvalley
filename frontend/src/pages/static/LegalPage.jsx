// Renders a legal/policy page. Each section is [heading, body] where body is:
//   • a string        → one paragraph
//   • an array         → multiple blocks (string = paragraph, nested array = bullet list)
function Body({ body }) {
  const blocks = Array.isArray(body) ? body : [body];
  return (
    <div className="mt-2 space-y-3 leading-relaxed text-gray-500 dark:text-gray-300">
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.map((li, j) => <li key={j}>{li}</li>)}
          </ul>
        ) : (
          <p key={i}>{b}</p>
        ),
      )}
    </div>
  );
}

export default function LegalPage({ eyebrow, title, intro, sections }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      {intro && <p className="mt-6 leading-relaxed text-gray-500 dark:text-gray-300">{intro}</p>}
      <div className="mt-10 space-y-8">
        {sections.map(([heading, body], i) => (
          <section key={i}>
            <h2 className="text-xl font-semibold">{i + 1}. {heading}</h2>
            <Body body={body} />
          </section>
        ))}
      </div>
    </div>
  );
}
