import { XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FlightUnavailableDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlightUnavailableDialog({ isOpen, onClose }: FlightUnavailableDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Flug nicht mehr verfügbar</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Dieser Flug ist leider nicht mehr verfügbar oder die Buchungsklasse ist ausgebucht.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Bitte wählen Sie einen anderen Flug aus den Suchergebnissen oder starten Sie eine neue Suche.
          </p>
        </div>

        <Button onClick={onClose} className="w-full">
          Zurück zu den Ergebnissen
        </Button>
      </DialogContent>
    </Dialog>
  );
}

