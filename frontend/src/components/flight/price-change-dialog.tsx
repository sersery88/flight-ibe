import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface PriceChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldPrice: number;
  newPrice: number;
  currency: string;
}

export function PriceChangeDialog({
  isOpen,
  onClose,
  onConfirm,
  oldPrice,
  newPrice,
  currency,
}: PriceChangeDialogProps) {
  const priceDiff = newPrice - oldPrice;
  const isIncrease = priceDiff > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${isIncrease ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
              <AlertTriangle className={`h-6 w-6 ${isIncrease ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
            </div>
            <DialogTitle>Preisänderung</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Der Preis für diesen Flug hat sich geändert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price comparison */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Ursprünglicher Preis:</span>
              <span className="text-lg font-semibold line-through text-neutral-500">
                {formatCurrency(oldPrice, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Neuer Preis:</span>
              <span className={`text-2xl font-bold ${isIncrease ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(newPrice, currency)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Differenz:</span>
                <span className={`text-lg font-bold ${isIncrease ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                  {isIncrease ? '+' : ''}{formatCurrency(priceDiff, currency)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Flugpreise können sich jederzeit ändern. Möchten Sie mit dem neuen Preis fortfahren?
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Abbrechen
          </Button>
          <Button onClick={onConfirm} className="flex-1">
            Fortfahren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

