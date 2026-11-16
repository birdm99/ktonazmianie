import type { CalendarView } from "@/lib/types";
import { formatPeriodTitle } from "@/lib/dates";

export interface CalendarPeriodNavProps {
  anchor: Date;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onPrint?: () => void;
}

export function CalendarPeriodNav({ anchor, view, onPrev, onNext, onPrint }: CalendarPeriodNavProps) {
  const title = formatPeriodTitle(anchor, view);

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-100 pb-3 pt-1 sm:gap-3 print:hidden"
      aria-label="Nawigacja okresu kalendarza"
    >
      <button
        type="button"
        className="btn-secondary h-10 w-10 shrink-0 px-0 text-lg font-semibold text-slate-800"
        onClick={onPrev}
        aria-label="Poprzedni okres"
      >
        ←
      </button>
      <h1 className="min-w-[12rem] text-center text-lg font-semibold capitalize text-slate-900 sm:min-w-[16rem] sm:text-xl">
        {title}
      </h1>
      <button
        type="button"
        className="btn-secondary h-10 w-10 shrink-0 px-0 text-lg font-semibold text-slate-800"
        onClick={onNext}
        aria-label="Następny okres"
      >
        →
      </button>
      {onPrint ? (
        <button
          type="button"
          className="btn-secondary h-10 shrink-0 px-4 text-sm font-semibold text-slate-800"
          onClick={onPrint}
          aria-label="Drukuj grafik do PDF"
          title="W oknie drukowania wybierz „Zapisz jako PDF”"
        >
          Drukuj
        </button>
      ) : null}
    </nav>
  );
}
