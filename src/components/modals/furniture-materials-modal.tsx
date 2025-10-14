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
import type { Furniture, MaterialItem, GlassItem, ProfileDoorItem, StockItem } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { generateId, cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { PlusCircle, Trash2, Pencil, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProfileDoorCreatorModal } from './profile-door-creator-modal';
import { GlassCreatorModal } from './glass-creator-modal';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { AppContext } from '@/context/app-context';

interface FurnitureMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: Furniture;
  onUpdate: (updatedFurniture: Furniture) => void;
  clientName?: string;
}

const materialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome do material é obrigatório.'),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser positiva.'),
  unit: z.string().min(1, 'Unidade é obrigatória.'),
  stockItemId: z.string().optional(),
  addedAt: z.string().optional(),
  purchased: z.boolean().optional(),
  dispatches: z.array(z.object({
      quantity: z.number(),
      dispatchedAt: z.string(),
      memberId: z.string()
  })).optional(),
});

const glassSchema = z.object({
    id: z.string(),
    type: z.string().min(1, "Tipo de vidro é obrigatório."),
    quantity: z.coerce.number().min(1, "Quantidade deve ser pelo menos 1."),
    width: z.coerce.number().optional(),
    height: z.coerce.number().optional(),
    cornerRadiusTopLeft: z.coerce.number().optional(),
    cornerRadiusTopRight: z.coerce.number().optional(),
    cornerRadiusBottomLeft: z.coerce.number().optional(),
    cornerRadiusBottomRight: z.coerce.number().optional(),
    addedAt: z.string().optional(),
    purchased: z.boolean().optional(),
    shape: z.enum(['rectangle', 'circle']).optional(),
    diameter: z.coerce.number().min(1, "Diâmetro é obrigatório").optional(),
    hasFrostedStrips: z.boolean().optional(),
    frostedStripTop: z.coerce.number().optional(),
    frostedStripBottom: z.coerce.number().optional(),
    frostedStripLeft: z.coerce.number().optional(),
    frostedStripRight: z.coerce.number().optional(),
    frostedStripWidth: z.coerce.number().optional(),
    frostedStripCircularOffset: z.coerce.number().optional(),
    isBeveled: z.boolean().optional(),
});


const profileDoorSchema = z.object({
    id: z.string(),
    doorType: z.enum(['Giro', 'Correr', 'Escamoteavel', 'Frente de gaveta']).optional(),
    slidingSystem: z.string().optional(),
    profileColor: z.string().min(1, "Cor do perfil é obrigatória."),
    glassType: z.string().min(1, "Tipo de vidro é obrigatório."),
    handleType: z.string().min(1, "Tipo de puxador é obrigatória."),
    quantity: z.coerce.number().min(1, "Quantidade deve ser pelo menos 1."),
    width: z.coerce.number().min(1, "Largura é obrigatória."),
    height: z.coerce.number().min(1, "Altura é obrigatória."),
    hinges: z.array(z.object({ position: z.number() })).optional(),
    isPair: z.boolean().optional(),
    handlePosition: z.enum(['top', 'bottom', 'left', 'right']).optional(),
    handleWidth: z.coerce.number().optional(),
    handleOffset: z.coerce.number().optional(),
    addedAt: z.string().optional(),
    purchased: z.boolean().optional(),
    doorSet: z.object({
        count: z.number(),
        doors: z.array(z.object({ handlePosition: z.enum(['left', 'right', 'both', 'none']) }))
    }).optional()
});

const formSchema = z.object({
  materials: z.array(materialSchema),
  glassItems: z.array(glassSchema),
  profileDoors: z.array(profileDoorSchema),
});

type MaterialFormValues = z.infer<typeof formSchema>;

const MaterialRow = ({ index, control, field, remove, update, stockItems }: any) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const totalDispatched = (field.dispatches || []).reduce((acc: number, d: any) => acc + d.quantity, 0);
  const isFullyDispatched = field.stockItemId && totalDispatched >= field.quantity;
  const isPartiallyDispatched = field.stockItemId && totalDispatched > 0 && totalDispatched < field.quantity;
  const isPurchasedExternally = !field.stockItemId && field.purchased;

  const isLocked = isFullyDispatched || isPurchasedExternally;

  let labelText = "Material";
  let containerClasses = "bg-muted/50";
  let statusText = null;

  if (isFullyDispatched) {
      labelText = "Material (Despachado da Produção)";
      containerClasses = "bg-green-100/60 border-green-200";
      statusText = `Completo: ${totalDispatched}/${field.quantity} ${field.unit}`;
  } else if (isPartiallyDispatched) {
      labelText = "Material (Despacho Parcial)";
      containerClasses = "bg-yellow-100/60 border-yellow-300";
      statusText = `Pendente: ${field.quantity - totalDispatched} ${field.unit}`;
  } else if (isPurchasedExternally) {
      labelText = "Material (Comprado)";
      containerClasses = "bg-green-100/60 border-green-200";
  } else if (field.stockItemId) {
      labelText = "Item do Estoque (Reservado)";
      containerClasses = "bg-blue-100/60 border-blue-200";
  }

  return (
    <div className={cn("flex flex-col gap-2 p-3 rounded-lg border", containerClasses)}>
      <div className="flex items-end gap-2">
        <Controller
          control={control}
          name={`materials.${index}`}
          render={({ field: controllerField }) => (
            <FormItem className="flex-grow">
              <FormLabel className={cn(isLocked && 'text-muted-foreground')}>
                {labelText}
              </FormLabel>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isLocked}
                      className={cn(
                        "w-full justify-between",
                        !controllerField.value.name && "text-muted-foreground",
                        isLocked && "text-opacity-70 line-through",
                        field.stockItemId && !isLocked ? "bg-white/50" : ""
                      )}
                    >
                      {controllerField.value.name || "Selecione ou digite um material"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar no estoque ou digitar novo..." />
                    <CommandList>
                      <CommandEmpty>
                         <div className="p-2 cursor-pointer hover:bg-accent" onClick={() => {
                              const inputValue = (document.querySelector(`[cmdk-input]`) as HTMLInputElement).value;
                              update(index, {...field, name: inputValue, stockItemId: undefined, unit: 'unidade' });
                              setPopoverOpen(false);
                         }}>
                              Adicionar novo material: "{ (document.querySelector(`[cmdk-input]`) as HTMLInputElement)?.value }"
                         </div>
                      </CommandEmpty>
                      <CommandGroup heading="Itens do Estoque">
                        {stockItems.map((item: StockItem) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={() => {
                              update(index, {...field, name: item.name, stockItemId: item.id, unit: item.unit });
                              setPopoverOpen(false);
                            }}
                          >
                            {item.name}
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
            <FormItem className="w-24">
              <FormLabel className={cn(isLocked && 'text-muted-foreground')}>Qtd. Total</FormLabel>
              <FormControl>
                <Input type="number" {...formField} value={formField.value || 0} disabled={isLocked} className={cn(
                    isLocked && "text-opacity-70 line-through",
                    field.stockItemId && !isLocked ? "bg-white/50" : ""
                )} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`materials.${index}.unit`}
          render={({ field: formField }) => (
            <FormItem className="w-32">
              <FormLabel className={cn(isLocked && 'text-muted-foreground')}>Unidade</FormLabel>
              <FormControl>
                <Input placeholder="Unid." {...formField} value={formField.value || ''} disabled={!!field.stockItemId || isLocked} className={cn(
                    (isLocked || field.stockItemId) && "text-opacity-70 line-through",
                     field.stockItemId && !isLocked ? "bg-white/50" : ""
                )} />
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
          disabled={isLocked}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {statusText && (
          <p className={cn("text-xs font-medium pl-1", isFullyDispatched ? "text-green-700" : "text-yellow-700")}>{statusText}</p>
      )}
    </div>
  );
};


export function FurnitureMaterialsModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
  clientName
}: FurnitureMaterialsModalProps) {
  const { toast } = useToast();
  const { stockItems } = useContext(AppContext);
  
  const [isDoorCreatorOpen, setDoorCreatorOpen] = useState(false);
  const [doorToEdit, setDoorToEdit] = useState<ProfileDoorItem | null>(null);
  const [doorIndexToEdit, setDoorIndexToEdit] = useState<number | null>(null);

  const [isGlassCreatorOpen, setGlassCreatorOpen] = useState(false);
  const [glassToEdit, setGlassToEdit] = useState<GlassItem | null>(null);
  const [glassIndexToEdit, setGlassIndexToEdit] = useState<number | null>(null);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materials: [],
      glassItems: [],
      profileDoors: [],
    },
  });

  const purchaseTimestamp = useMemo(() => furniture.purchase?.completedAt, [furniture.purchase]);

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial, update: updateMaterial } = useFieldArray({
    control: form.control,
    name: 'materials',
  });
  
  const { fields: glassFields, append: appendGlass, remove: removeGlass, update: updateGlass } = useFieldArray({
    control: form.control,
    name: "glassItems",
  });
  
  const { fields: profileDoorFields, append: appendProfileDoor, remove: removeProfileDoor, update: updateProfileDoor } = useFieldArray({
    control: form.control,
    name: "profileDoors",
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        materials: furniture.materials || [],
        glassItems: furniture.glassItems || [],
        profileDoors: furniture.profileDoors || [],
      });
    }
  }, [isOpen, furniture, form]);


  const onSubmit = () => {
    const data = form.getValues();
    const updatedFurniture: Furniture = {
      ...furniture,
      materials: data.materials,
      glassItems: data.glassItems.map(g => g as GlassItem),
      profileDoors: data.profileDoors.map(p => p as ProfileDoorItem),
    };
    onUpdate(updatedFurniture);
    toast({
      title: 'Lista de materiais atualizada!',
      description: `Os materiais para ${furniture.name} foram salvos.`,
    });
    onClose();
  };
  
  const handleAddNewMaterial = () => {
    appendMaterial({ id: generateId('mat'), name: '', quantity: 1, unit: 'unidade', addedAt: new Date().toISOString(), purchased: false, dispatches: [] });
  };
  
  const handleSaveProfileDoor = (doorData: Omit<ProfileDoorItem, 'id' | 'purchased' | 'addedAt'>) => {
    if (doorIndexToEdit !== null) {
      const existingDoor = profileDoorFields[doorIndexToEdit];
      updateProfileDoor(doorIndexToEdit, { ...existingDoor, ...doorData });
      toast({ title: "Porta atualizada!" });
    } else {
      appendProfileDoor({
        ...doorData,
        id: generateId('pfd'),
        addedAt: new Date().toISOString(),
        purchased: false,
      } as ProfileDoorItem);
      toast({ title: "Porta adicionada!" });
    }
  };

  const handleOpenDoorEditor = (index: number | null) => {
    if (index !== null) {
      setDoorToEdit(profileDoorFields[index] as ProfileDoorItem);
      setDoorIndexToEdit(index);
    } else {
      setDoorToEdit(null);
      setDoorIndexToEdit(null);
    }
    setDoorCreatorOpen(true);
  };
  
  const handleCloseDoorEditor = () => {
    setDoorToEdit(null);
    setDoorIndexToEdit(null);
    setDoorCreatorOpen(false);
  }

  const handleSaveGlass = (glassData: Omit<GlassItem, 'id' | 'addedAt' | 'purchased'>) => {
      if (glassIndexToEdit !== null) {
          const existingGlass = glassFields[glassIndexToEdit];
          const updatedGlass = {
              id: existingGlass.id, // Keep original ID
              addedAt: existingGlass.addedAt, // Keep original add date
              purchased: existingGlass.purchased, // Keep original purchase status
              ...glassData, // All new data from the form
          };
          updateGlass(glassIndexToEdit, updatedGlass);
          toast({ title: "Vidro atualizado!" });
      } else {
          const newGlassData = {
              ...glassData,
              id: generateId('gla'),
              addedAt: new Date().toISOString(),
              purchased: false,
          };
          appendGlass(newGlassData as GlassItem);
          toast({ title: "Vidro adicionado!" });
      }
  };


  const handleOpenGlassEditor = (index: number | null) => {
    if (index !== null) {
      setGlassToEdit(glassFields[index] as GlassItem);
      setGlassIndexToEdit(index);
    } else {
      setGlassToEdit(null);
      setGlassIndexToEdit(null);
    }
    setGlassCreatorOpen(true);
  };
  
  const handleCloseGlassEditor = () => {
    setGlassToEdit(null);
    setGlassIndexToEdit(null);
    setGlassCreatorOpen(false);
  };

  const isOriginalItem = (itemAddedAt?: string) => {
      if (!purchaseTimestamp || !itemAddedAt) {
          return false;
      }
      return new Date(itemAddedAt) <= new Date(purchaseTimestamp);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Lista de Materiais - {furniture.name}
          </DialogTitle>
          <DialogDescription>
            Adicione ou remova os materiais e vidros necessários para este móvel.
          </DialogDescription>
        </DialogHeader>

        {purchaseTimestamp && (
            <Alert variant="default" className="bg-green-100 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 !text-green-800" />
                <AlertTitle>Compra Principal Finalizada</AlertTitle>
                <AlertDescription>
                    Os materiais originais foram marcados como comprados em {format(new Date(purchaseTimestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}. Você ainda pode adicionar novos itens se necessário.
                </AlertDescription>
            </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="flex-grow pr-4 -mr-4 pt-4">
              <div className="space-y-6">
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Portas de Perfil</h3>
                  <div className="space-y-2">
                    {profileDoorFields.length > 0 ? (
                      profileDoorFields.map((field, index) => {
                       const isPurchased = field.purchased || isOriginalItem(field.addedAt);
                       return (
                       <div key={field.id} className={cn("flex items-center justify-between rounded-lg border p-3 gap-2 text-sm", isPurchased ? "bg-green-100/60 border-green-200" : "bg-muted/50")}>
                          <div className={cn('flex-grow', isPurchased && 'line-through text-muted-foreground')}>
                            <p className="font-medium text-foreground">
                                {field.quantity}x Porta {field.profileColor} / Vidro {field.glassType}
                            </p>
                            <p>
                                {field.width}mm x {field.height}mm - Puxador: {field.handleType}
                            </p>
                          </div>
                         <div className='flex items-center'>
                            <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary h-9 w-9 flex-shrink-0"
                            onClick={() => handleOpenDoorEditor(index)}
                            disabled={isPurchased}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive/80 hover:text-destructive h-9 w-9 flex-shrink-0"
                            onClick={() => removeProfileDoor(index)}
                            disabled={isPurchased}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                         </div>
                       </div>
                       );
                    })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma porta de perfil adicionada.
                      </p>
                    )}
                  </div>
                  
                   <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleOpenDoorEditor(null)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Porta de Perfil
                    </Button>
                </div>

                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vidraçaria</h3>
                   <div className="space-y-2">
                    {glassFields.length > 0 ? (
                      glassFields.map((field, index) => {
                        const isPurchased = field.purchased || isOriginalItem(field.addedAt);
                        return (
                       <div key={field.id} className={cn("flex items-center justify-between rounded-lg border p-3 gap-2 text-sm", isPurchased ? "bg-green-100/60 border-green-200" : "bg-muted/50")}>
                          <div className={cn('flex-grow', isPurchased && 'line-through text-muted-foreground')}>
                            <p className="font-medium text-foreground">
                                {field.quantity}x {field.type} {field.shape === 'circle' ? '(Círculo)' : ''}
                            </p>
                            <p>
                                {field.shape === 'circle' ? `Ø ${field.diameter}mm` : `${field.width}mm x ${field.height}mm`}
                            </p>
                          </div>
                         <div className='flex items-center'>
                            <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary h-9 w-9 flex-shrink-0"
                            onClick={() => handleOpenGlassEditor(index)}
                            disabled={isPurchased}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive/80 hover:text-destructive h-9 w-9 flex-shrink-0"
                            onClick={() => removeGlass(index)}
                            disabled={isPurchased}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                         </div>
                       </div>
                        );
                    })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum item de vidraçaria adicionado.
                      </p>
                    )}
                  </div>
                  
                   <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleOpenGlassEditor(null)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Vidraçaria
                    </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Materiais Gerais</h3>
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
                            stockItems={stockItems}
                          />
                        )
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum material geral adicionado.
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
                      Adicionar Material Geral
                    </Button>
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    {isOpen && (
        <ProfileDoorCreatorModal
            isOpen={isDoorCreatorOpen}
            onClose={handleCloseDoorEditor}
            onSave={handleSaveProfileDoor}
            clientName={clientName}
            doorToEdit={doorToEdit}
            viewOnly={doorToEdit?.purchased || isOriginalItem(doorToEdit?.addedAt)}
        />
    )}
    {isOpen && (
      <GlassCreatorModal
        isOpen={isGlassCreatorOpen}
        onClose={handleCloseGlassEditor}
        onSave={handleSaveGlass}
        glassToEdit={glassToEdit}
        clientName={clientName}
        viewOnly={glassToEdit?.purchased || isOriginalItem(glassToEdit?.addedAt)}
      />
    )}
    </>
  );
}
