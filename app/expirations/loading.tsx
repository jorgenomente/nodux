export default function ExpirationsLoading() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-zinc-200" />
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-200" />
          <div className="mt-4 space-y-3">
            <div className="h-20 w-full animate-pulse rounded-xl bg-zinc-100" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-zinc-100" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-zinc-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
