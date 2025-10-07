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
import type { ProfileDoorItem, DoorSetConfiguration } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DoorOpen, FileDown, PlusCircle, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { useRef, useEffect, useState } from 'react';
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

const doorSetSchema = z.object({
  handlePosition: z.enum(['left', 'right', 'both', 'none']).default('left'),
});

const doorTypes = ['Giro', 'Correr', 'Escamoteavel', 'Frente de gaveta'] as const;

const doorCreatorSchema = z.object({
  doorType: z.enum(doorTypes).default(doorTypes[0]),
  slidingSystem: z.string().optional(),
  profileColor: z.string().min(1, 'Cor do perfil é obrigatória.'),
  glassType: z.string().min(1, 'Tipo de vidro é obrigatório.'),
  handleType: z.string().min(1, 'Tipo de puxador é obrigatório.'),
  width: z.coerce.number().min(1, 'Largura deve ser positiva.'),
  height: z.coerce.number().min(1, 'Altura deve ser positiva.'),
  quantity: z.coerce.number().min(1, 'Quantidade mínima de 1.'),
  hinges: z.array(hingeSchema).optional(),
  isPair: z.boolean().optional(),
  handlePosition: z.enum(['top', 'bottom', 'left', 'right']).default('left'),
  handleWidth: z.coerce.number().optional(),
  handleOffset: z.coerce.number().optional(),
  doorSet: z.object({
    count: z.coerce.number().min(1).max(3).default(1),
    doors: z.array(doorSetSchema).optional(),
  }).optional(),
});

type DoorCreatorFormValues = z.infer<typeof doorCreatorSchema>;

const handleTypes = ['Linear inteiro', 'Aba Usinada', 'Sem Puxador'];
const handlePositions: Record<string, string> = {
    top: 'Em cima',
    bottom: 'Em baixo',
    left: 'Esquerda',
    right: 'Direita',
    both: 'Ambos os Lados',
    none: 'Nenhum',
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
      doorSet: {
        count: 1,
        doors: [{ handlePosition: 'left' }],
      }
    },
  });

  const { fields: hingeFields, append: appendHinge, remove: removeHinge } = useFieldArray({
    control: form.control,
    name: 'hinges',
  });

  const { fields: doorSetFields, replace: replaceDoorSet } = useFieldArray({
    control: form.control,
    name: 'doorSet.doors',
  });

  const doorType = form.watch('doorType');
  const doorSetCount = form.watch('doorSet.count');
  const doorData = form.watch();

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && doorToEdit) {
        form.reset({
          ...doorToEdit,
          doorType: doorToEdit.doorType || 'Giro',
          handlePosition: doorToEdit.handlePosition || 'left',
          handleType: doorToEdit.handleType || 'Sem Puxador',
          doorSet: doorToEdit.doorSet || { count: 1, doors: [{ handlePosition: 'left' }] }
        });
      } else {
        form.reset(); // Reset to default values
      }
    }
  }, [isOpen, isEditMode, doorToEdit, form]);
  
  useEffect(() => {
    const currentDoors = form.getValues('doorSet.doors') || [];
    const newDoors: DoorSetConfiguration[] = [];
    for (let i = 0; i < doorSetCount; i++) {
        newDoors.push(currentDoors[i] || { handlePosition: 'left' });
    }
    replaceDoorSet(newDoors);
  }, [doorSetCount, replaceDoorSet, form]);


  const isPair = form.watch('isPair');
  const handleType = form.watch('handleType');
  
  useEffect(() => {
    if (doorType === 'Giro' && isPair) {
      form.setValue('quantity', 2);
    } else if (doorType === 'Giro' && !isPair) {
      if (form.getValues('quantity') === 2) {
          form.setValue('quantity', 1);
      }
    }
  }, [isPair, form, doorType]);

  const onSubmit = (data: DoorCreatorFormValues) => {
    if (viewOnly) return;
    onSave(data as Omit<ProfileDoorItem, 'id'>);
    onClose();
  };

  const doorVisualizerRef = useRef(null);

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
    const data = form.getValues();
    const scale = 0.2; // Reduced scale
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    const profileWidthMM = 45;
    const hingeDiameterMM = 35;
    
    const specsColumnWidth = 90;
    const drawingColumnX = margin + specsColumnWidth + 10;
    const drawingColumnWidth = pageWidth - drawingColumnX - margin;

    const drawDoor = (startX: number, startY: number, mirrored: boolean, handlePos: 'left' | 'right' | 'top' | 'bottom' | 'both' | 'none') => {
        const doorWidthPx = data.width * scale;
        const doorHeightPx = data.height * scale;
        const profileWidthPx = profileWidthMM * scale;

        doc.setDrawColor(0);
        doc.setFillColor(230, 230, 230);
        doc.rect(startX, startY, doorWidthPx, doorHeightPx, 'FD');
        
        doc.setFillColor(255, 255, 255);
        doc.rect(startX + profileWidthPx, startY + profileWidthPx, doorWidthPx - (2 * profileWidthPx), doorHeightPx - (2 * profileWidthPx), 'FD');

        if (data.doorType === 'Giro' && data.hinges) {
            doc.setFillColor(255, 0, 0);
            data.hinges.forEach(hinge => {
                const hingeY = startY + doorHeightPx - (hinge.position * scale);
                const hingeCenterInProfilePx = (profileWidthMM / 2) * scale;
                const hingeX = mirrored
                    ? startX + doorWidthPx - hingeCenterInProfilePx
                    : startX + hingeCenterInProfilePx;
                doc.circle(hingeX, hingeY, (hingeDiameterMM / 2) * scale, 'F');
            });
        }

        if (data.handleType !== 'Sem Puxador' && handlePos !== 'none') {
            doc.setFillColor(255, 0, 0);
            const handleThicknessPx = 2;
            let handleX = 0, handleY = 0, handleW = 0, handleH = 0;
            
            const positionsToDraw = handlePos === 'both' ? ['left', 'right'] : [handlePos];

            positionsToDraw.forEach(position => {
                switch (position) {
                    case 'top': case 'bottom':
                        handleH = handleThicknessPx;
                        handleY = position === 'top' ? startY : startY + doorHeightPx - handleH;
                        if (data.handleType === 'Linear inteiro') {
                            handleW = doorWidthPx; handleX = startX;
                        } else {
                            handleW = data.handleWidth! * scale; handleX = startX + (data.handleOffset! * scale);
                        }
                        break;
                    case 'left': case 'right':
                        handleW = handleThicknessPx;
                        handleX = position === 'left' ? startX : startX + doorWidthPx - handleW;
                        if (data.handleType === 'Linear inteiro') {
                            handleH = doorHeightPx; handleY = startY;
                        } else {
                            handleH = data.handleWidth! * scale; handleY = startY + (data.handleOffset! * scale);
                        }
                        break;
                }
                doc.rect(handleX, handleY, handleW, handleH, 'F');
            });
        }
    };
    
    doc.setFontSize(18);
    doc.text('Folha de Produção - Porta de Perfil', margin, 20);
    
    doc.setFontSize(12);
    let currentY = 30;
    const writeSpec = (text: string) => { doc.text(text, margin, currentY); currentY += 6; };
    
    writeSpec(`Cliente: ${clientName || 'N/A'}`);
    writeSpec(`Tipo: ${data.doorType}${data.doorType === 'Correr' && data.slidingSystem ? ` (${data.slidingSystem})` : ''}`);
    writeSpec(`Qtd: ${data.quantity}${data.isPair ? ' (par)' : ''}`);
    if (data.doorType === 'Correr') writeSpec(`Conjunto: ${data.doorSet?.count} porta(s)`);
    writeSpec(`Dimensões por Porta: ${data.width} x ${data.height} mm`);
    writeSpec(`Perfil: ${data.profileColor}`);
    writeSpec(`Vidro: ${data.glassType}`);
    writeSpec(`Puxador: ${data.handleType}`);

    if (data.handleType !== 'Sem Puxador') {
        if(data.doorType === 'Correr' && data.doorSet?.doors) {
             data.doorSet.doors.forEach((door, index) => {
                writeSpec(`- Porta ${index+1} Puxador: ${handlePositions[door.handlePosition] || 'N/A'}`);
             });
        } else {
            const handlePosLabel = handlePositions[data.handlePosition];
            const mirrorPosLabel = data.isPair ? ` / ${handlePositions[{left: 'right', right: 'left', top: 'top', bottom: 'bottom'}[data.handlePosition]]}` : '';
            writeSpec(`Pos. Puxador: ${handlePosLabel}${mirrorPosLabel}`);
        }
        
        if (data.handleType === 'Aba Usinada') {
            writeSpec(`Larg. Puxador: ${data.handleWidth}mm`);
            writeSpec(`Offset Puxador: ${data.handleOffset}mm`);
        }
    }

    if (data.doorType === 'Giro' && data.hinges && data.hinges.length > 0) {
        currentY += 4;
        writeSpec('Dobradiças (da base):');
        doc.setFontSize(11);
        data.hinges.forEach((hinge, index) => { doc.text(`- Furo ${index + 1}: ${hinge.position}mm`, margin + 5, currentY); currentY += 5; });
        doc.setFontSize(12);
    }

    const doorWidthInMM = data.width * scale;
    const doorHeightInMM = data.height * scale;
    const spacingInMM = 10;
    
    let doorCount = 1;
    if(data.doorType === 'Correr') doorCount = data.doorSet?.count || 1;
    if(data.doorType === 'Giro' && data.isPair) doorCount = 2;

    const totalDrawingWidth = doorWidthInMM * doorCount + (spacingInMM * (doorCount - 1));
    
    const drawingStartY = (pageHeight - doorHeightInMM) / 2;
    const drawingStartX = drawingColumnX + (drawingColumnWidth - totalDrawingWidth) / 2;
    
    if (data.doorType === 'Correr' && data.doorSet?.doors) {
        for(let i=0; i < doorCount; i++) {
            const startX = drawingStartX + (i * (doorWidthInMM + spacingInMM));
            drawDoor(startX, drawingStartY, false, data.doorSet.doors[i]?.handlePosition || 'none');
        }
    } else if (data.doorType === 'Giro' && data.isPair) {
        drawDoor(drawingStartX, drawingStartY, false, data.handlePosition);
        drawDoor(drawingStartX + doorWidthInMM + spacingInMM, drawingStartY, true, data.handlePosition);
    } else {
        drawDoor(drawingStartX, drawingStartY, false, data.handlePosition);
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

  const HandleVisualizer = ({ mirrored = false, positionOverride }: { mirrored?: boolean, positionOverride?: 'left' | 'right' | 'top' | 'bottom' | 'both' | 'none' }) => {
    if (handleType === 'Sem Puxador') return null;

    const style: React.CSSProperties = { position: 'absolute', backgroundColor: 'red', fontWeight: 'bold' };

    let basePosition = positionOverride || doorData.handlePosition;
    if (doorType === 'Giro' && mirrored) {
        basePosition = { 'left': 'right', 'right': 'left', 'top': 'top', 'bottom': 'bottom' }[basePosition] as any;
    }
    
    const positionsToDraw = basePosition === 'both' ? ['left', 'right'] : [basePosition];
    if (positionsToDraw.includes('none')) return null;

    const handleThickness = 8;
    
    return (
      <>
        {positionsToDraw.map(pos => {
          const individualStyle: React.CSSProperties = { ...style };
          switch (pos) {
              case 'top': case 'bottom':
                  individualStyle.height = `${handleThickness}px`;
                  if (handleType === 'Linear inteiro') {
                      individualStyle.width = '100%'; individualStyle.left = '0';
                  } else {
                      individualStyle.width = `${(doorData.handleWidth! / doorData.width) * 100}%`;
                      individualStyle.left = `${(doorData.handleOffset! / doorData.width) * 100}%`;
                  }
                  if (pos === 'top') individualStyle.top = '0'; else individualStyle.bottom = '0';
                  break;
              case 'left': case 'right':
                  individualStyle.width = `${handleThickness}px`;
                  if (handleType === 'Linear inteiro') {
                      individualStyle.height = '100%'; individualStyle.top = '0';
                  } else {
                      individualStyle.height = `${(doorData.handleWidth! / doorData.height) * 100}%`;
                      individualStyle.top = `${(doorData.handleOffset! / doorData.height) * 100}%`;
                  }
                  if (pos === 'left') individualStyle.left = '0'; else individualStyle.right = '0';
                  break;
          }
          return <div key={pos} style={individualStyle}></div>
        })}
      </>
    );
};

  const VisualizerContainer = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
      if (containerRef.current) {
        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) { setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height, }); }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
      }
    }, []);

    const calculateDimensions = () => {
        const { width: rawContainerWidth, height: rawContainerHeight } = containerSize;
        if (!rawContainerWidth || !rawContainerHeight || !doorWidth || !doorHeight) return { width: 0, height: 0 };
        
        const containerWidth = rawContainerWidth; 
        const containerHeight = rawContainerHeight;
        
        let doorCount = 1;
        if(doorType === 'Correr') doorCount = doorSetCount;
        if(doorType === 'Giro' && isPair) doorCount = 2;
        
        const gap = 8;
        const totalGapWidth = (doorCount - 1) * gap;
        const totalAvailableWidth = containerWidth - totalGapWidth;
        const aspectRatio = doorWidth / doorHeight;
        
        let doorDisplayWidth, doorDisplayHeight;
        const potentialHeightFromWidth = (totalAvailableWidth / doorCount) / aspectRatio;
        
        if (potentialHeightFromWidth <= containerHeight) {
            doorDisplayHeight = potentialHeightFromWidth;
            doorDisplayWidth = totalAvailableWidth / doorCount;
        } else {
            doorDisplayHeight = containerHeight;
            doorDisplayWidth = doorDisplayHeight * aspectRatio;
        }
        return { width: doorDisplayWidth, height: doorDisplayHeight };
    };

    const doorDimensions = calculateDimensions();
    
    const DoorVisualizer = ({ mirrored = false, style, positionOverride }: { mirrored?: boolean, style?: React.CSSProperties, positionOverride?: 'left' | 'right' | 'top' | 'bottom' | 'both' | 'none' }) => {
      return (
        <div className={cn("relative flex items-center justify-center transition-all duration-300", profileColorClass)} style={style}>
          <div className='absolute inset-0 bg-gray-300/30 backdrop-blur-sm flex items-center justify-center' style={{ margin: `${(PROFILE_WIDTH_MM / Math.min(doorWidth, doorHeight)) * 50}%`}}>
            <span className="text-sm text-muted-foreground text-center p-2 break-all">{doorData.glassType}</span>
          </div>
          {doorType === 'Giro' && hinges?.map((hinge, index) => {
            const hingeDiameter = 35;
            const style: React.CSSProperties = { bottom: `calc(${(hinge.position - (hingeDiameter/2)) / doorHeight * 100}%)`, width: `${hingeDiameter / doorWidth * 100}%`, aspectRatio: '1/1' };
            const hingeCenterInProfile = (PROFILE_WIDTH_MM / 2) - (hingeDiameter / 2);
            if (mirrored) { style.right = `calc(${hingeCenterInProfile / doorWidth * 100}%)`; }
            else { style.left = `calc(${hingeCenterInProfile / doorWidth * 100}%)`; }
            return <div key={index} className="absolute bg-red-500 rounded-full" style={style}></div>;
          })}
          <HandleVisualizer mirrored={mirrored} positionOverride={positionOverride} />
        </div>
      );
    };

    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <div className="flex items-center justify-center gap-2" style={{ width: containerSize.width, height: containerSize.height }}>
            {doorType === 'Correr' && doorSetFields.map((field, index) => (
                <DoorVisualizer key={`${field.id}-${field.handlePosition}`} style={doorDimensions} positionOverride={field.handlePosition as any} />
            ))}
            {doorType === 'Giro' && <DoorVisualizer style={doorDimensions} />}
            {doorType === 'Giro' && isPair && <DoorVisualizer mirrored={true} style={doorDimensions} />}
            {doorType !== 'Correr' && doorType !== 'Giro' && <DoorVisualizer style={doorDimensions} positionOverride={doorData.handlePosition} />}
        </div>
      </div>
    );
  };

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex min-h-0 gap-8">
                  {/* Left Column: Form */}
                  <fieldset disabled={viewOnly} className="w-[450px] flex-shrink-0 space-y-4 overflow-y-auto pr-6">
                    <FormField control={form.control} name="doorType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Porta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{doorTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>

                    {doorType === 'Correr' && (
                        <FormField control={form.control} name="slidingSystem" render={({ field }) => ( <FormItem><FormLabel>Sistema de Correr</FormLabel><FormControl><Input placeholder="Ex: RO-65" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="width" render={({ field }) => ( <FormItem><FormLabel>Largura por Porta (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    
                    {doorType !== 'Correr' && (
                      <div className="flex items-center gap-4">
                        <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} disabled={doorType === 'Giro' && isPair} /></FormControl><FormMessage /></FormItem> )}/>
                        {doorType === 'Giro' && <FormField control={form.control} name="isPair" render={({ field }) => ( <FormItem className="flex flex-col pt-7"><div className="flex items-center space-x-2"><Switch id="is-pair-switch" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="is-pair-switch">Par de Portas</Label></div><FormMessage /></FormItem> )}/>}
                      </div>
                    )}
                    
                    {doorType === 'Correr' && (
                      <FormField
                        control={form.control}
                        name="doorSet.count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Portas no Conjunto</FormLabel>
                            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="1">1 Porta</SelectItem>
                                <SelectItem value="2">2 Portas (Par)</SelectItem>
                                <SelectItem value="3">3 Portas (Trio)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}


                    <FormField control={form.control} name="profileColor" render={({ field }) => ( <FormItem><FormLabel>Cor do Perfil</FormLabel><FormControl><Input placeholder="Ex: Preto" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="glassType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Vidro</FormLabel><FormControl><Input placeholder="Ex: Incolor" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    
                    <Separator />

                    <h4 className='font-medium'>Puxador</h4>
                    <FormField control={form.control} name="handleType" render={({ field }) => ( <FormItem><FormLabel>Tipo de Puxador</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{handleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    
                    {handleType !== 'Sem Puxador' && (
                      <>
                          {doorType !== 'Correr' ? (
                            <FormField control={form.control} name="handlePosition" render={({ field }) => ( <FormItem><FormLabel>Posição do Puxador</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(handlePositions).filter(([k]) => k !== 'both' && k !== 'none').map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                          ) : (
                            <div className='space-y-3 p-3 border rounded-md'>
                              <FormLabel>Configuração dos Puxadores</FormLabel>
                              {doorSetFields.map((field, index) => (
                                <FormField
                                  key={field.id}
                                  control={form.control}
                                  name={`doorSet.doors.${index}.handlePosition`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className='text-xs font-normal'>Porta {index + 1}</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                          <SelectItem value="left">Esquerda</SelectItem>
                                          <SelectItem value="right">Direita</SelectItem>
                                          {doorSetCount === 3 && index === 1 && <SelectItem value="both">Ambos os Lados</SelectItem>}
                                          <SelectItem value="none">Nenhum</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          )}
                          
                          {handleType === 'Aba Usinada' && doorType !== 'Correr' && (
                              <div className="grid grid-cols-2 gap-4">
                                  <FormField control={form.control} name="handleWidth" render={({ field }) => ( <FormItem><FormLabel>Largura Puxador (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem> )}/>
                                  <FormField control={form.control} name="handleOffset" render={({ field }) => ( <FormItem><FormLabel>Dist. do Canto (mm)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem> )}/>
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
                  <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-lg relative min-h-0 border p-4 gap-4">
                      <div className="w-full flex-1 flex items-center justify-center min-h-0">
                          <VisualizerContainer />
                      </div>
                      <div className="w-full p-4 border rounded-lg bg-background text-sm max-h-[200px] overflow-y-auto flex-shrink-0">
                          <h4 className="font-bold mb-2">Especificações</h4>
                          {clientName && <p><strong>Cliente:</strong> {clientName}</p>}
                          <p><strong>Tipo:</strong> {doorData.doorType} {doorData.doorType === 'Correr' && doorData.slidingSystem ? `(${doorData.slidingSystem})` : ''}</p>
                          <p><strong>Dimensões (por porta):</strong> {doorWidth}mm x {doorHeight}mm</p>
                          {doorData.doorType === 'Correr' && <p><strong>Conjunto:</strong> {doorSetCount} porta(s)</p>}
                          <p><strong>Cor Perfil:</strong> {doorData.profileColor}</p>
                          <p><strong>Vidro:</strong> {doorData.glassType}</p>
                          <p><strong>Puxador:</strong> {doorData.handleType}</p>
                          {doorData.handleType !== 'Sem Puxador' && (
                              <div className="pl-4 text-xs">
                                {doorData.doorType === 'Correr' ? (
                                  doorSetFields.map((door, index) => (
                                      <p key={door.id}>Porta {index+1}: {handlePositions[door.handlePosition]}</p>
                                  ))
                                ) : (
                                  <p>Posição: {handlePositions[doorData.handlePosition]}</p>
                                )}
                              </div>
                          )}
                          {doorData.doorType === 'Giro' && <p><strong>Dobradiças (da base):</strong> {hinges?.map(h => `${h.position}mm`).join(', ')}</p>}
                      </div>
                  </div>
              </div>
            
            <DialogFooter className="mt-auto pt-6 border-t">
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
