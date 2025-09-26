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
  doorToEdit?: ProfileDoorItem | null;
  viewOnly?: boolean;
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

export function ProfileDoorCreatorModal({ isOpen, onClose, onSave, clientName, doorToEdit, viewOnly = false }: ProfileDoorCreatorModalProps) {
  const isEditMode = !!doorToEdit;
  
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

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && doorToEdit) {
        form.reset({
          ...doorToEdit,
          doorType: doorToEdit.doorType || 'Giro',
          handlePosition: doorToEdit.handlePosition || 'left',
          handleType: doorToEdit.handleType || 'Sem Puxador',
        });
      } else {
        form.reset({
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
        });
      }
    }
  }, [isOpen, isEditMode, doorToEdit, form]);

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
    if (viewOnly) return;
    onSave(data as Omit<ProfileDoorItem, 'id'>);
    onClose();
  };

  const doorVisualizerRef = useRef(null);

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
    const doorData = form.getValues();
    const scale = 0.2; // Reduced scale
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    const profileWidthMM = 45;
    const hingeDiameterMM = 35;
    
    // --- Define Layout Areas ---
    const specsColumnWidth = 90;
    const drawingColumnX = margin + specsColumnWidth + 10;
    const drawingColumnWidth = pageWidth - drawingColumnX - margin;

    // --- Draw Door Function ---
    const drawDoor = (startX: number, startY: number, mirrored: boolean) => {
        const doorWidthPx = doorData.width * scale;
        const doorHeightPx = doorData.height * scale;
        const profileWidthPx = profileWidthMM * scale;

        doc.setDrawColor(0);
        // Outer border (represents the filled profile)
        doc.setFillColor(230, 230, 230); // Light gray for profile fill
        doc.rect(startX, startY, doorWidthPx, doorHeightPx, 'FD'); // Fill and draw
        
        // Inner border (glass)
        doc.setFillColor(255, 255, 255);
        doc.rect(startX + profileWidthPx, startY + profileWidthPx, doorWidthPx - (2 * profileWidthPx), doorHeightPx - (2 * profileWidthPx), 'FD');

        // Hinges in the drawing
        if (doorData.doorType === 'Giro' && doorData.hinges) {
            doc.setFillColor(255, 0, 0);
            doorData.hinges.forEach(hinge => {
                const hingeY = startY + doorHeightPx - (hinge.position * scale);
                const hingeCenterInProfilePx = (profileWidthMM / 2) * scale;
                const hingeX = mirrored
                    ? startX + doorWidthPx - hingeCenterInProfilePx
                    : startX + hingeCenterInProfilePx;
                doc.circle(hingeX, hingeY, (hingeDiameterMM / 2) * scale, 'F');
            });
        }

        // Handle in the drawing
        if (doorData.handleType !== 'Sem Puxador') {
            doc.setFillColor(255, 0, 0);
            const handleThicknessPx = 2; // Make it thicker in PDF
            let handleX = 0, handleY = 0, handleW = 0, handleH = 0;

            const position = mirrored ? {
                'left': 'right', 'right': 'left', 'top': 'top', 'bottom': 'bottom'
            }[doorData.handlePosition] : doorData.handlePosition;

            switch (position) {
                case 'top':
                case 'bottom':
                    handleH = handleThicknessPx;
                    handleY = position === 'top' ? startY : startY + doorHeightPx - handleH;
                    if (doorData.handleType === 'Linear inteiro') {
                        handleW = doorWidthPx;
                        handleX = startX;
                    } else { // Aba Usinada
                        handleW = doorData.handleWidth! * scale;
                        handleX = startX + (doorData.handleOffset! * scale);
                    }
                    break;
                case 'left':
                case 'right':
                    handleW = handleThicknessPx;
                    handleX = position === 'left' ? startX : startX + doorWidthPx - handleW;
                    if (doorData.handleType === 'Linear inteiro') {
                        handleH = doorHeightPx;
                        handleY = startY;
                    } else { // Aba Usinada
                        handleH = doorData.handleWidth! * scale;
                        handleY = startY + (doorData.handleOffset! * scale);
                    }
                    break;
            }
            doc.rect(handleX, handleY, handleW, handleH, 'F');
        }
    };
    
    // --- PDF Content ---
    doc.setFontSize(18);
    doc.text('Folha de Produção - Porta de Perfil', margin, 20);
    
    doc.setFontSize(12);
    let currentY = 30;
    const writeSpec = (text: string) => {
        doc.text(text, margin, currentY);
        currentY += 6;
    };
    
    writeSpec(`Cliente: ${clientName || 'N/A'}`);
    writeSpec(`Tipo: ${doorData.doorType}${doorData.doorType === 'Correr' && doorData.slidingSystem ? ` (${doorData.slidingSystem})` : ''}`);
    writeSpec(`Qtd: ${doorData.quantity}${doorData.isPair ? ' (par)' : ''}`);
    writeSpec(`Dimensões: ${doorData.width} x ${doorData.height} mm`);
    writeSpec(`Perfil: ${doorData.profileColor}`);
    writeSpec(`Vidro: ${doorData.glassType}`);
    writeSpec(`Puxador: ${doorData.handleType}`);

    if (doorData.handleType !== 'Sem Puxador') {
        const handlePosLabel = handlePositions[doorData.handlePosition];
        const mirrorPosLabel = doorData.isPair ? ` / ${handlePositions[{left: 'right', right: 'left', top: 'top', bottom: 'bottom'}[doorData.handlePosition]]}` : '';
        writeSpec(`Pos. Puxador: ${handlePosLabel}${mirrorPosLabel}`);
        
        if (doorData.handleType === 'Aba Usinada') {
            writeSpec(`Larg. Puxador: ${doorData.handleWidth}mm`);
            writeSpec(`Offset Puxador: ${doorData.handleOffset}mm`);
        }
    }

    if (doorData.doorType === 'Giro' && doorData.hinges && doorData.hinges.length > 0) {
        currentY += 4;
        writeSpec('Dobradiças (da base):');
        doc.setFontSize(11);
        doorData.hinges.forEach((hinge, index) => {
          doc.text(`- Furo ${index + 1}: ${hinge.position}mm`, margin + 5, currentY);
          currentY += 5;
        });
        doc.setFontSize(12);
    }

    // --- Drawing Logic ---
    const doorWidthInMM = doorData.width * scale;
    const doorHeightInMM = doorData.height * scale;
    const spacingInMM = 10;
    const totalDrawingWidth = doorWidthInMM * (doorData.isPair ? 2 : 1) + (doorData.isPair ? spacingInMM : 0);
    
    // Center the drawing vertically
    const drawingStartY = (pageHeight - doorHeightInMM) / 2;
    // Center the drawing horizontally within its designated column
    const drawingStartX = drawingColumnX + (drawingColumnWidth - totalDrawingWidth) / 2;
    
    if (doorData.isPair) {
        drawDoor(drawingStartX, drawingStartY, false);
        drawDoor(drawingStartX + doorWidthInMM + spacingInMM, drawingStartY, true);
    } else {
        drawDoor(drawingStartX, drawingStartY, false);
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
      {doorType === 'Giro' && hinges?.map((hinge, index) => {
        const hingeDiameter = 35;
        const style: React.CSSProperties = {
            bottom: `calc(${(hinge.position - (hingeDiameter/2)) / doorHeight * 100}%)`,
            width: `${hingeDiameter / doorWidth * 100}%`,
            aspectRatio: '1/1',
        };
        const hingeCenterInProfile = (PROFILE_WIDTH_MM / 2) - (hingeDiameter / 2);
        if (mirrored) {
            style.right = `calc(${hingeCenterInProfile / doorWidth * 100}%)`;
        } else {
            style.left = `calc(${hingeCenterInProfile / doorWidth * 100}%)`;
        }
        return <div key={index} className="absolute bg-red-500 rounded-full" style={style}></div>;
      })}
       <HandleVisualizer mirrored={mirrored} />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{viewOnly ? "Visualizar Porta de Perfil" : (isEditMode ? 'Editar Porta de Perfil' : 'Criador de Porta de Perfil')}</DialogTitle>
          <DialogDescription>
             {viewOnly ? "Visualize os detalhes da porta." : (isEditMode ? 'Edite os detalhes da porta.' : 'Configure os detalhes da nova porta para adicioná-la à lista de materiais do móvel.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow overflow-hidden">
            {/* Left Column: Form */}
            <fieldset disabled={viewOnly} className="flex flex-col space-y-4 overflow-y-auto pr-4 -mr-4">
              <FormField control={form.control} name="doorType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Porta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{doorTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>

              {doorType === 'Correr' && (
                  <FormField control={form.control} name="slidingSystem" render={({ field }) => ( <FormItem><FormLabel>Sistema de Correr</FormLabel><FormControl><Input placeholder="Ex: RO-65" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="width" render={({ field }) => ( <FormItem><FormLabel>Largura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>
              <div className="flex items-center gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} disabled={isPair || viewOnly} /></FormControl><FormMessage /></FormItem> )}/>
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
              <FormField control={form.control} name="handleType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Puxador</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{handleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
              
              {handleType !== 'Sem Puxador' && (
                <>
                    <FormField control={form.control} name="handlePosition" render={({ field }) => ( <FormItem><FormLabel>Posição do Puxador</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(handlePositions).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    
                    {handleType === 'Aba Usinada' && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="handleWidth" render={({ field }) => ( <FormItem><FormLabel>Largura Puxador (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="handleOffset" render={({ field }) => ( <FormItem><FormLabel>Dist. do Canto (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                    )}
                </>
              )}


              <Separator />

              {doorType === 'Giro' && (
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
              )}
            </fieldset>

            {/* Right Column: Visualizer */}
            <div ref={doorVisualizerRef} className="flex flex-col items-center justify-center bg-muted/30 rounded-lg relative h-full border p-4 gap-4">
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="flex w-full h-full items-center justify-center gap-2">
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
                    {doorData.doorType === 'Giro' && <p><strong>Dobradiças (da base):</strong> {hinges?.map(h => `${h.position}mm`).join(', ')}</p>}
                </div>
            </div>
            
            <DialogFooter className="md:col-span-2 mt-auto pt-6 border-t">
              <Button type="button" variant={viewOnly ? "default" : "ghost"} onClick={onClose}>
                {viewOnly ? "Fechar" : "Cancelar"}
              </Button>
              <Button type="button" variant="outline" onClick={generatePDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
              {!viewOnly && (
                 <Button type="submit">
                    <DoorOpen className="mr-2 h-4 w-4" />
                    {isEditMode ? 'Salvar Alterações' : 'Adicionar Porta'}
                 </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
