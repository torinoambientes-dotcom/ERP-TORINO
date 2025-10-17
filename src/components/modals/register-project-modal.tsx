'use client';
import { useContext, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';

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
import type { Project, Furniture, Environment } from '@/lib/types';
import { generateId, cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const furnitureSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome do móvel é obrigatório.'),
  productionTime: z.coerce.number().optional(),
});

const environmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome do ambiente é obrigatório.'),
  furniture: z.array(furnitureSchema).min(1, 'Adicione ao menos um móvel.'),
});

const projectSchema = z.object({
  clientName: z.string().min(1, 'Nome do cliente é obrigatório.'),
  environments: z
    .array(environmentSchema)
    .min(1, 'Adicione ao menos um ambiente.'),
  deliveryDeadline: z.date().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface RegisterProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
}

export function RegisterProjectModal({
  isOpen,
  onClose,
  projectToEdit,
}: RegisterProjectModalProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('RegisterProjectModal must be used within an AppProvider');
  }
  const { addProject, updateProject } = context;
  const { toast } = useToast();
  
  const isEditMode = !!projectToEdit;

  const defaultValues: ProjectFormValues = {
    clientName: '',
    environments: [{ name: '', furniture: [{ name: '', productionTime: 0 }] }],
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultValues,
  });

  const {
    fields: envFields,
    append: appendEnv,
    remove: removeEnv,
  } = useFieldArray({
    control: form.control,
    name: 'environments',
  });
  
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && projectToEdit) {
        form.reset({
          clientName: projectToEdit.clientName,
          environments: projectToEdit.environments.map(env => ({
            ...env,
            furniture: env.furniture.map(fur => ({
              ...fur,
              productionTime: fur.productionTime || 0,
            }))
          })),
          deliveryDeadline: projectToEdit.deliveryDeadline ? new Date(projectToEdit.deliveryDeadline) : undefined,
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [isOpen, isEditMode, projectToEdit, form]);


  const onSubmit = (data: ProjectFormValues) => {
    if (isEditMode && projectToEdit) {
      // Filtra ambientes e móveis vazios antes de submeter
      const updatedEnvironments: Environment[] = data.environments
        .filter(env => env.name.trim() !== '' && env.furniture.some(fur => fur.name.trim() !== ''))
        .map(env => ({
          id: env.id || generateId('env'),
          name: env.name,
          furniture: env.furniture
            .filter(fur => fur.name.trim() !== '')
            .map(fur => {
              const existingFur = projectToEdit.environments
                .flatMap(e => e.furniture)
                .find(f => f.id === (fur as any).id);

              return existingFur ? { ...existingFur, name: fur.name, productionTime: fur.productionTime || 0 } : {
                id: generateId('fur'),
                name: fur.name,
                productionTime: fur.productionTime || 0,
                measurement: { status: 'todo' as const, priority: 'medium' },
                cutting: { status: 'todo' as const, priority: 'medium' },
                purchase: { status: 'todo' as const, priority: 'medium' },
                assembly: { status: 'todo' as const, priority: 'medium' },
                comments: [],
                pendencies: [],
                materials: [],
                glassItems: [],
                profileDoors: [],
              };
            })
        }));
      
      const updatedProject: Project = {
        ...projectToEdit,
        clientName: data.clientName,
        environments: updatedEnvironments,
        deliveryDeadline: data.deliveryDeadline?.toISOString(),
      };
      
      updateProject(updatedProject);
      toast({
        title: 'Projeto atualizado!',
        description: `O projeto de "${data.clientName}" foi atualizado.`,
      });

    } else { // Modo de Criação
      const projectDataWithDeadline = {
        ...data,
        deliveryDeadline: data.deliveryDeadline?.toISOString(),
      };
      addProject(projectDataWithDeadline);
      toast({
          title: 'Projeto cadastrado!',
          description: `O projeto para "${data.clientName}" foi criado com sucesso.`,
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? "Editar Projeto" : "Cadastrar Novo Projeto"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Edite os dados do projeto.` : "Preencha os dados para registrar um novo projeto."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                name="deliveryDeadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Prazo de Entrega</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            {field.value
                                ? format(field.value, "PPP", { locale: ptBR })
                                : 'Escolha uma data'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date('1900-01-01')}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2 font-headline">{isEditMode ? "Editar Ambientes" : "Ambientes"}</h3>
              {envFields.map((envField, envIndex) => (
                <div key={envField.id} className="p-4 border rounded-lg mb-4 space-y-4 bg-muted/50 relative">
                   <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnv(envIndex)}
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  <FormField
                    control={form.control}
                    name={`environments.${envIndex}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Ambiente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Cozinha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FurnitureArray control={form.control} envIndex={envIndex} />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendEnv({ name: '', furniture: [{ name: '', productionTime: 0 }] })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Ambiente
              </Button>
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


function FurnitureArray({ control, envIndex }: { control: any, envIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `environments.${envIndex}.furniture`,
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr,140px] gap-2 items-center">
        <FormLabel>Móveis</FormLabel>
        <FormLabel>Tempo de Produção (dias)</FormLabel>
      </div>
      {fields.map((field, furIndex) => (
        <div key={field.id} className="flex items-start gap-2">
          <FormField
            control={control}
            name={`environments.${envIndex}.furniture.${furIndex}.name`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Ex: Armário aéreo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`environments.${envIndex}.furniture.${furIndex}.productionTime`}
            render={({ field }) => (
              <FormItem className="w-[140px]">
                <FormControl>
                  <Input type="number" placeholder="Ex: 1.5" step="0.1" {...field} value={field.value || 0} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(furIndex)}
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ name: '', productionTime: 0 })}
        className="mt-2"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Adicionar Móvel
      </Button>
    </div>
  );
}
