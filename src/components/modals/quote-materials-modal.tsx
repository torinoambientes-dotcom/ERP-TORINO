'use client';
import { useState, useMemo, useEffect, useContext, useCallback } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
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


const materialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome do material é obrigatório.'),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser positiva.'),
  unit: z.string().min(1, 'Unidade é obrigatória.'),
  cost: z.coerce.number().optional(),
  markup: z.coerce.number().optional(),
  addedAt: z.string().optional(),
});

// Simplified schemas for quote context
const glassSchema = materialSchema.extend({
    width: z.coerce.number().optional(),
    height: z.coerce.number().optional(),
});

const profileDoorSchema = materialSchema.extend({
    width: z.coerce.number().optional(),
    height: z.coerce.number().optional(),
});


const formSchema = z.object({
  materials: z.array(materialSchema),
  glassItems: z.array(glassSchema),
  profileDoors: z.array(profileDoorSchema),
});

type MaterialFormValues = z.infer<typeof formSchema>;

const ItemRow = ({ index, control, remove, update, quoteMaterials, listName }: any) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const field = useWatch({
    control,
    name: `${listName}.${index}`
  });
  const isAreaBased = listName !== 'materials';

  return (
    <div className="p-3 rounded-lg border bg-muted/50">
        <div className="grid grid-cols-[1fr,80px,80px,80px,auto] items-end gap-2">
            {/* Name */}
            <Controller
                control={control}
                name={`${listName}.${index}`}
                render={({ field: controllerField }) => (
                <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !controllerField.value.name && "text-muted-foreground")}>
                            {controllerField.value.name || "Selecione ou digite"}
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                        <Command>
                        <CommandInput placeholder="Buscar na base ou digitar..." />
                        <CommandList>
                            <CommandEmpty>
                            <div className="p-2 cursor-pointer hover:bg-accent" onClick={() => {
                                const inputValue = (document.querySelector(`[cmdk-input]`) as HTMLInputElement).value;
                                update(index, {...field, name: inputValue, unit: isAreaBased ? 'm²' : 'un', cost: 0, markup: 2.5 });
                                setPopoverOpen(false);
                            }}>
                                Adicionar: "{ (document.querySelector(`[cmdk-input]`) as HTMLInputElement)?.value }"
                            </div>
                            </CommandEmpty>
                            <CommandGroup heading="Itens de Custo">
                            {quoteMaterials.map((item: QuoteMaterial) => (
                                <CommandItem key={item.id} value={item.name} onSelect={() => {
                                    update(index, {...field, name: item.name, unit: item.unit, cost: item.cost, markup: 2.5 });
                                    setPopoverOpen(false);
                                }}>
                                {item.name} (R$ {item.cost}/{item.unit})
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                        </Command>
                    </PopoverContent>
                    </Popover>
                </FormItem>
                )}
            />
            {/* Quantity */}
            <FormField control={control} name={`${listName}.${index}.quantity`} render={({ field: formField }) => ( <FormItem><FormLabel>Qtd.</FormLabel><FormControl><Input type="number" {...formField} /></FormControl></FormItem> )}/>
            {/* Cost */}
             <FormField control={control} name={`${listName}.${index}.cost`} render={({ field: formField }) => ( <FormItem><FormLabel>Custo Unit.</FormLabel><FormControl><Input type="number" {...formField} /></FormControl></FormItem> )}/>
            {/* Markup */}
            <FormField control={control} name={`${listName}.${index}.markup`} render={({ field: formField }) => ( <FormItem><FormLabel>Mark-up</FormLabel><FormControl><Input type="number" {...formField} /></FormControl></FormItem> )}/>
            {/* Actions */}
            <Button type="button" variant="ghost" size="icon" className="text-destructive/80 hover:text-destructive h-10 w-10 flex-shrink-0" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
        </div>
        {isAreaBased && (
             <div className="grid grid-cols-3 items-end gap-2 mt-2">
                 <FormField control={control} name={`${listName}.${index}.width`} render={({ field: formField }) => ( <FormItem><FormLabel className="text-xs">Largura (mm)</FormLabel><FormControl><Input type="number" {...formField} /></FormControl></FormItem> )}/>
                 <FormField control={control} name={`${listName}.${index}.height`} render={({ field: formField }) => ( <FormItem><FormLabel className="text-xs">Altura (mm)</FormLabel><FormControl><Input type="number" {...formField} /></FormControl></FormItem> )}/>
                 <FormItem><FormLabel className="text-xs">Unidade</FormLabel><Input value={field.unit} disabled /></FormItem>
             </div>
        )}
    </div>
  );
};


export function QuoteMaterialsModal({ isOpen, onClose, furniture, onUpdate }: QuoteMaterialsModalProps) {
  const { toast } = useToast();
  const { quoteMaterials } = useContext(AppContext);
  
  const [totalCost, setTotalCost] = useState(0);
  const [totalBudgetValue, setTotalBudgetValue] = useState(0);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { materials: [], glassItems: [], profileDoors: [] },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial, update: updateMaterial } = useFieldArray({ control: form.control, name: 'materials' });
  const { fields: glassFields, append: appendGlass, remove: removeGlass, update: updateGlass } = useFieldArray({ control: form.control, name: 'glassItems' });
  const { fields: profileDoorFields, append: appendProfileDoor, remove: removeProfileDoor, update: updateProfileDoor } = useFieldArray({ control: form.control, name: 'profileDoors' });
  
  const handleCalculate = useCallback((dataToCalc?: MaterialFormValues) => {
    const data = dataToCalc || form.getValues();
    let currentCost = 0;
    let currentBudget = 0;

    const calculateList = (list: any[]) => {
        list.forEach(item => {
            const quantity = Number(item.quantity) || 0;
            const cost = Number(item.cost) || 0;
            const markup = Number(item.markup) || 1;
            
            if (item.unit === 'm²' && item.width && item.height) {
                const area = (Number(item.width) / 1000) * (Number(item.height) / 1000);
                const totalArea = area * quantity;
                currentCost += totalArea * cost;
                currentBudget += totalArea * cost * markup;
            } else {
                currentCost += quantity * cost;
                currentBudget += quantity * cost * markup;
            }
        });
    };

    calculateList(data.materials || []);
    calculateList(data.glassItems || []);
    calculateList(data.profileDoors || []);

    setTotalCost(currentCost);
    setTotalBudgetValue(currentBudget);
  }, [form]);
  
  useEffect(() => {
    if (isOpen) {
      const initialData = {
        materials: furniture.materials || [],
        glassItems: (furniture.glassItems as any) || [],
        profileDoors: (furniture.profileDoors as any) || [],
      };
      form.reset(initialData);
      handleCalculate(initialData);
    }
  }, [isOpen, furniture, form, handleCalculate]);


  const onSubmit = () => {
    const data = form.getValues();
    const updatedFurniture: QuoteFurniture = {
      ...furniture,
      materials: data.materials,
      glassItems: data.glassItems,
      profileDoors: data.profileDoors,
    };
    onUpdate(updatedFurniture);
    toast({
      title: 'Lista de custos atualizada!',
      description: `Os custos para ${furniture.name} foram salvos.`,
    });
    onClose();
  };
  
  const createNewItem = (unit: string) => ({
      id: generateId('qmat'),
      name: '',
      quantity: 1,
      unit: unit,
      cost: 0,
      markup: 2.5,
      addedAt: new Date().toISOString(),
      ...(unit === 'm²' && { width: 0, height: 0 }),
  });


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
                  <h3 className="text-lg font-semibold mb-2">Portas de Perfil (por m²)</h3>
                  <div className="space-y-2">
                    {profileDoorFields.map((field, index) => <ItemRow key={field.id} index={index} control={form.control} remove={removeProfileDoor} update={updateProfileDoor} quoteMaterials={quoteMaterials} listName="profileDoors" /> )}
                  </div>
                   <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendProfileDoor(createNewItem('m²'))}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Porta</Button>
                </div>

                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vidraçaria (por m²)</h3>
                   <div className="space-y-2">
                    {glassFields.map((field, index) => <ItemRow key={field.id} index={index} control={form.control} remove={removeGlass} update={updateGlass} quoteMaterials={quoteMaterials} listName="glassItems" /> )}
                  </div>
                   <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendGlass(createNewItem('m²'))}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Vidro/Espelho</Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Materiais Gerais</h3>
                   <div className="space-y-4">
                    {materialFields.map((field, index) => <ItemRow key={field.id} index={index} control={form.control} remove={removeMaterial} update={updateMaterial} quoteMaterials={quoteMaterials} listName="materials" /> )}
                  </div>
                   <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendMaterial(createNewItem('un'))}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Material Geral</Button>
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
                <p className='text-lg font-semibold'>R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className='flex flex-col text-right'>
                <p className='text-sm text-muted-foreground'>Valor do Orçamento</p>
                <p className='text-xl font-bold text-primary'>R$ {totalBudgetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
