'use client';
import { useState, useMemo, useEffect, useContext } from 'react';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { QuoteFurniture, MaterialItem, QuoteMaterial } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { generateId, cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { PlusCircle, Trash2, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { AppContext } from '@/context/app-context';

interface QuoteMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: QuoteFurniture;
  onUpdate: (updatedFurniture: QuoteFurniture) => void;
  clientName?: string;
}

const materialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome do material é obrigatório.'),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser positiva.'),
  unit: z.string().min(1, 'Unidade é obrigatória.'),
  cost: z.coerce.number().optional(), // Custo por unidade
  markup: z.coerce.number().optional(), // Mark-up multiplier
  addedAt: z.string().optional(),
});


const formSchema = z.object({
  materials: z.array(materialSchema),
});

type MaterialFormValues = z.infer<typeof formSchema>;

const MaterialRow = ({ index, control, field, remove, update, quoteMaterials }: any) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="grid grid-cols-[1fr,80px,80px,80px,auto] items-end gap-2 p-3 rounded-lg border bg-muted/50">
      <Controller
        control={control}
        name={`materials.${index}`}
        render={({ field: controllerField }) => (
          <FormItem>
            <FormLabel>Material</FormLabel>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !controllerField.value.name && "text-muted-foreground"
                    )}
                  >
                    {controllerField.value.name || "Selecione ou digite um material"}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar na base de dados ou digitar novo..." />
                  <CommandList>
                    <CommandEmpty>
                       <div className="p-2 cursor-pointer hover:bg-accent" onClick={() => {
                            const inputValue = (document.querySelector(`[cmdk-input]`) as HTMLInputElement).value;
                            update(index, {...field, name: inputValue, unit: 'unidade', cost: 0, markup: 1 });
                            setPopoverOpen(false);
                       }}>
                            Adicionar novo material: "{ (document.querySelector(`[cmdk-input]`) as HTMLInputElement)?.value }"
                       </div>
                    </CommandEmpty>
                    <CommandGroup heading="Itens de Custo">
                      {quoteMaterials.map((item: QuoteMaterial) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            update(index, {...field, name: item.name, unit: item.unit, cost: item.cost, markup: 1 });
                            setPopoverOpen(false);
                          }}
                        >
                          {item.name} (R$ {item.cost}/{item.unit})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`materials.${index}.quantity`}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Qtd.</FormLabel>
            <FormControl>
              <Input type="number" {...formField} value={formField.value || 0} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`materials.${index}.cost`}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Custo Unit.</FormLabel>
            <FormControl>
              <Input type="number" {...formField} value={formField.value || 0} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={control}
        name={`materials.${index}.markup`}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>Mark-up</FormLabel>
            <FormControl>
              <Input type="number" {...formField} value={formField.value || 1} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive/80 hover:text-destructive h-10 w-10 flex-shrink-0"
        onClick={() => remove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};


export function QuoteMaterialsModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
  clientName
}: QuoteMaterialsModalProps) {
  const { toast } = useToast();
  const { quoteMaterials } = useContext(AppContext);
  
  const [totalCost, setTotalCost] = useState(0);
  const [totalBudgetValue, setTotalBudgetValue] = useState(0);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materials: [],
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial, update: updateMaterial } = useFieldArray({
    control: form.control,
    name: 'materials',
  });
  
  useEffect(() => {
    if (isOpen) {
      const initialMaterials = furniture.materials || [];
      form.reset({
        materials: initialMaterials,
      });
      handleCalculate(initialMaterials); // Calculate initial totals
    }
  }, [isOpen, furniture, form]);

  const handleCalculate = (materialsToCalc?: MaterialFormValues['materials']) => {
    const materials = materialsToCalc || form.getValues('materials');
    const { cost, budget } = (materials || []).reduce(
      (acc, material) => {
        const quantity = Number(material.quantity) || 0;
        const cost = Number(material.cost) || 0;
        const markup = Number(material.markup) || 1;

        acc.cost += quantity * cost;
        acc.budget += quantity * cost * markup;
        
        return acc;
      },
      { cost: 0, budget: 0 }
    );
    setTotalCost(cost);
    setTotalBudgetValue(budget);
  };

  const onSubmit = () => {
    const data = form.getValues();
    const updatedFurniture: QuoteFurniture = {
      ...furniture,
      materials: data.materials as MaterialItem[],
    };
    onUpdate(updatedFurniture);
    toast({
      title: 'Lista de materiais atualizada!',
      description: `Os materiais para ${furniture.name} foram salvos.`,
    });
    onClose();
  };
  
  const handleAddNewMaterial = () => {
    appendMaterial({
        id: generateId('mat'),
        name: '',
        quantity: 1,
        unit: 'unidade',
        cost: 0,
        markup: 1,
        addedAt: new Date().toISOString()
    });
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Custos de Material - {furniture.name}
          </DialogTitle>
          <DialogDescription>
            Adicione e edite os materiais e custos para este móvel no orçamento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="flex-grow pr-4 -mr-4 pt-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Materiais</h3>
                   <div className="space-y-4">
                    {materialFields.length > 0 ? (
                      materialFields.map((field, index) => (
                          <MaterialRow 
                            key={field.id}
                            index={index}
                            control={form.control}
                            field={field}
                            remove={removeMaterial}
                            update={updateMaterial}
                            quoteMaterials={quoteMaterials}
                          />
                        )
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
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
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="mt-4 pt-4 border-t items-center gap-4">
                <Button type="button" onClick={() => handleCalculate()} className="mr-auto bg-green-600 hover:bg-green-700 text-white">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular
                </Button>
              <div className='flex flex-col text-right'>
                <p className='text-sm text-muted-foreground'>Custo Total dos Materiais</p>
                <p className='text-lg font-semibold'>R$ {totalCost.toFixed(2)}</p>
              </div>
              <div className='flex flex-col text-right'>
                <p className='text-sm text-muted-foreground'>Valor do Orçamento</p>
                <p className='text-xl font-bold text-primary'>R$ {totalBudgetValue.toFixed(2)}</p>
              </div>
              
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
