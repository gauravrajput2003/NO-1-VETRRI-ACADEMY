import { useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

const getId = item => String(item._id ?? item.id);

export default function useInfiniteScroll({ queryKey, fetchPage, pageSize = 20, enabled = true }) {
  const queryClient = useQueryClient();
  const sentinel = useRef(null);
  const {
    data, isFetching, isError, isFetchNextPageError, hasNextPage, fetchNextPage, refetch,
  } = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => ({ ...await fetchPage(pageParam, signal), page: pageParam }),
    getNextPageParam: last => last.hasMore ? last.nextPage ?? last.page + 1 : undefined,
  });
  const pages = enabled ? data?.pages : undefined;
  const items = [...new Map((pages ?? []).flatMap(page => page.items).map(item => [getId(item), item])).values()];
  const loading = !enabled || isFetching;
  const error = enabled && isError;

  useEffect(() => {
    if (!enabled || !sentinel.current || isFetching || isError || !hasNextPage) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) fetchNextPage({ cancelRefetch: false });
    }, { rootMargin: '200px 0px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [enabled, fetchNextPage, isFetching, isError, hasNextPage, data]);

  const updateItem = async updated => {
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData(queryKey, current => current && {
      ...current,
      pages: current.pages.map(page => ({
        ...page,
        items: page.items.map(item => getId(item) === getId(updated) ? { ...item, ...updated } : item),
      })),
    });
  };

  const removeItem = async removed => {
    await queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData(queryKey, current => {
      if (!current) return current;
      const id = getId(removed);
      if (!current.pages.some(page => page.items.some(item => getId(item) === id))) return current;
      const pages = current.pages.map(page => ({ ...page, items: page.items.filter(item => getId(item) !== id) }));
      const last = pages[pages.length - 1];
      const loaded = new Set(pages.flatMap(page => page.items.map(getId))).size;
      last.total = Math.max(0, last.total - 1);
      last.hasMore = loaded < last.total;
      // Deletion shifts offsets. Resume with an overlapping page and dedupe rows.
      last.nextPage = Math.min(last.nextPage ?? last.page + 1, Math.floor(loaded / pageSize) + 1);
      return { ...current, pages };
    });
  };

  return {
    items, total: pages?.at(-1)?.total ?? null, hasMore: !enabled || Boolean(hasNextPage),
    loading, error, sentinel, updateItem, removeItem,
    retry: () => isFetchNextPageError ? fetchNextPage({ cancelRefetch: false }) : refetch(),
    refresh: () => queryClient.resetQueries({ queryKey, exact: true }),
  };
}
