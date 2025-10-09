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
import { Input } from '@/components/ui/input';
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';

const categorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres.'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface RegisterQuoteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterQuoteCategoryModal({
  isOpen,
  onClose,
}: RegisterQuoteCategoryModalProps) {
  const { addQuoteMaterialCategory } = useContext(AppContext);
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = (data: CategoryFormValues) => {
    addQuoteMaterialCategory(data);
    toast({
      title: 'Categoria criada!',
      description: `A categoria "${data.name}" foi adicionada.`,
    });
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Nova Categoria de Material de Custo
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova categoria para organizar os materiais da sua base de dados de orçamentos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Puxadores" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Categoria</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
