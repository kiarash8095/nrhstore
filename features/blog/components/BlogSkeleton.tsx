export function BlogSectionSkeleton() {
  return (
    <section
      aria-label="در حال دریافت مقاله‌ها"
      aria-busy="true"
      className="my-14 w-full animate-pulse motion-reduce:animate-none"
    >
      <div className="mb-6 h-12 w-60 rounded-xl bg-gray-100" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((id) => (
          <div
            key={id}
            className="overflow-hidden rounded-3xl border border-gray-100 bg-white"
          >
            <div className="aspect-[16/10] bg-gray-100" />
            <div className="space-y-4 p-5">
              <div className="h-5 w-16 rounded bg-orange-50" />
              <div className="h-6 w-full rounded bg-gray-100" />
              <div className="h-5 w-3/4 rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BlogPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="h-32 animate-pulse rounded-3xl bg-orange-50 motion-reduce:animate-none" />
      <BlogSectionSkeleton />
    </main>
  );
}
