export function SectorServiceFAQ({ title, items }: { title: string; items: Array<{ question: string; answer: string }> }) {
  return (
    <section>
      <h2 className="text-2xl font-extrabold text-navy">{title}</h2>
      <div className="mt-6 divide-y divide-line border-y border-line">
        {items.map((item) => <details key={item.question} className="group py-5">
          <summary className="cursor-pointer text-base font-bold text-navy transition hover:text-signal focus-visible:outline-signal">{item.question}</summary>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-steel">{item.answer}</p>
        </details>)}
      </div>
    </section>
  );
}
