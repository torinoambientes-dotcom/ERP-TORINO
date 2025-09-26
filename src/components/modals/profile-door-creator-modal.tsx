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
import { cn } from '@/lib/utils';
import { DoorOpen } from 'lucide-react';


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
const profileGlassTypes = ['Incolor', 'Fume', 'Bronze', 'Espelho Fume', 'Espelho Bronze', 'Espelho Prata', 'Reflecta Incolor', 'Reflecta Fume', 'Reflecta Prata'];
const handleTypes = ['Linear inteiro', 'Aba Usinada', 'Sem Puxador'];


export function ProfileDoorCreatorModal({ isOpen, onClose, onSave }: ProfileDoorCreatorModalProps) {
  const form = useForm<DoorCreatorFormValues>({
    resolver: zodResolver(doorCreatorSchema),
    defaultValues: {
      width: 400,
      height: 700,
      quantity: 1,
      profileColor: profileColors[0],
      glassType: profileGlassTypes[0],
      handleType: handleTypes[0],
    },
  });

  const onSubmit = (data: DoorCreatorFormValues) => {
    onSave(data as Omit<ProfileDoorItem, 'id'>);
    onClose();
  };

  const doorWidth = form.watch('width');
  const doorHeight = form.watch('height');
  const glassType = form.watch('glassType');
  const profileColor = form.watch('profileColor');

  const profileColorClass = {
    'Preto': 'border-gray-800',
    'Aluminio': 'border-gray-400',
    'Inox': 'border-gray-500'
  }[profileColor] || 'border-gray-400';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Criador de Porta de Perfil</DialogTitle>
          <DialogDescription>
            Configure os detalhes da nova porta para adicioná-la à lista de materiais do móvel.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow overflow-hidden">
            {/* Left Column: Form */}
            <div className="flex flex-col space-y-4 overflow-y-auto pr-4 -mr-4">
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
                        {profileGlassTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
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
            </div>

            {/* Right Column: Visualizer */}
            <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg relative h-full border">
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div
                    className={cn(
                        "relative bg-background/50 border-8 flex items-center justify-center transition-all duration-300",
                        profileColorClass
                    )}
                    style={{
                        aspectRatio: `${doorWidth} / ${doorHeight}`,
                        width: (doorWidth / doorHeight) > 1 ? '100%' : 'auto',
                        height: (doorWidth / doorHeight) <= 1 ? '100%' : 'auto',
                        maxHeight: '100%',
                        maxWidth: '100%',
                    }}
                    >
                    <div className='absolute inset-0 bg-gray-300/30 backdrop-blur-sm flex items-center justify-center'>
                        <span className="text-sm text-muted-foreground text-center p-2 break-all">{glassType}</span>
                    </div>

                    {/* Dimension lines */}
                    <div className="absolute -bottom-6 w-full flex justify-center items-center text-xs text-muted-foreground">
                        <span>{doorWidth || 0}mm</span>
                    </div>
                     <div className="absolute -right-12 h-full flex justify-center items-center text-xs text-muted-foreground" style={{ writingMode: 'vertical-rl' }}>
                        <span>{doorHeight || 0}mm</span>
                    </div>

                    </div>
                </div>
            </div>
            
            <DialogFooter className="md:col-span-2 mt-auto pt-6 border-t">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                <DoorOpen className="mr-2 h-4 w-4" />
                Adicionar Porta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
