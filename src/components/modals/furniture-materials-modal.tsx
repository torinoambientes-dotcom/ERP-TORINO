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
import type { Furniture, MaterialItem, GlassItem, ProfileDoorItem } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { generateId, cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProfileDoorCreatorModal } from './profile-door-creator-modal';

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

const glassSchema = z.object({
    id: z.string().optional(),
    type: z.string().min(1, "Tipo de vidro é obrigatório."),
    quantity: z.coerce.number().min(1, "Quantidade deve ser pelo menos 1."),
    width: z.coerce.number().min(1, "Largura é obrigatória."),
    height: z.coerce.number().min(1, "Altura é obrigatória."),
});

const profileDoorSchema = z.object({
    id: z.string().optional(),
    profileColor: z.string().min(1, "Cor do perfil é obrigatória."),
    glassType: z.string().min(1, "Tipo de vidro é obrigatório."),
    handleType: z.string().min(1, "Tipo de puxador é obrigatório."),
    quantity: z.coerce.number().min(1, "Quantidade deve ser pelo menos 1."),
    width: z.coerce.number().min(1, "Largura é obrigatória."),
    height: z.coerce.number().min(1, "Altura é obrigatória."),
});

const formSchema = z.object({
  materials: z.array(materialSchema),
  glassItems: z.array(glassSchema),
  profileDoors: z.array(profileDoorSchema),
});

type MaterialFormValues = z.infer<typeof formSchema>;

const units = ['m²', 'm linear', 'unidade', 'chapa', 'litro', 'kg'];
const glassTypes = ['Vidro Incolor', 'Espelho', 'Vidro Reflecta Incolor', 'Vidro Reflecta Bronze', 'Vidro Reflecta Fume'];
const profileColors = ['Preto', 'Aluminio', 'Inox'];
const profileGlassTypes = ['Incolor', 'Fume', 'Bronze', 'Espelho Fume', 'Espelho Bronze', 'Espelho Prata', 'Reflecta Incolor', 'Reflecta Fume', 'Reflecta Prata'];
const handleTypes = ['Linear inteiro', 'Aba Usinada', 'Sem Puxador'];


export function FurnitureMaterialsModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
}: FurnitureMaterialsModalProps) {
  const { toast } = useToast();
  const [isDoorCreatorOpen, setDoorCreatorOpen] = useState(false);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materials: [],
      glassItems: [],
      profileDoors: [],
    },
  });

  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control,
    name: 'materials',
  });
  
  const { fields: glassFields, append: appendGlass, remove: removeGlass } = useFieldArray({
    control: form.control,
    name: "glassItems",
  });
  
  const { fields: profileDoorFields, append: appendProfileDoor, remove: removeProfileDoor } = useFieldArray({
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

  const onSubmit = (data: MaterialFormValues) => {
    const updatedFurniture: Furniture = {
      ...furniture,
      materials: data.materials.map(m => (m.id ? m : { ...m, id: generateId('mat') })),
      glassItems: data.glassItems.map(g => (g.id ? g : { ...g, id: generateId('gla') })) as GlassItem[],
      profileDoors: data.profileDoors.map(p => (p.id ? p : { ...p, id: generateId('pfd') })) as ProfileDoorItem[],
    };
    onUpdate(updatedFurniture);
    toast({
      title: 'Lista de materiais atualizada!',
      description: `Os materiais para ${furniture.name} foram salvos.`,
    });
    onClose();
  };
  
  const handleAddNewMaterial = () => {
    appendMaterial({ name: '', quantity: 1, unit: 'unidade' });
  };
  
  const handleAddNewGlass = () => {
    appendGlass({ type: glassTypes[0], quantity: 1, width: 0, height: 0 });
  };
  
  const handleAddProfileDoor = (newDoor: Omit<ProfileDoorItem, 'id'>) => {
    appendProfileDoor({
      ...newDoor,
    });
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-6">
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Portas de Perfil</h3>
                  <div className="space-y-2">
                    {profileDoorFields.length > 0 ? (
                      profileDoorFields.map((field, index) => (
                       <div key={field.id} className="flex items-center justify-between rounded-lg border p-3 gap-2 bg-muted/50 text-sm">
                          <div>
                            <p className="font-medium">
                                {field.quantity}x Porta {field.profileColor} / Vidro {field.glassType}
                            </p>
                            <p className="text-muted-foreground">
                                {field.width}mm x {field.height}mm - Puxador: {field.handleType}
                            </p>
                          </div>
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive/80 hover:text-destructive h-9 w-9 flex-shrink-0"
                          onClick={() => removeProfileDoor(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                       </div>
                    ))
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
                      onClick={() => setDoorCreatorOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Porta de Perfil
                    </Button>
                </div>

                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vidraçaria</h3>
                  <div className="space-y-4">
                    {glassFields.map((field, index) => (
                       <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 p-3 rounded-lg bg-muted/50 border"
                      >
                         <FormField
                          control={form.control}
                          name={`glassItems.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Vidro</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {glassTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`glassItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormLabel>Qtd.</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`glassItems.${index}.width`}
                          render={({ field }) => (
                            <FormItem className="w-24">
                              <FormLabel>Largura (mm)</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`glassItems.${index}.height`}
                          render={({ field }) => (
                            <FormItem className="w-24">
                              <FormLabel>Altura (mm)</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive/80 hover:text-destructive h-10 w-10"
                          onClick={() => removeGlass(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                       </div>
                    ))}
                  </div>
                   <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={handleAddNewGlass}
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
                            onClick={() => removeMaterial(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Materiais</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    {isOpen && (
        <ProfileDoorCreatorModal
            isOpen={isDoorCreatorOpen}
            onClose={() => setDoorCreatorOpen(false)}
            onSave={handleAddProfileDoor}
        />
    )}
    </>
  );
}
