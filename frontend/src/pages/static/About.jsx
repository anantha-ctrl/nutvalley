export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Our Story</p>
      <h1 className="mt-2 font-display text-4xl font-bold">About Beadsboutique</h1>
      <div className="mt-8 space-y-5 leading-relaxed text-gray-500 dark:text-gray-300">
        <p>At Beadsboutique, we believe beautiful jewellery doesn't have to be expensive or mass-produced.</p>
        <p>Every piece begins as a handful of beads — glass, crystal, pearl, stone and metal — chosen for
          colour, texture and the way they catch the light.</p>
        <p>We started Beadsboutique with a simple belief: jewellery should feel personal, be comfortable to
          wear every day and still make you smile when you look in the mirror.</p>
        <p>That's why each necklace, bracelet, pair of earrings, ring and anklet is designed and finished with
          care, in small batches, so no two collections are quite the same.</p>
        <p>Whether you're dressing up for an occasion, building your everyday stack or looking for a
          thoughtful gift, we're here to help you find a piece that feels like you.</p>
        <p className="font-medium text-luxe-ink dark:text-white">Handcrafted beads. Made to be worn, loved and gifted.</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[['🇮🇳', 'Handcrafted in India'], ['📿', 'Quality beads & findings'], ['🎁', 'Gift-ready packaging']].map(([n, l]) => (
          <div key={l} className="card p-6 text-center">
            <p className="font-display text-3xl font-bold text-gold">{n}</p>
            <p className="mt-1 text-sm text-gray-400">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
