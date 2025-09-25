'use client';

import { useContext, useEffect } from 'react';
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
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import type { TeamMember } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';

const teamMemberSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  role: z.string().min(1, 'A função é obrigatória.'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida. Use o formato #RRGGBB.'),
  email: z.string().email('Formato de e-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  avatarUrl: z.string().url('URL do avatar inválida.').optional().or(z.literal('')),
});

const teamMemberEditSchema = teamMemberSchema.omit({ email: true, password: true });

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

interface RegisterTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: TeamMember | null;
}

const defaultColors = [
  '#3b82f6',
  '#16a34a',
  '#f97316',
  '#8b5cf6',
  '#ef4444',
  '#eab308',
  '#ec4899',
  '#14b8a6',
];

const roles = ['PCP', 'Marceneiro', 'Projetista', 'Administrativo'];

export function RegisterTeamModal({
  isOpen,
  onClose,
  memberToEdit,
}: RegisterTeamModalProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('RegisterTeamModal must be used within an AppProvider');
  }
  const { addTeamMember, updateTeamMember } = context;
  const { toast } = useToast();

  const isEditMode = !!memberToEdit;

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(isEditMode ? teamMemberEditSchema : teamMemberSchema),
    defaultValues: {
      name: '',
      role: roles[0],
      color: defaultColors[0],
      email: '',
      password: '',
      avatarUrl: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && memberToEdit) {
        form.reset({
          name: memberToEdit.name,
          role: memberToEdit.role,
          color: memberToEdit.color,
          email: memberToEdit.email,
          avatarUrl: memberToEdit.avatarUrl || '',
        });
      } else {
        form.reset({
          name: '',
          role: roles[0],
          color: defaultColors[0],
          email: '',
          password: '',
          avatarUrl: '',
        });
      }
    }
  }, [isOpen, isEditMode, memberToEdit, form]);

  const onSubmit = async (data: TeamMemberFormValues) => {
    if (isEditMode && memberToEdit) {
      // Logic for updating a team member (excluding email/password)
      const { email, password, ...updateData } = data;
      updateTeamMember({ ...memberToEdit, ...updateData });
      toast({
        title: 'Membro da equipe atualizado!',
        description: `Os dados de ${data.name} foram atualizados.`,
      });
    } else {
      // Logic for adding a new team member
      try {
        await addTeamMember(data);
        toast({
          title: 'Membro da equipe cadastrado!',
          description: `${data.name} foi adicionado(a) à equipe com sucesso.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao cadastrar membro',
          description: error.message || 'Não foi possível criar o novo membro da equipe.',
        });
        // Do not close modal on error
        return;
      }
    }
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {isEditMode ? 'Editar Membro' : 'Cadastrar Membro da Equipe'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Altere os dados de ${memberToEdit?.name}. O e-mail e senha não podem ser alterados aqui.`
              : 'Preencha os dados do membro e suas credenciais de acesso.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Membro</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Maria Souza" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor da Etiqueta</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        className="p-1 h-10 w-14"
                        {...field}
                      />
                      <div className="flex flex-wrap gap-2">
                        {defaultColors.map((color) => (
                          <button
                            type="button"
                            key={color}
                            onClick={() => form.setValue('color', color)}
                            className="h-8 w-8 rounded-full border-2"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                field.value === color
                                  ? 'hsl(var(--primary))'
                                  : 'transparent',
                            }}
                          ></button>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Avatar</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/avatar.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditMode && (
              <>
                <Separator />
                <h3 className="text-base font-medium">Credenciais de Acesso</h3>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail de Acesso</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@dominio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mínimo de 6 caracteres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
           
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
