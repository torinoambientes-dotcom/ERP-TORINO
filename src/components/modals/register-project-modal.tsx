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
import type { Project, Furniture, Environment } from '@/lib/types';
import { generateId } from '@/lib/utils';

const furnitureSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome do móvel é obrigatório.'),
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
    environments: [{ name: '', furniture: [{ name: '' }] }],
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
          // No modo de edição, começa com campos vazios para adicionar novos ambientes/móveis.
          // Os existentes não são mostrados para manter a UI simples.
          environments: projectToEdit.environments,
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

              return existingFur ? existingFur : {
                id: generateId('fur'),
                name: fur.name,
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
      };
      
      updateProject(updatedProject);
      toast({
        title: 'Projeto atualizado!',
        description: `O projeto de "${data.clientName}" foi atualizado.`,
      });

    } else { // Modo de Criação
      addProject(data);
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
            {isEditMode ? `Edite o nome do cliente ou adicione novos ambientes e móveis ao projeto.` : "Preencha os dados para registrar um novo projeto."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <FurnitureArray control={form.control} envIndex={envIndex} isEditMode={isEditMode} />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendEnv({ name: '', furniture: [{ name: '' }] })
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


function FurnitureArray({ control, envIndex, isEditMode }: { control: any, envIndex: number, isEditMode: boolean }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `environments.${envIndex}.furniture`,
  });

  return (
    <div className="space-y-2">
      <FormLabel>Móveis</FormLabel>
      {fields.map((field, furIndex) => (
        <div key={field.id} className="flex items-center gap-2">
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
        onClick={() => append({ name: '' })}
        className="mt-2"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Adicionar Móvel
      </Button>
    </div>
  );
}
