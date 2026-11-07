import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60000, gcTime: 600000, refetchOnWindowFocus: true, retry: 1 },
  },
});

const writeMethods = new Set(['post', 'put', 'patch', 'delete']);
const dashboardWrites = /^\/(?:auth\/register$|admin\/(?:students|teachers|fees|leaves|materials)(?:\/|$)|classes(?:\/schedule(?:\/|$)|\/generate-year$)|demo(?:\/|$)|enquiries(?:\/|$)|(?:student|teacher)\/leave$|teacher\/materials(?:\/|$))/;

export function invalidateAdminQueries(response) {
  const { url = '', method } = response.config;
  const path = url.split('?')[0];
  if (!writeMethods.has(method) || response.data?.success === false) return;
  if (dashboardWrites.test(path)) {
    const filters = { queryKey: ['dashboard-stats'] };
    queryClient.cancelQueries(filters).then(() => queryClient.invalidateQueries(filters));
  }
  if (path === '/auth/register' || /^\/admin\/(?:students|teachers)(?:\/|$)/.test(path)) {
    // Active directory edits/deletes patch their cached rows directly.
    queryClient.invalidateQueries({ queryKey: ['students'], refetchType: 'none' });
  }
}
