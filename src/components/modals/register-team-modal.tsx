'use client';

import { useContext } from 'react';
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

const teamMemberSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida. Use o formato #RRGGBB.'),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

interface RegisterTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultColors = [
    '#3b82f6', '#16a34a', '#f97316', '#8b5cf6', 
    '#ef4444', '#eab308', '#ec4899', '#14b8a6'
];


export function RegisterTeamModal({ isOpen, onClose }: RegisterTeamModalProps) {
  const { addTeamMember } = useContext(AppContext);
  const { toast } = useToast();

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: '',
      color: '#3b82f6',
    },
  });

  const onSubmit = (data: TeamMemberFormValues) => {
    addTeamMember({
        ...data,
        id: `member-${Date.now()}`,
    });
    toast({
      title: 'Membro da equipe cadastrado!',
      description: `${data.name} foi adicionado(a) à equipe.`,
    });
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Cadastrar Membro da Equipe</DialogTitle>
          <DialogDescription>
            Adicione um novo membro e associe uma cor para fácil identificação.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor da Etiqueta</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                        <Input type="color" className="p-1 h-10 w-14" {...field} />
                        <div className="flex flex-wrap gap-2">
                            {defaultColors.map(color => (
                                <button type="button" key={color} onClick={() => form.setValue('color', color)} className="h-8 w-8 rounded-full border-2" style={{ backgroundColor: color, borderColor: field.value === color ? 'hsl(var(--primary))' : 'transparent' }}></button>
                            ))}
                        </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
