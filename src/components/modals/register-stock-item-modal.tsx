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
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import type { StockItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const stockItemSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  quantity: z.coerce.number().min(0, 'A quantidade não pode ser negativa.'),
  unit: z.string().min(1, 'A unidade é obrigatória.'),
});

type StockItemFormValues = z.infer<typeof stockItemSchema>;

interface RegisterStockItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: StockItem | null;
}

const units = ['m²', 'm linear', 'unidade', 'chapa', 'litro', 'kg'];

export function RegisterStockItemModal({ isOpen, onClose, itemToEdit }: RegisterStockItemModalProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('RegisterStockItemModal must be used within an AppProvider');
  }
  const { addStockItem, updateStockItem } = context;
  const { toast } = useToast();

  const isEditMode = !!itemToEdit;

  const form = useForm<StockItemFormValues>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: {
      name: '',
      quantity: 0,
      unit: 'unidade',
    },
  });
  
  useEffect(() => {
    if(isOpen) {
      if (isEditMode && itemToEdit) {
        form.reset(itemToEdit);
      } else {
        form.reset({ name: '', quantity: 0, unit: 'unidade' });
      }
    }
  }, [isOpen, isEditMode, itemToEdit, form]);

  const onSubmit = (data: StockItemFormValues) => {
    if (isEditMode && itemToEdit) {
      updateStockItem({ ...itemToEdit, ...data });
       toast({
        title: 'Item de estoque atualizado!',
        description: `Os dados de ${data.name} foram atualizados.`,
      });
    } else {
      addStockItem(data);
      toast({
        title: 'Item de estoque cadastrado!',
        description: `${data.name} foi adicionado(a) ao estoque.`,
      });
    }
    
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? 'Editar Item' : 'Cadastrar Item no Estoque'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Altere os dados de ${itemToEdit?.name}.` : 'Adicione um novo item ao seu inventário.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Item</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: MDF Branco 18mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="flex gap-4">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem className="flex-grow">
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                    <FormItem className="w-[150px]">
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {units.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
