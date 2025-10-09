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
import type { QuoteMaterial, QuoteMaterialCategory } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const itemSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  cost: z.coerce.number().min(0, 'O custo não pode ser negativo.'),
  unit: z.string().min(1, 'A unidade é obrigatória.'),
  category: z.string().min(1, "Selecione uma categoria."),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface RegisterQuoteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: QuoteMaterial | null;
  categories: QuoteMaterialCategory[];
}

const units = ['m²', 'm linear', 'unidade', 'chapa', 'litro', 'kg'];

export function RegisterQuoteItemModal({
  isOpen,
  onClose,
  itemToEdit,
  categories = []
}: RegisterQuoteItemModalProps) {
  const { addQuoteMaterial, updateQuoteMaterial } = useContext(AppContext);
  const { toast } = useToast();

  const isEditMode = !!itemToEdit;
  const defaultCategory = categories.length > 0 ? categories[0].name : '';

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      cost: 0,
      unit: 'unidade',
      category: defaultCategory,
    },
  });

  useEffect(() => {
    const defaultCategory = categories.length > 0 ? categories[0].name : '';
    if (isOpen) {
      if (isEditMode && itemToEdit) {
        form.reset(itemToEdit);
      } else {
        form.reset({
          name: '',
          cost: 0,
          unit: 'unidade',
          category: defaultCategory,
        });
      }
    }
  }, [isOpen, isEditMode, itemToEdit, form, categories]);

  const onSubmit = (data: ItemFormValues) => {
    if (isEditMode && itemToEdit) {
      updateQuoteMaterial({ ...itemToEdit, ...data });
      toast({
        title: 'Material atualizado!',
        description: `Os dados de ${data.name} foram atualizados.`,
      });
    } else {
      addQuoteMaterial(data);
      toast({
        title: 'Material cadastrado!',
        description: `${data.name} foi adicionado à base de dados de custos.`,
      });
    }

    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {isEditMode ? 'Editar Material de Custo' : 'Cadastrar Material de Custo'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Altere os dados de ${itemToEdit?.name}.`
              : 'Adicione um novo item à sua base de dados de custos.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Material</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Dobradiça TN Click" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Custo (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
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
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
