'use client';
import { useContext, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';

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
import { Separator } from '../ui/separator';

const quoteItemSchema = z.object({
  description: z.string().min(1, 'Descrição do item é obrigatória.'),
  quantity: z.coerce.number().min(1, 'Quantidade deve ser no mínimo 1.'),
  unitPrice: z.coerce.number().min(0, 'Preço unitário não pode ser negativo.'),
});

const quoteSchema = z.object({
  clientName: z.string().min(1, 'Nome do cliente é obrigatório.'),
  clientContact: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Adicione pelo menos um item ao orçamento.'),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface RegisterQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterQuoteModal({
  isOpen,
  onClose,
}: RegisterQuoteModalProps) {
  const { addQuote } = useContext(AppContext);
  const { toast } = useToast();

  const defaultValues: QuoteFormValues = {
    clientName: '',
    clientContact: '',
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  };

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  useEffect(() => {
    if (isOpen) {
        form.reset(defaultValues);
    }
  }, [isOpen, form]);


  const onSubmit = (data: QuoteFormValues) => {
    addQuote(data);
    toast({
        title: 'Orçamento Registado!',
        description: `O orçamento para "${data.clientName}" foi criado com sucesso.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Criar Novo Orçamento</DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente e os itens para gerar um novo orçamento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="clientContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contato do Cliente (Email/Telefone)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: (11) 99999-9999" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 font-headline">Itens do Orçamento</h3>
              <div className="space-y-3">
                  {fields.map((itemField, index) => (
                    <div key={itemField.id} className="p-3 border rounded-lg space-y-2 bg-muted/50">
                        <div className="flex justify-between items-center">
                            <p className="font-medium text-sm">Item {index + 1}</p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                <Input placeholder="Ex: Cozinha Planejada Completa" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <div className="flex gap-4">
                            <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                <FormItem className="w-1/3">
                                    <FormLabel>Qtd.</FormLabel>
                                    <FormControl>
                                    <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`items.${index}.unitPrice`}
                                render={({ field }) => (
                                <FormItem className="w-2/3">
                                    <FormLabel>Preço Unitário (R$)</FormLabel>
                                    <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                  ))}
               </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ description: '', quantity: 1, unitPrice: 0 })
                }
                className="mt-4"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
             <DialogFooter className="sticky bottom-0 bg-background pt-4 z-10">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Orçamento</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}