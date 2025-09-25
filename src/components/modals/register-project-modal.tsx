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
import { generateId } from '@/lib/utils';
import type { Project } from '@/lib/types';

const furnitureSchema = z.object({
  name: z.string().min(1, 'Nome do móvel é obrigatório.'),
});

const environmentSchema = z.object({
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

const defaultValues: ProjectFormValues = {
  clientName: '',
  environments: [{ name: '', furniture: [{ name: '' }] }],
};

export function RegisterProjectModal({
  isOpen,
  onClose,
  projectToEdit
}: RegisterProjectModalProps) {
  const { addProject, updateProject } = useContext(AppContext);
  const { toast } = useToast();
  const isEditMode = !!projectToEdit;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (projectToEdit && isOpen) {
      form.reset(projectToEdit);
    } else if (!isOpen) {
      form.reset(defaultValues);
    }
  }, [projectToEdit, isOpen, form]);


  const {
    fields: envFields,
    append: appendEnv,
    remove: removeEnv,
  } = useFieldArray({
    control: form.control,
    name: 'environments',
  });

  const onSubmit = (data: ProjectFormValues) => {
    if (isEditMode && projectToEdit) {
        updateProject({
            ...projectToEdit,
            ...data
        });
         toast({
            title: 'Projeto atualizado!',
            description: `O projeto para "${data.clientName}" foi atualizado.`,
        });
    } else {
        addProject({
            ...data,
            id: generateId('proj'),
            environments: data.environments.map((env) => ({
                ...env,
                id: generateId('env'),
                furniture: env.furniture.map((fur) => ({
                ...fur,
                id: generateId('fur'),
                measurement: { status: 'todo' },
                cutting: { status: 'todo' },
                purchase: { status: 'todo' },
                assembly: { status: 'todo' },
                })),
            })),
        });
        toast({
            title: 'Projeto cadastrado!',
            description: `O projeto para "${data.clientName}" foi criado com sucesso.`,
        });
    }

    form.reset(defaultValues);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.reset(defaultValues);
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? 'Editar Projeto' : 'Cadastrar Novo Projeto'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Altere os dados do projeto abaixo.' : 'Preencha os dados para registrar um novo projeto.'}
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
              <h3 className="text-lg font-medium mb-2 font-headline">Ambientes</h3>
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
              <Button type="submit">Salvar Projeto</Button>
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
