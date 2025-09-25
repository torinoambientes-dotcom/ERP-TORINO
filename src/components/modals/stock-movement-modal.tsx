'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
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
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import type { StockItem, StockMovement } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { useUser } from '@/firebase';

const movementSchema = z.object({
  type: z.enum(['entry', 'exit'], {
    required_error: 'Selecione o tipo de movimentação.',
  }),
  quantity: z.coerce
    .number()
    .min(0.01, 'A quantidade deve ser maior que zero.'),
  reason: z.string().min(3, 'O motivo deve ter pelo menos 3 caracteres.'),
});

type MovementFormValues = Omit<StockMovement, 'id' | 'timestamp' | 'memberId'>;

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
}

export function StockMovementModal({
  isOpen,
  onClose,
  item,
}: StockMovementModalProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('StockMovementModal must be used within an AppProvider');
  }
  const { addStockMovement } = context;
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: 'exit',
      quantity: 1,
      reason: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        type: 'exit',
        quantity: 1,
        reason: '',
      });
    }
  }, [isOpen, form]);

  const onSubmit = (data: MovementFormValues) => {
    if (data.type === 'exit' && data.quantity > item.quantity) {
      form.setError('quantity', {
        type: 'manual',
        message: 'A quantidade de saída não pode ser maior que o estoque atual.',
      });
      return;
    }
    
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Erro de autenticação',
            description: 'Você precisa estar logado para movimentar o estoque.',
        });
        return;
    }

    const movementDataWithMember = {
        ...data,
        memberId: user.uid,
    }
    
    addStockMovement(item.id, movementDataWithMember);

    toast({
      title: 'Movimentação registrada!',
      description: `A ${data.type === 'entry' ? 'entrada' : 'saída'} de ${data.quantity} ${item.unit}(s) de ${item.name} foi registrada.`,
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Movimentar Item do Estoque
          </DialogTitle>
          <DialogDescription>
            Registre a entrada ou saída de{' '}
            <span className="font-bold">{item.name}</span>. Estoque atual:{' '}
            {item.quantity} {item.unit}.
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
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="entry" />
                        </FormControl>
                        <FormLabel className="font-normal">Entrada</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="exit" />
                        </FormControl>
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
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Uso no projeto do Cliente X, compra de novo lote, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Movimentação</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
