import { useCallback, useMemo } from "react";
import DatePicker, { type ReactDatePickerCustomHeaderProps } from "react-datepicker";
import { getDaysInMonth, getYear } from "date-fns";

function parseLocalISODate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toLocalISO(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const headerSelectClass =
  "rounded-lg border border-primary/15 bg-white px-2 py-1.5 text-sm font-medium text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

function AgendaHeader(
  props: ReactDatePickerCustomHeaderProps & {
    onPick: (d: Date) => void;
    minDate?: Date;
    maxDate?: Date;
  }
) {
  const {
    date,
    monthDate,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
    onPick,
    minDate,
    maxDate,
  } = props;

  const anchor = date ?? monthDate;
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const currentDay = anchor.getDate();
  const daysInMonth = getDaysInMonth(new Date(y, m, 1));

  const minY = minDate ? getYear(minDate) : getYear(new Date()) - 100;
  const maxY = maxDate ? getYear(maxDate) : getYear(new Date()) + 15;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let yy = minY; yy <= maxY; yy++) list.push(yy);
    return list;
  }, [minY, maxY]);

  const apply = useCallback(
    (year: number, monthIndex: number, day: number) => {
      const cap = getDaysInMonth(new Date(year, monthIndex, 1));
      const safeDay = Math.min(Math.max(1, day), cap);
      let next = new Date(year, monthIndex, safeDay);
      if (minDate && next < stripTime(minDate)) next = stripTime(minDate);
      if (maxDate && next > stripTime(maxDate)) next = stripTime(maxDate);
      onPick(next);
    },
    [minDate, maxDate, onPick]
  );

  return (
    <div className="cgi-dp-header flex flex-col gap-2 border-b border-primary/10 px-2 pb-3 pt-1">
      <p className="text-center text-xs font-medium text-white/80">
        Ajuste dia, mês e ano nas listas
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg text-white transition hover:bg-white/20 disabled:opacity-30"
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          aria-label="Mês anterior"
        >
          ‹
        </button>

        <select
          className={headerSelectClass + " min-w-[3.25rem]"}
          aria-label="Dia"
          value={currentDay}
          onChange={(e) => apply(y, m, Number(e.target.value))}
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className={headerSelectClass + " min-w-[8.5rem]"}
          aria-label="Mês"
          value={m}
          onChange={(e) => apply(y, Number(e.target.value), currentDay)}
        >
          {MESES_PT.map((nome, idx) => (
            <option key={nome} value={idx}>
              {nome}
            </option>
          ))}
        </select>

        <select
          className={headerSelectClass + " min-w-[4.5rem]"}
          aria-label="Ano"
          value={y}
          onChange={(e) => apply(Number(e.target.value), m, currentDay)}
        >
          {years.map((yy) => (
            <option key={yy} value={yy}>
              {yy}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg text-white transition hover:bg-white/20 disabled:opacity-30"
          onClick={increaseMonth}
          disabled={nextMonthButtonDisabled}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  hideHint?: boolean;
};

export function DatePickerField({
  id = "date-picker",
  label,
  value,
  onChange,
  error,
  placeholder = "Abrir calendário",
  minDate,
  maxDate,
  disabled,
  hideHint,
}: Props) {
  const selected = useMemo(() => parseLocalISODate(value), [value]);

  const renderHeader = useCallback(
    (props: ReactDatePickerCustomHeaderProps) => (
      <AgendaHeader
        {...props}
        onPick={(d) => onChange(toLocalISO(d))}
        minDate={minDate}
        maxDate={maxDate}
      />
    ),
    [onChange, minDate, maxDate]
  );

  return (
    <div className={`w-full ${error ? "cgi-date-field-wrap-error" : ""}`}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-primary/80 dark:text-white/80"
      >
        {label}
      </label>
      <DatePicker
        id={id}
        selected={selected}
        onChange={(d) => onChange(d ? toLocalISO(d) : "")}
        locale="pt-BR"
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        calendarStartDay={1}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        popperClassName="cgi-datepicker-popper"
        wrapperClassName="cgi-date-field w-full"
        preventOpenOnFocus={false}
        showIcon
        toggleCalendarOnIconClick
        icon={
          <span
            className="flex shrink-0 items-center justify-center text-primary/50 dark:text-slate-400"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
        }
        calendarIconClassName="!static !m-0 !flex !h-5 !w-5 !shrink-0 !items-center !justify-center !p-0 !align-middle"
        className="cgi-date-field-input w-full min-w-0 border-0 bg-transparent py-2.5 pl-0 pr-1 text-sm text-primary shadow-none outline-none ring-0 transition placeholder:text-primary/40 focus:border-0 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white/40"
        calendarClassName="!rounded-xl !border !border-primary/10 !overflow-hidden !font-sans !shadow-modal"
        dayClassName={() => "rounded-lg"}
        renderCustomHeader={renderHeader}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : hideHint ? null : (
        <p className="mt-1 text-xs text-primary/45 dark:text-slate-400">
          Clique no campo ou no ícone para abrir a agenda; altere dia, mês e ano nas
          listas ou toque no calendário
        </p>
      )}
    </div>
  );
}
