'use client';

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
import type { StockItem } from '@/lib/types';
import { useEffect } from 'react';

const purchaseSchema = z.object({
  quantity: z.coerce.number().min(0.01, 'A quantidade deve ser positiva.'),
  supplier: z.string().min(2, 'O nome do fornecedor é obrigatório.'),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

interface RegisterPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
  onConfirm: (itemId: string, quantity: number, supplier: string) => void;
}

export function RegisterPurchaseModal({
  isOpen,
  onClose,
  item,
  onConfirm,
}: RegisterPurchaseModalProps) {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      quantity: 1,
      supplier: '',
    },
  });

  useEffect(() => {
    if(isOpen) {
        form.reset({
            quantity: 1,
            supplier: '',
        });
    }
  }, [isOpen, form]);

  const onSubmit = (data: PurchaseFormValues) => {
    onConfirm(item.id, data.quantity, data.supplier);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Registrar Compra - {item.name}
          </DialogTitle>
          <DialogDescription>
            Informe a quantidade comprada deste item e o fornecedor. Isso moverá o item para a área de "Aguardando Recebimento" no estoque.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade Comprada</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Leo Madeiras" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Compra</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
