import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker, parseDateString, toDateString } from '@/components/ui/date-picker';
import { exportReportToExcel, exportReportToPdf } from '@/lib/export-report';

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Rentang default saat dialog dibuka (mengikuti periode aktif di Laporan),
   * dalam epoch ms agar identitasnya stabil antar-render parent.
   */
  defaultStartMs: number;
  defaultEndMs: number;
}

export default function ExportReportDialog({
  open,
  onOpenChange,
  defaultStartMs,
  defaultEndMs,
}: ExportReportDialogProps) {
  const { t } = useTranslation('reports');
  const [startDate, setStartDate] = useState(() => format(defaultStartMs, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(defaultEndMs, 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  // Sinkronkan input dengan periode aktif setiap kali dialog dibuka, atau saat
  // periode aktif berubah.
  useEffect(() => {
    if (open) {
      setStartDate(format(defaultStartMs, 'yyyy-MM-dd'));
      setEndDate(format(defaultEndMs, 'yyyy-MM-dd'));
    }
  }, [open, defaultStartMs, defaultEndMs]);

  const invalidRange = !startDate || !endDate || startDate > endDate;

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (invalidRange) {
      toast.error(t('exportDialog.invalidRangeToast'));
      return;
    }
    setExporting(format);
    try {
      const rangeStart = new Date(`${startDate}T00:00:00`);
      const rangeEnd = new Date(`${endDate}T00:00:00`);
      const result = format === 'excel'
        ? await exportReportToExcel(rangeStart, rangeEnd)
        : await exportReportToPdf(rangeStart, rangeEnd);
      if (result.txCount === 0 && result.expenseCount === 0) {
        toast.info(t('exportDialog.noDataToast'));
      } else {
        toast.success(
          t('exportDialog.successToast', { txCount: result.txCount, expenseCount: result.expenseCount }),
        );
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Export laporan gagal:', err);
      toast.error(t('exportDialog.errorToast'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !exporting && onOpenChange(o)}>
      <DialogContent className="max-w-[95vw] sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            {t('exportDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('exportDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t('exportDialog.fromDate')}
              </Label>
              <DatePicker
                value={parseDateString(startDate)}
                onChange={(d) => setStartDate(toDateString(d))}
                placeholder={t('exportDialog.fromDate')}
                toDate={parseDateString(endDate)}
                buttonClassName="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t('exportDialog.toDate')}
              </Label>
              <DatePicker
                value={parseDateString(endDate)}
                onChange={(d) => setEndDate(toDateString(d))}
                placeholder={t('exportDialog.toDate')}
                fromDate={parseDateString(startDate)}
                buttonClassName="h-11"
              />
            </div>
          </div>

          {invalidRange && startDate && endDate && (
            <p className="text-xs text-destructive">
              {t('exportDialog.invalidRange')}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-12 text-sm font-semibold gap-2"
              onClick={() => handleExport('excel')}
              disabled={!!exporting || invalidRange}
            >
              {exporting === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t('exportDialog.exportExcel')}
            </Button>
            <Button
              variant="outline"
              className="h-12 text-sm font-semibold gap-2"
              onClick={() => handleExport('pdf')}
              disabled={!!exporting || invalidRange}
            >
              {exporting === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t('exportDialog.exportPdf')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
