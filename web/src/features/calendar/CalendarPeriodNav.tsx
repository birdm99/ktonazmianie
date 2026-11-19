import type { CalendarView } from "@/lib/types";
import { formatPeriodTitle } from "@/lib/dates";

export interface CalendarPeriodNavProps {
  anchor: Date;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onPrint?: () => void;
  mobileLayout?: boolean;
  onMobileLayoutChange?: (value: boolean) => void;
}

export function CalendarPeriodNav({
  anchor,
  view,
  onPrev,
  onNext,
  onPrint,
  mobileLayout = false,
  onMobileLayoutChange,
}: CalendarPeriodNavProps) {
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
      {onMobileLayoutChange ? (
        <button
          type="button"
          className="btn-secondary h-10 shrink-0 px-3 text-sm font-semibold text-slate-800 sm:px-4"
          onClick={() => onMobileLayoutChange(!mobileLayout)}
          aria-pressed={mobileLayout}
          title={
            mobileLayout
              ? "Wróć do klasycznej tabeli (lepsza na dużym ekranie)"
              : "Lista dni — czytelny widok na telefonie"
          }
        >
          <span className="sm:hidden">{mobileLayout ? "Tabela" : "Lista"}</span>
          <span className="hidden sm:inline">
            {mobileLayout ? "Widok tabeli" : "Widok mobilny"}
          </span>
        </button>
      ) : null}
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
