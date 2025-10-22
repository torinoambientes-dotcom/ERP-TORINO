'use client';
import { useContext, useEffect, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import type { PurchaseRequest } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const requestSchema = z.object({
  description: z.string().min(3, 'A descrição é obrigatória.'),
  quantity: z.coerce.number().min(0.1, 'A quantidade deve ser positiva.'),
  unit: z.string().min(1, 'A unidade é obrigatória.'),
  reason: z.string().min(3, 'O motivo é obrigatório.'),
  projectId: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface NewPurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestToEdit?: PurchaseRequest | null;
}

export function NewPurchaseRequestModal({
  isOpen,
  onClose,
  requestToEdit,
}: NewPurchaseRequestModalProps) {
  const { addPurchaseRequest, updatePurchaseRequest, teamMembers, projects } = useContext(AppContext);
  const { toast } = useToast();
  const { user } = useUser();

  const isEditMode = !!requestToEdit;

  const activeProjects = useMemo(() => {
    return projects.filter(p => !p.completedAt).sort((a,b) => a.clientName.localeCompare(b.clientName));
  }, [projects]);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      description: '',
      quantity: 1,
      unit: 'un',
      reason: '',
      projectId: 'none',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && requestToEdit) {
        form.reset({
            description: requestToEdit.description,
            quantity: requestToEdit.quantity,
            unit: requestToEdit.unit,
            reason: requestToEdit.reason,
            projectId: requestToEdit.projectId || 'none',
        });
      } else {
        form.reset({
          description: '',
          quantity: 1,
          unit: 'un',
          reason: '',
          projectId: 'none',
        });
      }
    }
  }, [isOpen, isEditMode, requestToEdit, form]);

  const onSubmit = (data: RequestFormValues) => {
    const isProjectSelected = data.projectId && data.projectId !== 'none';
    const selectedProject = isProjectSelected ? projects.find(p => p.id === data.projectId) : null;
    
    let finalData: Partial<Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requesterId' | 'requesterName'>> = {
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        reason: data.reason,
    };

    if (isProjectSelected && selectedProject) {
        finalData.projectId = selectedProject.id;
        finalData.projectName = selectedProject.clientName;
    }

    if (isEditMode && requestToEdit) {
        // Build the update object carefully
        const updatePayload: Partial<PurchaseRequest> = {
            ...finalData
        };
        
        if (!isProjectSelected) {
          updatePayload.projectId = undefined;
          updatePayload.projectName = undefined;
        }

        updatePurchaseRequest({
            ...requestToEdit,
            ...updatePayload,
        });

        toast({
            title: "Solicitação Atualizada!",
            description: "A solicitação de compra foi atualizada com sucesso."
        });
    } else {
        const requester = teamMembers.find(m => m.id === user?.uid);
        if (!requester) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Usuário solicitante não encontrado.' });
            return;
        }
        addPurchaseRequest({
            ...(finalData as any),
            requesterId: requester.id,
            requesterName: requester.name,
        });
        toast({
            title: 'Solicitação Enviada!',
            description: 'Sua solicitação de compra foi enviada para aprovação.'
        });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {isEditMode ? 'Editar Solicitação' : 'Nova Solicitação de Compra'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Edite os detalhes da sua solicitação.' : 'Descreva o item que você precisa que seja comprado.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Item</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Serra de bancada, Broca 6mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <FormControl>
                            <Input placeholder="un, cx, pç" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Solicitação</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Ferramenta antiga quebrou, Reposição de material de escritório" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vincular ao Projeto (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um projeto..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">Nenhum projeto</SelectItem>
                            {activeProjects.map(project => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.clientName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditMode ? 'Salvar Alterações' : 'Enviar Solicitação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
