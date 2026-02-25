type PagedQueryResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

export async function fetchAllPages<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<PagedQueryResult<Row>>,
  options?: {
    pageSize?: number;
    label?: string;
  },
): Promise<Row[]> {
  const pageSize = options?.pageSize ?? 1000;
  const label = options?.label ?? 'paged_query';
  const rows: Row[] = [];
  let from = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      console.error(`[${label}] ${error.message}`);
      break;
    }

    const chunk = data ?? [];
    rows.push(...chunk);

    if (chunk.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}
