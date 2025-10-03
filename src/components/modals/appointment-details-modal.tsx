'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { CalendarTask } from '@/app/(app)/calendar/page';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CalendarTask;
  onReschedule: (task: CalendarTask, newDate: Date) => void;
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  task,
  onReschedule,
}: AppointmentDetailsModalProps) {
  const [newDate, setNewDate] = useState<Date | undefined>(task.date);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (newDate) {
      onReschedule(task, newDate);
      toast({
        title: 'Tarefa reagendada!',
        description: `"${task.title}" foi movida para ${format(newDate, 'PPP', { locale: ptBR })}.`,
      });
      onClose();
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{task.title}</DialogTitle>
          <DialogDescription>
            {task.subtitle || 'Detalhes da tarefa.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
             <Avatar className="h-8 w-8">
                {task.responsible.avatarUrl && <AvatarImage src={task.responsible.avatarUrl} alt={task.responsible.name} />}
                <AvatarFallback style={{ backgroundColor: task.responsible.color }} className='text-sm'>
                    {getInitials(task.responsible.name)}
                </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">Responsável:</p>
              <p className="text-sm text-muted-foreground">{task.responsible.name}</p>
            </div>
          </div>
           <div>
              <p className="text-sm font-medium text-foreground">Data Agendada:</p>
              <p className="text-sm text-muted-foreground">{format(task.date, 'PPP', { locale: ptBR })}</p>
            </div>
        </div>

        {isRescheduling && (
            <div className="space-y-2">
                <label className="text-sm font-medium">Nova Data</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !newDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newDate ? format(newDate, 'PPP', { locale: ptBR }) : <span>Escolha uma nova data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newDate}
                        onSelect={setNewDate}
                        initialFocus
                      />
                    </PopoverContent>
                </Popover>
            </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {!isRescheduling ? (
             <Button type="button" onClick={() => setIsRescheduling(true)}>
                Reagendar
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={!newDate}>
                Salvar Nova Data
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
