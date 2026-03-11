const normalizeCategoryToken = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();

export const parseProductCategoryTags = (value: string): string[] => {
  const rawTokens = value
    .split('#')
    .map((token) => normalizeCategoryToken(token))
    .filter(Boolean);

  const deduped: string[] = [];
  rawTokens.forEach((token) => {
    const normalized = `#${token}`;
    if (!deduped.includes(normalized)) {
      deduped.push(normalized);
    }
  });
  return deduped;
};

export const formatProductCategoryTags = (
  tags: string[] | null | undefined,
): string => {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  return tags.filter(Boolean).join(' ');
};

export const productMatchesCategory = (
  tags: string[] | null | undefined,
  selectedTag: string,
): boolean => {
  if (!selectedTag) return true;
  if (!Array.isArray(tags) || tags.length === 0) return false;
  return tags.includes(selectedTag);
};
