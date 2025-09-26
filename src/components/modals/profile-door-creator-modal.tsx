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
import { useRef, useEffect } from 'react';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

interface ProfileDoorCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (door: Omit<ProfileDoorItem, 'id'>) => void;
  clientName?: string;
}

const hingeSchema = z.object({
  position: z.coerce.number().min(0, "Posição não pode ser negativa.")
});

const doorTypes = ['Giro', 'Correr', 'Escamoteavel'] as const;

const doorCreatorSchema = z.object({
  doorType: z.enum(doorTypes).default(doorTypes[0]),
  slidingSystem: z.string().optional(),
  profileColor: z.string().min(1, 'Cor do perfil é obrigatória.'),
  glassType: z.string().min(1, 'Tipo de vidro é obrigatório.'),
  handleType: z.string().min(1, 'Tipo de puxador é obrigatório.'),
  width: z.coerce.number().min(100, 'Largura mínima de 100mm'),
  height: z.coerce.number().min(300, 'Altura mínima de 300mm'),
  quantity: z.coerce.number().min(1, 'Quantidade mínima de 1.'),
  hinges: z.array(hingeSchema).optional(),
  isPair: z.boolean().optional(),
  handlePosition: z.enum(['top', 'bottom', 'left', 'right']).default('left'),
  handleWidth: z.coerce.number().optional(),
  handleOffset: z.coerce.number().optional(),
});

type DoorCreatorFormValues = z.infer<typeof doorCreatorSchema>;

const handleTypes = ['Linear inteiro', 'Aba Usinada', 'Sem Puxador'];
const handlePositions = {
    top: 'Em cima',
    bottom: 'Em baixo',
    left: 'Esquerda',
    right: 'Direita',
};

export function ProfileDoorCreatorModal({ isOpen, onClose, onSave, clientName }: ProfileDoorCreatorModalProps) {
  const form = useForm<DoorCreatorFormValues>({
    resolver: zodResolver(doorCreatorSchema),
    defaultValues: {
      doorType: 'Giro',
      slidingSystem: '',
      width: 400,
      height: 700,
      quantity: 1,
      profileColor: 'Preto',
      glassType: 'Incolor',
      handleType: handleTypes[0],
      hinges: [{position: 100}, {position: 600}],
      isPair: false,
      handlePosition: 'left',
      handleWidth: 150,
      handleOffset: 50,
    },
  });

  const { fields: hingeFields, append: appendHinge, remove: removeHinge } = useFieldArray({
    control: form.control,
    name: 'hinges',
  });
  
  const isPair = form.watch('isPair');
  const handleType = form.watch('handleType');
  const doorData = form.watch();
  const doorType = form.watch('doorType');

  useEffect(() => {
    if (isPair) {
      form.setValue('quantity', 2);
    } else {
      if (form.getValues('quantity') === 2) {
          form.setValue('quantity', 1);
      }
    }
  }, [isPair, form]);

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
    let currentY = 30;
    doc.setFontSize(12);
    doc.text(`Cliente: ${clientName || 'N/A'}`, 10, currentY);
    
    currentY += 6;
    doc.text(`Tipo de Porta: ${doorData.doorType}`, 10, currentY);

    if (doorData.doorType === 'Correr' && doorData.slidingSystem) {
        currentY += 6;
        doc.text(`Sistema de Correr: ${doorData.slidingSystem}`, 10, currentY);
    }
    
    currentY += 6;
    doc.text(`Quantidade: ${doorData.quantity}${doorData.isPair ? ' (par)' : ''}`, 10, currentY);
    
    currentY += 6;
    doc.text(`Dimensões: ${doorData.width}mm x ${doorData.height}mm`, 10, currentY);
    
    currentY += 6;
    doc.text(`Cor do Perfil: ${doorData.profileColor}`, 10, currentY);
    
    currentY += 6;
    doc.text(`Tipo de Vidro: ${doorData.glassType}`, 10, currentY);
    
    currentY += 6;
    doc.text(`Tipo de Puxador: ${doorData.handleType}`, 10, currentY);

    if (doorData.handleType !== 'Sem Puxador') {
        currentY += 6;
        doc.text(`Posição do Puxador: ${handlePositions[doorData.handlePosition]}`, 10, currentY);
        if (doorData.handleType === 'Aba Usinada') {
            currentY += 6;
            doc.text(`Largura do Puxador: ${doorData.handleWidth}mm`, 10, currentY);
            currentY += 6;
            doc.text(`Distância do Canto: ${doorData.handleOffset}mm`, 10, currentY);
        }
    }

    // Dobradiças
    currentY += 10;
    doc.text('Dobradiças (a partir da base):', 10, currentY);
    doorData.hinges?.forEach((hinge, index) => {
      doc.text(`- Furo ${index + 1}: ${hinge.position}mm`, 15, (currentY + 6) + (index * 6));
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
    doc.setFillColor(255, 0, 0);
    doorData.hinges?.forEach(hinge => {
        const hingeY = doorY + doorHeightPx - (hinge.position * scale);
        doc.circle(doorX + (profileWidthPx / 2), hingeY, (35/2) * scale, 'F');
    });

    // Puxador no desenho
    if (doorData.handleType !== 'Sem Puxador') {
        doc.setFillColor(255, 0, 0);
        const handleThicknessPx = 4 * scale; 
        let handleX = 0, handleY = 0, handleW = 0, handleH = 0;

        switch (doorData.handlePosition) {
            case 'top':
                handleH = handleThicknessPx;
                handleY = doorY;
                if (doorData.handleType === 'Linear inteiro') {
                    handleW = doorWidthPx;
                    handleX = doorX;
                } else {
                    handleW = doorData.handleWidth! * scale;
                    handleX = doorX + (doorData.handleOffset! * scale);
                }
                break;
            case 'bottom':
                handleH = handleThicknessPx;
                handleY = doorY + doorHeightPx - handleThicknessPx;
                if (doorData.handleType === 'Linear inteiro') {
                    handleW = doorWidthPx;
                    handleX = doorX;
                } else {
                    handleW = doorData.handleWidth! * scale;
                    handleX = doorX + (doorData.handleOffset! * scale);
                }
                break;
            case 'left':
                handleW = handleThicknessPx;
                handleX = doorX;
                if (doorData.handleType === 'Linear inteiro') {
                    handleH = doorHeightPx;
                    handleY = doorY;
                } else {
                    handleH = doorData.handleWidth! * scale;
                    handleY = doorY + (doorData.handleOffset! * scale);
                }
                break;
            case 'right':
                handleW = handleThicknessPx;
                handleX = doorX + doorWidthPx - handleThicknessPx;
                if (doorData.handleType === 'Linear inteiro') {
                    handleH = doorHeightPx;
                    handleY = doorY;
                } else {
                    handleH = doorData.handleWidth! * scale;
                    handleY = doorY + (doorData.handleOffset! * scale);
                }
                break;
        }
        doc.rect(handleX, handleY, handleW, handleH, 'F');
    }

    doc.save(`Porta_${clientName || 'especificacao'}.pdf`);
  };

  const { width: doorWidth, height: doorHeight, hinges } = doorData;

  const profileColorClass = {
    'Preto': 'bg-gray-800',
    'Aluminio': 'bg-gray-400',
    'Inox': 'bg-gray-500'
  }[doorData.profileColor] || 'bg-gray-700';

  const PROFILE_WIDTH_MM = 45;

  const HandleVisualizer = ({ mirrored = false }) => {
    if (handleType === 'Sem Puxador') return null;

    const style: React.CSSProperties = {
        position: 'absolute',
        backgroundColor: 'red',
        fontWeight: 'bold',
    };

    const position = mirrored ? {
        'left': 'right',
        'right': 'left',
        'top': 'top',
        'bottom': 'bottom'
    }[doorData.handlePosition] : doorData.handlePosition;

    const handleThickness = 8;

    switch (position) {
        case 'top':
        case 'bottom':
            style.height = `${handleThickness}px`;
            if (handleType === 'Linear inteiro') {
                style.width = '100%';
                style.left = '0';
            } else { // Aba Usinada
                style.width = `${(doorData.handleWidth! / doorData.width) * 100}%`;
                style.left = `${(doorData.handleOffset! / doorData.width) * 100}%`;
            }
            if (position === 'top') style.top = '0'; else style.bottom = '0';
            break;
        case 'left':
        case 'right':
            style.width = `${handleThickness}px`;
            if (handleType === 'Linear inteiro') {
                style.height = '100%';
                style.top = '0';
            } else { // Aba Usinada
                style.height = `${(doorData.handleWidth! / doorData.height) * 100}%`;
                style.top = `${(doorData.handleOffset! / doorData.height) * 100}%`;
            }
            if (position === 'left') style.left = '0'; else style.right = '0';
            break;
    }

    return <div style={style}></div>;
};

  const DoorVisualizer = ({ mirrored = false }) => (
    <div
      className={cn("relative flex items-center justify-center transition-all duration-300", profileColorClass)}
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
      {hinges?.map((hinge, index) => {
        const hingeStyle: React.CSSProperties = {
            bottom: `calc(${(hinge.position - (35/2)) / doorHeight * 100}%)`,
            width: `${35 / doorWidth * 100}%`,
            aspectRatio: '1/1',
        };
        if (mirrored) {
            hingeStyle.right = `calc(${(PROFILE_WIDTH_MM / 2 - 35 / 2) / doorWidth * 100}%)`;
        } else {
            hingeStyle.left = `calc(${(PROFILE_WIDTH_MM / 2 - 35 / 2) / doorWidth * 100}%)`;
        }
        return <div key={index} className="absolute bg-red-500 rounded-full" style={hingeStyle}></div>;
      })}
       <HandleVisualizer mirrored={mirrored} />
    </div>
  );

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
              <FormField control={form.control} name="doorType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Porta</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{doorTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>

              {doorType === 'Correr' && (
                  <FormField control={form.control} name="slidingSystem" render={({ field }) => ( <FormItem><FormLabel>Sistema de Correr</FormLabel><FormControl><Input placeholder="Ex: RO-65" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="width" render={({ field }) => ( <FormItem><FormLabel>Largura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
              <div className="flex items-center gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} disabled={isPair} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField
                  control={form.control}
                  name="isPair"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-7">
                      <div className="flex items-center space-x-2">
                        <Switch id="is-pair-switch" checked={field.value} onCheckedChange={field.onChange} />
                        <Label htmlFor="is-pair-switch">Par de Portas</Label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField control={form.control} name="profileColor" render={({ field }) => ( <FormItem><FormLabel>Cor do Perfil</FormLabel><FormControl><Input placeholder="Ex: Preto" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              <FormField control={form.control} name="glassType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Vidro</FormLabel><FormControl><Input placeholder="Ex: Incolor" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              
              <Separator />

              <h4 className='font-medium'>Puxador</h4>
              <FormField control={form.control} name="handleType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Puxador</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{handleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
              
              {handleType !== 'Sem Puxador' && (
                <>
                    <FormField control={form.control} name="handlePosition" render={({ field }) => ( <FormItem><FormLabel>Posição do Puxador</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(handlePositions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    
                    {handleType === 'Aba Usinada' && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="handleWidth" render={({ field }) => ( <FormItem><FormLabel>Largura Puxador (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="handleOffset" render={({ field }) => ( <FormItem><FormLabel>Dist. do Canto (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                    )}
                </>
              )}


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
                    <div className="flex w-full h-full items-center justify-center gap-1">
                      <DoorVisualizer />
                      {isPair && <DoorVisualizer mirrored />}
                    </div>
                </div>
                <div className="w-full p-4 border rounded-lg bg-background text-sm">
                    <h4 className="font-bold mb-2">Especificações</h4>
                    <p><strong>Cliente:</strong> {clientName || "Não especificado"}</p>
                    <p><strong>Tipo:</strong> {doorData.doorType} {doorData.doorType === 'Correr' && doorData.slidingSystem ? `(${doorData.slidingSystem})` : ''}</p>
                    <p><strong>Dimensões:</strong> {doorWidth}mm x {doorHeight}mm</p>
                    <p><strong>Cor Perfil:</strong> {doorData.profileColor}</p>
                    <p><strong>Vidro:</strong> {doorData.glassType}</p>
                    <p><strong>Puxador:</strong> {doorData.handleType}
                        {doorData.handleType !== 'Sem Puxador' && ` - ${handlePositions[doorData.handlePosition]}`}
                    </p>
                     {doorData.handleType === 'Aba Usinada' && (
                        <p className="pl-4 text-xs">Largura: {doorData.handleWidth}mm, Dist. Canto: {doorData.handleOffset}mm</p>
                    )}
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
