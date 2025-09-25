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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TeamMember } from '@/lib/types';

const movementSchema = z.object({
  type: z.enum(['entry', 'exit'], {
    required_error: 'Selecione o tipo de movimentação.',
  }),
  quantity: z.coerce
    .number()
    .min(0.01, 'A quantidade deve ser maior que zero.'),
  reason: z.string().min(3, 'O motivo deve ter pelo menos 3 caracteres.'),
  memberId: z.string().min(1, 'Selecione um membro da equipe.'),
});

type MovementFormValues = z.infer<typeof movementSchema>;

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
  const { addStockMovement, teamMembers } = context;
  const { toast } = useToast();

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: 'exit',
      quantity: 1,
      reason: '',
      memberId: teamMembers.length > 0 ? teamMembers[0].id : undefined
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        type: 'exit',
        quantity: 1,
        reason: '',
        memberId: teamMembers.length > 0 ? teamMembers[0].id : undefined
      });
    }
  }, [isOpen, form, teamMembers]);
  
  const memberMap = useMemo(() => {
    return new Map(teamMembers.map((m) => [m.id, m]));
  }, [teamMembers]);

  const onSubmit = (data: MovementFormValues) => {
    if (data.type === 'exit' && data.quantity > item.quantity) {
      form.setError('quantity', {
        type: 'manual',
        message: 'A quantidade de saída não pode ser maior que o estoque atual.',
      });
      return;
    }
    
    addStockMovement(item.id, data);

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
            
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((member: TeamMember) => {
                          const memberInfo = memberMap.get(member.id);
                          return (
                          <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                  {memberInfo && <span className="h-4 w-4 rounded-full" style={{ backgroundColor: memberInfo.color }}></span>}
                                  <span>{memberInfo?.name || 'Desconhecido'}</span>
                              </div>
                          </SelectItem>
                          )
                      })}
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
              <Button type="submit">Salvar Movimentação</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
