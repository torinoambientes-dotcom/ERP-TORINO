'use client';
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
import type { ProfileDoorItem } from '@/lib/types';

interface ProfileDoorCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (door: Omit<ProfileDoorItem, 'id'>) => void;
}

const doorCreatorSchema = z.object({
  profileColor: z.string().min(1, 'Cor do perfil é obrigatória.'),
  glassType: z.string().min(1, 'Tipo de vidro é obrigatório.'),
  handleType: z.string().min(1, 'Tipo de puxador é obrigatório.'),
  width: z.coerce.number().min(100, 'Largura mínima de 100mm'),
  height: z.coerce.number().min(300, 'Altura mínima de 300mm'),
  quantity: z.coerce.number().min(1, 'Quantidade mínima de 1.'),
});

type DoorCreatorFormValues = z.infer<typeof doorCreatorSchema>;

const profileColors = ['Preto', 'Aluminio', 'Inox'];
const glassTypes = ['Incolor', 'Fume', 'Bronze', 'Espelho Fume', 'Espelho Bronze', 'Espelho Prata', 'Reflecta Incolor', 'Reflecta Fume', 'Reflecta Prata'];
const handleTypes = ['Linear inteiro', 'Aba Usinada', 'Sem Puxador'];

export function ProfileDoorCreatorModal({ isOpen, onClose, onSave }: ProfileDoorCreatorModalProps) {
  const form = useForm<DoorCreatorFormValues>({
    resolver: zodResolver(doorCreatorSchema),
    defaultValues: {
      width: 800,
      height: 2100,
      quantity: 1,
      profileColor: profileColors[0],
      glassType: glassTypes[0],
      handleType: handleTypes[0],
    },
  });
  
  const onSubmit = (data: DoorCreatorFormValues) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Criador de Porta de Perfil</DialogTitle>
          <DialogDescription>
            Configure os detalhes da nova porta de perfil para adicioná-la aos materiais do móvel.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Largura (mm)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (mm)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profileColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor do Perfil</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {profileColors.map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="glassType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Vidro</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {glassTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="handleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Puxador</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {handleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Porta</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
