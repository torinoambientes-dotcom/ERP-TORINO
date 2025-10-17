'use client';

import { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppContext } from '@/context/app-context';
import type { StockItem, StockReservation, TeamMember } from '@/lib/types';
import { Truck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';

const dispatchSchema = z.object({
  marceneiroId: z.string().min(1, 'É obrigatório selecionar um marceneiro.'),
});

type DispatchFormValues = z.infer<typeof dispatchSchema>;

interface DispatchConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
  reservation: StockReservation;
  onConfirm: (stockItemId: string, reservation: StockReservation, marceneiroId: string) => void;
}

export function DispatchConfirmationModal({
  isOpen,
  onClose,
  item,
  reservation,
  onConfirm,
}: DispatchConfirmationModalProps) {
  const { teamMembers } = useContext(AppContext);
  const marceneiros = teamMembers.filter((m) => m.role === 'Marceneiro');

  const form = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      marceneiroId: undefined,
    },
  });

  const onSubmit = (data: DispatchFormValues) => {
    onConfirm(item.id, reservation, data.marceneiroId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Confirmar Despacho de Material
          </DialogTitle>
          <DialogDescription>
            A despachar <span className="font-bold">{reservation.quantity} {item.unit}(s)</span> de <span className="font-bold">{item.name}</span> para o projeto <span className="font-bold">{reservation.projectName}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="marceneiroId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entregar para qual marceneiro?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o marceneiro..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {marceneiros.map((membro) => (
                        <SelectItem key={membro.id} value={membro.id}>
                          <div className="flex items-center gap-2">
                             <Avatar className="h-6 w-6">
                                {membro.avatarUrl && <AvatarImage src={membro.avatarUrl} alt={membro.name} />}
                                <AvatarFallback style={{ backgroundColor: membro.color }} className='text-xs'>
                                {getInitials(membro.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span>{membro.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                <Truck className="mr-2 h-4 w-4" />
                Confirmar Despacho
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
