import * as React from 'react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function parseDateString(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function toDateString(date: Date | undefined): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  id?: string;
  locale?: Locale;
  dateFormat?: string;
  align?: 'start' | 'center' | 'end';
  /** Tanggal paling awal yang bisa dipilih */
  fromDate?: Date;
  /** Tanggal paling akhir yang bisa dipilih */
  toDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  className,
  buttonClassName,
  disabled,
  id,
  locale = idLocale,
  dateFormat = 'dd MMM yyyy',
  align = 'start',
  fromDate,
  toDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            buttonClassName,
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? format(value, dateFormat, { locale }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            if (d) setOpen(false);
          }}
          initialFocus
          locale={locale}
          disabled={{
            ...(fromDate ? { before: fromDate } : {}),
            ...(toDate ? { after: toDate } : {}),
          }}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
