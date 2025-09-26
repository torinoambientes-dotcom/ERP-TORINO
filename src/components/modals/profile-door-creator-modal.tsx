'use client';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { DoorOpen, FileDown, PlusCircle, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { useRef } from 'react';
import { Separator } from '../ui/separator';

interface ProfileDoorCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (door: Omit<ProfileDoorItem, 'id'>) => void;
  clientName?: string;
}

const hingeSchema = z.object({
  position: z.coerce.number().min(0, "Posição não pode ser negativa.")
});

const doorCreatorSchema = z.object({
  profileColor: z.string().min(1, 'Cor do perfil é obrigatória.'),
  glassType: z.string().min(1, 'Tipo de vidro é obrigatório.'),
  handleType: z.string().min(1, 'Tipo de puxador é obrigatório.'),
  width: z.coerce.number().min(100, 'Largura mínima de 100mm'),
  height: z.coerce.number().min(300, 'Altura mínima de 300mm'),
  quantity: z.coerce.number().min(1, 'Quantidade mínima de 1.'),
  hinges: z.array(hingeSchema).optional(),
});

type DoorCreatorFormValues = z.infer<typeof doorCreatorSchema>;

const profileColors = ['Preto', 'Aluminio', 'Inox'];
const profileGlassTypes = ['Incolor', 'Fume', 'Bronze', 'Espelho Fume', 'Espelho Bronze', 'Espelho Prata', 'Reflecta Incolor', 'Reflecta Fume', 'Reflecta Prata'];
const handleTypes = ['Linear inteiro', 'Aba Usinada', 'Sem Puxador'];


export function ProfileDoorCreatorModal({ isOpen, onClose, onSave, clientName }: ProfileDoorCreatorModalProps) {
  const form = useForm<DoorCreatorFormValues>({
    resolver: zodResolver(doorCreatorSchema),
    defaultValues: {
      width: 400,
      height: 700,
      quantity: 1,
      profileColor: profileColors[0],
      glassType: profileGlassTypes[0],
      handleType: handleTypes[0],
      hinges: [{position: 100}, {position: 600}]
    },
  });

  const { fields: hingeFields, append: appendHinge, remove: removeHinge } = useFieldArray({
    control: form.control,
    name: 'hinges',
  });

  const onSubmit = (data: DoorCreatorFormValues) => {
    onSave(data as Omit<ProfileDoorItem, 'id'>);
    onClose();
  };

  const doorVisualizerRef = useRef(null);

  const generatePDF = () => {
    const doc = new jsPDF();
    const doorData = form.getValues();
    const scale = 0.2; // Escala para desenhar
    const profileWidth = 45;
    
    // Título
    doc.setFontSize(18);
    doc.text('Folha de Produção - Porta de Perfil', 10, 20);

    // Especificações
    doc.setFontSize(12);
    doc.text(`Cliente: ${clientName || 'N/A'}`, 10, 30);
    doc.text(`Quantidade: ${doorData.quantity}`, 10, 36);
    doc.text(`Dimensões: ${doorData.width}mm x ${doorData.height}mm`, 10, 42);
    doc.text(`Cor do Perfil: ${doorData.profileColor}`, 10, 48);
    doc.text(`Tipo de Vidro: ${doorData.glassType}`, 10, 54);
    doc.text(`Tipo de Puxador: ${doorData.handleType}`, 10, 60);

    // Dobradiças
    doc.text('Dobradiças (a partir da base):', 10, 70);
    doorData.hinges?.forEach((hinge, index) => {
      doc.text(`- Furo ${index + 1}: ${hinge.position}mm`, 15, 76 + (index * 6));
    });

    // Desenho da porta
    const doorX = 110;
    const doorY = 30;
    const doorWidthPx = doorData.width * scale;
    const doorHeightPx = doorData.height * scale;
    const profileWidthPx = profileWidth * scale;

    doc.setDrawColor(0);
    // Borda externa
    doc.rect(doorX, doorY, doorWidthPx, doorHeightPx);
    // Borda interna (vidro)
    doc.rect(doorX + profileWidthPx, doorY + profileWidthPx, doorWidthPx - (2*profileWidthPx), doorHeightPx - (2*profileWidthPx));

    // Dobradiças no desenho
    doorData.hinges?.forEach(hinge => {
        const hingeY = doorY + doorHeightPx - (hinge.position * scale);
        doc.setFillColor(255, 0, 0);
        doc.circle(doorX + (profileWidthPx / 2), hingeY, (35/2) * scale, 'F');
    });

    doc.save(`Porta_${clientName || 'especificacao'}.pdf`);
  };

  const doorData = form.watch();
  const { width: doorWidth, height: doorHeight, hinges } = doorData;

  const profileColorClass = {
    'Preto': 'bg-gray-800',
    'Aluminio': 'bg-gray-400',
    'Inox': 'bg-gray-500'
  }[doorData.profileColor] || 'bg-gray-700';

  const PROFILE_WIDTH_MM = 45;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] flex flex-col">
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
                <FormField control={form.control} name="width" render={({ field }) => ( <FormItem><FormLabel>Largura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
              <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="profileColor" render={({ field }) => ( <FormItem><FormLabel>Cor do Perfil</FormLabel><FormControl><Input placeholder="Ex: Preto" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="glassType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Vidro</FormLabel><FormControl><Input placeholder="Ex: Incolor" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="handleType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Puxador</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{handleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
              
              <Separator />

              <div>
                <FormLabel>Dobradiças (distância da base em mm)</FormLabel>
                <div className='space-y-2 mt-2'>
                  {hingeFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <FormField control={form.control} name={`hinges.${index}.position`} render={({ field }) => ( <FormItem className="flex-1"><FormControl><Input type="number" placeholder={`Altura furo ${index + 1}`} {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeHinge(index)} className="text-destructive h-9 w-9"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendHinge({ position: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Dobradiça</Button>
                </div>
              </div>
            </div>

            {/* Right Column: Visualizer */}
            <div ref={doorVisualizerRef} className="flex flex-col items-center justify-center bg-muted/30 rounded-lg relative h-full border p-4 gap-4">
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div
                      className={cn("relative bg-transparent flex items-center justify-center transition-all duration-300", profileColorClass)}
                      style={{
                        aspectRatio: `${doorWidth} / ${doorHeight}`,
                        width: (doorWidth / doorHeight) > 1 ? '100%' : 'auto',
                        height: (doorWidth / doorHeight) <= 1 ? '100%' : 'auto',
                        maxHeight: '100%',
                        maxWidth: '100%',
                      }}
                    >
                      <div className='absolute inset-0 bg-gray-300/30 backdrop-blur-sm flex items-center justify-center' style={{ margin: `${(PROFILE_WIDTH_MM / doorWidth) * 100}%`}}>
                        <span className="text-sm text-muted-foreground text-center p-2 break-all">{doorData.glassType}</span>
                      </div>
                      {hinges?.map((hinge, index) => (
                          <div key={index} className="absolute bg-red-500 rounded-full" style={{
                              left: `calc(${(PROFILE_WIDTH_MM / 2 - 35 / 2) / doorWidth * 100}%)`,
                              bottom: `calc(${(hinge.position - (35/2)) / doorHeight * 100}%)`,
                              width: `${35 / doorWidth * 100}%`,
                              aspectRatio: '1/1',
                          }}></div>
                      ))}
                    </div>
                </div>
                <div className="w-full p-4 border rounded-lg bg-background text-sm">
                    <h4 className="font-bold mb-2">Especificações</h4>
                    <p><strong>Cliente:</strong> {clientName || "Não especificado"}</p>
                    <p><strong>Dimensões:</strong> {doorWidth}mm x {doorHeight}mm</p>
                    <p><strong>Cor Perfil:</strong> {doorData.profileColor}</p>
                    <p><strong>Vidro:</strong> {doorData.glassType}</p>
                    <p><strong>Puxador:</strong> {doorData.handleType}</p>
                    <p><strong>Dobradiças (da base):</strong> {hinges?.map(h => `${h.position}mm`).join(', ')}</p>
                </div>
            </div>
            
            <DialogFooter className="md:col-span-2 mt-auto pt-6 border-t">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" variant="outline" onClick={generatePDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Gerar PDF
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
