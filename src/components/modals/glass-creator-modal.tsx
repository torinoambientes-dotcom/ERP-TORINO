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
import type { GlassItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Square, FileDown } from 'lucide-react';
import { useEffect } from 'react';

interface GlassCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (glass: Omit<GlassItem, 'id'>) => void;
  glassToEdit?: GlassItem | null;
  clientName?: string;
  viewOnly?: boolean;
}

const glassTypes = ['Vidro Incolor', 'Espelho', 'Vidro Reflecta Incolor', 'Vidro Reflecta Bronze', 'Vidro Reflecta Fume'];

const glassCreatorSchema = z.object({
  type: z.string().min(1, 'O tipo de vidro é obrigatório.'),
  width: z.coerce.number().min(1, 'Largura mínima de 1mm.'),
  height: z.coerce.number().min(1, 'Altura mínima de 1mm.'),
  quantity: z.coerce.number().min(1, 'A quantidade mínima é 1.'),
  cornerRadius: z.coerce.number().min(0, 'O raio não pode ser negativo.').optional(),
});

type GlassCreatorFormValues = z.infer<typeof glassCreatorSchema>;

export function GlassCreatorModal({ isOpen, onClose, onSave, glassToEdit, clientName, viewOnly = false }: GlassCreatorModalProps) {
  const isEditMode = !!glassToEdit;
  
  const form = useForm<GlassCreatorFormValues>({
    resolver: zodResolver(glassCreatorSchema),
    defaultValues: {
      type: glassTypes[0],
      width: 500,
      height: 700,
      quantity: 1,
      cornerRadius: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && glassToEdit) {
        form.reset(glassToEdit);
      } else {
        form.reset({
          type: glassTypes[0],
          width: 500,
          height: 700,
          quantity: 1,
          cornerRadius: 0,
        });
      }
    }
  }, [isOpen, isEditMode, glassToEdit, form]);

  const onSubmit = (data: GlassCreatorFormValues) => {
    if (viewOnly) return;
    onSave(data as Omit<GlassItem, 'id'>);
    onClose();
  };

  const glassData = form.watch();

  const GlassVisualizer = () => {
    const { width, height, cornerRadius, type } = glassData;

    const glassColorClass = type === 'Espelho' ? 'bg-gray-300' : 'bg-blue-200/50';
    const maxRadius = Math.min(width, height) / 2;
    const clampedRadius = Math.min(cornerRadius || 0, maxRadius);
    
    return (
      <div
        className={cn("relative flex items-center justify-center transition-all duration-300 border-2 border-gray-500", glassColorClass)}
        style={{
          aspectRatio: `${width} / ${height}`,
          width: (width / height) > 1 ? '100%' : 'auto',
          height: (width / height) <= 1 ? '100%' : 'auto',
          maxHeight: '100%',
          maxWidth: '100%',
          borderRadius: `${clampedRadius}px`, // This won't scale visually well, but it's a start
        }}
      >
        <span className="text-sm text-muted-foreground text-center p-2 break-all">{type}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{viewOnly ? "Visualizar Vidro / Espelho" : (isEditMode ? 'Editar Vidro / Espelho' : 'Criador de Vidro / Espelho')}</DialogTitle>
          <DialogDescription>
             {viewOnly ? "Visualize os detalhes do item." : (isEditMode ? 'Edite os detalhes do item.' : 'Configure os detalhes do novo item de vidraçaria.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow overflow-hidden">
            {/* Left Column: Form */}
            <fieldset disabled={viewOnly} className="flex flex-col space-y-4 overflow-y-auto pr-4 -mr-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Vidro / Espelho</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {glassTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="width" render={({ field }) => ( <FormItem><FormLabel>Largura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="cornerRadius" render={({ field }) => ( <FormItem><FormLabel>Raio do Canto (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
               </div>
            </fieldset>

            {/* Right Column: Visualizer */}
            <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg relative h-full border p-4 gap-4">
                <div className="w-full h-full flex items-center justify-center p-8">
                    <GlassVisualizer />
                </div>
                <div className="w-full p-4 border rounded-lg bg-background text-sm">
                    <h4 className="font-bold mb-2">Especificações</h4>
                    {clientName && <p><strong>Cliente:</strong> {clientName}</p>}
                    <p><strong>Tipo:</strong> {glassData.type}</p>
                    <p><strong>Dimensões:</strong> {glassData.width}mm x {glassData.height}mm</p>
                    <p><strong>Raio do Canto:</strong> {glassData.cornerRadius || 0}mm</p>
                    <p><strong>Quantidade:</strong> {glassData.quantity}</p>
                </div>
            </div>
            
            <DialogFooter className="md:col-span-2 mt-auto pt-6 border-t">
              <Button type="button" variant={viewOnly ? 'default' : 'ghost'} onClick={onClose}>
                {viewOnly ? "Fechar" : "Cancelar"}
              </Button>
              {!viewOnly && (
                 <Button type="submit">
                    <Square className="mr-2 h-4 w-4" />
                    {isEditMode ? 'Salvar Alterações' : 'Adicionar Item'}
                 </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
