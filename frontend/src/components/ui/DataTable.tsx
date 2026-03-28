import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  empty?: ReactNode;
};

export function DataTable<T>({ columns, data, rowKey, empty }: Props<T>) {
  if (!data.length && empty) {
    return (
      <div className="rounded-xl border border-primary/10 bg-white dark:border-white/10 dark:bg-slate-900">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-primary/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-primary/10 bg-surface/80 dark:border-white/10 dark:bg-white/5">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary/50 dark:text-slate-400 ${c.className ?? ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-primary/5 transition hover:bg-surface/50 dark:border-white/5 dark:hover:bg-white/5"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 text-primary dark:text-white/90 ${c.className ?? ""}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
