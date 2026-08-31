'use client';

import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getStatsByCity, getStatsByCountry } from '@/lib/api';
import { formatInt, formatUsd } from '@/lib/format';
import { EmptyState, ErrorNote, LoadingBlock, Mono, PageHeader, TableShell, td, th } from '@/components/ui';

export default function GeoPage() {
  const { adminFetch } = useAdminAuth();

  const { data: byCountry, loading: countryLoading, error: countryError } = useFetch(
    () => adminFetch((t) => getStatsByCountry(t)),
    []
  );
  const { data: byCity, loading: cityLoading, error: cityError } = useFetch(() => adminFetch((t) => getStatsByCity(t)), []);

  return (
    <div>
      <PageHeader title="Geo Analytics" description="Confirmed buyer volume by location." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-bold text-ink">By Country</h2>
          {countryLoading && !byCountry ? (
            <LoadingBlock />
          ) : countryError && !byCountry ? (
            <ErrorNote>{countryError}</ErrorNote>
          ) : !byCountry || byCountry.length === 0 ? (
            <EmptyState>No geo data yet.</EmptyState>
          ) : (
            <TableShell>
              <thead>
                <tr className="border-b border-border">
                  <th className={th}>Country</th>
                  <th className={th}>Buyers</th>
                  <th className={th}>Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byCountry.map((c) => (
                  <tr key={c.country}>
                    <td className={`${td} text-ink-dim`}>
                      {c.country} {c.country_code && <span className="text-ink-faint">({c.country_code})</span>}
                    </td>
                    <td className={td}>
                      <Mono>{formatInt(c.buyers)}</Mono>
                    </td>
                    <td className={td}>
                      <Mono>{formatUsd(c.volume)}</Mono>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold text-ink">By City</h2>
          {cityLoading && !byCity ? (
            <LoadingBlock />
          ) : cityError && !byCity ? (
            <ErrorNote>{cityError}</ErrorNote>
          ) : !byCity || byCity.length === 0 ? (
            <EmptyState>No geo data yet.</EmptyState>
          ) : (
            <TableShell>
              <thead>
                <tr className="border-b border-border">
                  <th className={th}>City</th>
                  <th className={th}>Buyers</th>
                  <th className={th}>Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byCity.map((c) => (
                  <tr key={`${c.city}-${c.country}`}>
                    <td className={`${td} text-ink-dim`}>
                      {c.city}
                      {c.country && <span className="text-ink-faint">, {c.country}</span>}
                    </td>
                    <td className={td}>
                      <Mono>{formatInt(c.buyers)}</Mono>
                    </td>
                    <td className={td}>
                      <Mono>{formatUsd(c.volume)}</Mono>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      </div>
    </div>
  );
}
