'use client';

import { useContext, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import type { StockItem, StockMovement, TeamMember } from '@/lib/types';
import { useUser } from '@/firebase';

const movementSchema = z.object({
  type: z.enum(['entry', 'exit'], { required_error: 'Selecione o tipo de movimentação.' }),
  quantity: z.coerce.number().min(0.01, 'A quantidade deve ser maior que zero.'),
  reason: z.string().min(1, 'O motivo é obrigatório.'),
  details: z.string().optional(),
}).refine(data => {
  if (data.reason === 'uso_marceneiro' && !data.details) {
    return false;
  }
  if (data.reason === 'outros' && (!data.details || data.details.length < 3)) {
    return false;
  }
  return true;
}, {
  message: 'Detalhe é obrigatório para este motivo.',
  path: ['details'],
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
}

const entryReasons = [
  { value: 'compra', label: 'Compra de Reposição' },
  { value: 'estorno', label: 'Estorno / Devolução' },
  { value: 'outros', label: 'Outros' },
];

const exitReasons = [
  { value: 'uso_marceneiro', label: 'Uso por Marceneiro' },
  { value: 'despacho_producao', label: 'Despacho para Produção' },
  { value: 'outros', label: 'Outros' },
];

export function StockMovementModal({ isOpen, onClose, item }: StockMovementModalProps) {
  const { addStockMovement, teamMembers } = useContext(AppContext);
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: 'exit', quantity: 1, reason: '', details: '' },
  });

  const movementType = form.watch('type');
  const reason = form.watch('reason');

  useEffect(() => {
    if (isOpen) {
      form.reset({ type: 'exit', quantity: 1, reason: exitReasons[0].value, details: '' });
    }
  }, [isOpen, form]);

  useEffect(() => {
    form.setValue('reason', movementType === 'entry' ? entryReasons[0].value : exitReasons[0].value);
    form.setValue('details', '');
    form.clearErrors('details');
  }, [movementType, form]);

  const onSubmit = (data: MovementFormValues) => {
    if (data.type === 'exit' && data.quantity > item.quantity) {
      form.setError('quantity', { type: 'manual', message: 'A quantidade de saída não pode ser maior que o estoque atual.' });
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro de autenticação', description: 'Você precisa estar logado para movimentar o estoque.' });
      return;
    }

    const movementData = { ...data, memberId: user.uid };
    addStockMovement(item.id, movementData as Omit<StockMovement, 'id' | 'timestamp' | 'stockItemId'>);

    toast({
      title: 'Movimentação registrada!',
      description: `A ${data.type === 'entry' ? 'entrada' : 'saída'} de ${data.quantity} ${item.unit}(s) de ${item.name} foi registrada.`,
    });
    onClose();
  };
  
  const marceneiros = teamMembers.filter(m => m.role === 'Marceneiro');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Movimentar Item do Estoque</DialogTitle>
          <DialogDescription>
            Registre a entrada ou saída de <span className="font-bold">{item.name}</span>. Estoque atual: {item.quantity} {item.unit}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de Movimentação</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="entry" /></FormControl>
                        <FormLabel className="font-normal">Entrada</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="exit" /></FormControl>
                        <FormLabel className="font-normal">Saída</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(movementType === 'entry' ? entryReasons : exitReasons).map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {reason === 'uso_marceneiro' && (
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marceneiro</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione o marceneiro" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {marceneiros.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {reason === 'outros' && (
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especifique o Motivo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o motivo da movimentação..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar Movimentação</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
