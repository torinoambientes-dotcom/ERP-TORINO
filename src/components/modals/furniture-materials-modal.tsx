'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { Furniture, MaterialItem } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { generateId, cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FurnitureMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: Furniture;
  onUpdate: (furniture: Furniture) => void;
}

const materialSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome do material é obrigatório.'),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser positiva.'),
  unit: z.string().min(1, 'Unidade é obrigatória.'),
});

const formSchema = z.object({
  materials: z.array(materialSchema),
});

type MaterialFormValues = z.infer<typeof formSchema>;

const units = ['m²', 'm linear', 'unidade', 'chapa', 'litro', 'kg'];

export function FurnitureMaterialsModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
}: FurnitureMaterialsModalProps) {
  const { toast } = useToast();

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materials: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'materials',
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset({
        materials: furniture.materials || [],
      });
    }
  }, [isOpen, furniture, form]);

  const onSubmit = (data: MaterialFormValues) => {
    const updatedFurniture = {
      ...furniture,
      materials: data.materials.map(m => (m.id ? m : { ...m, id: generateId('mat') })),
    };
    onUpdate(updatedFurniture);
    toast({
      title: 'Lista de materiais atualizada!',
      description: `Os materiais para ${furniture.name} foram salvos.`,
    });
    onClose();
  };
  
  const handleAddNewMaterial = () => {
    append({ name: '', quantity: 1, unit: 'unidade' });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Lista de Materiais - {furniture.name}
          </DialogTitle>
          <DialogDescription>
            Adicione ou remova os materiais necessários para este móvel.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-4">
                {fields.length > 0 ? (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-end gap-2 p-3 rounded-lg bg-muted/50 border"
                    >
                      <FormField
                        control={form.control}
                        name={`materials.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormLabel>Material</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: MDF Branco 18mm" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`materials.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-24">
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
                        name={`materials.${index}.unit`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel>Unidade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unid." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive/80 hover:text-destructive h-10 w-10"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum material adicionado.
                  </p>
                )}
              </div>
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleAddNewMaterial}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Material
                </Button>
            </ScrollArea>
            
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Materiais</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
