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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { GlassItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Square, FileDown, Circle } from 'lucide-react';
import { useEffect } from 'react';
import jsPDF from 'jspdf';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Switch } from '../ui/switch';


interface GlassCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (glass: Omit<GlassItem, 'id' | 'purchased' | 'addedAt'>) => void;
  glassToEdit?: GlassItem | null;
  clientName?: string;
  viewOnly?: boolean;
}

const glassTypes = ['Vidro Incolor', 'Espelho', 'Vidro Reflecta Incolor', 'Vidro Reflecta Bronze', 'Vidro Reflecta Fume', 'Espelho Fumê', 'Espelho Bronze'];

const glassCreatorSchema = z.object({
  shape: z.enum(['rectangle', 'circle']),
  type: z.string().min(1, 'O tipo de vidro é obrigatório.'),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  diameter: z.coerce.number().optional(),
  quantity: z.coerce.number().min(1, 'A quantidade mínima é 1.'),
  cornerRadiusTopLeft: z.coerce.number().min(0, 'O raio não pode ser negativo.').optional(),
  cornerRadiusTopRight: z.coerce.number().min(0, 'O raio não pode ser negativo.').optional(),
  cornerRadiusBottomLeft: z.coerce.number().min(0, 'O raio não pode ser negativo.').optional(),
  cornerRadiusBottomRight: z.coerce.number().min(0, 'O raio não pode ser negativo.').optional(),
  isBeveled: z.boolean().default(false),
  hasFrostedStrips: z.boolean().default(false),
  frostedStripWidth: z.coerce.number().min(0, 'A largura não pode ser negativa.').optional(),
  frostedStripTop: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripBottom: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripLeft: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripRight: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripCircularOffset: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
}).refine(data => {
    if (data.shape === 'rectangle') {
        return data.width && data.width > 0 && data.height && data.height > 0;
    }
    return true;
}, {
    message: "Largura e altura são obrigatórias para retângulos.",
    path: ["width"],
}).refine(data => {
    if (data.shape === 'circle') {
        return data.diameter && data.diameter > 0;
    }
    return true;
}, {
    message: "Diâmetro é obrigatório para círculos.",
    path: ["diameter"],
}).refine(data => {
    if (data.hasFrostedStrips) {
        return data.frostedStripWidth && data.frostedStripWidth > 0;
    }
    return true;
}, {
    message: "A largura da faixa é obrigatória.",
    path: ["frostedStripWidth"],
});


type GlassCreatorFormValues = z.infer<typeof glassCreatorSchema>;

export function GlassCreatorModal({ isOpen, onClose, onSave, glassToEdit, clientName, viewOnly = false }: GlassCreatorModalProps) {
  const isEditMode = !!glassToEdit;
  
  const form = useForm<GlassCreatorFormValues>({
    resolver: zodResolver(glassCreatorSchema),
    defaultValues: {
      shape: 'rectangle',
      type: glassTypes[0],
      width: 500,
      height: 700,
      diameter: 500,
      quantity: 1,
      cornerRadiusTopLeft: 0,
      cornerRadiusTopRight: 0,
      cornerRadiusBottomLeft: 0,
      cornerRadiusBottomRight: 0,
      isBeveled: false,
      hasFrostedStrips: false,
      frostedStripWidth: 50,
      frostedStripTop: 0,
      frostedStripBottom: 0,
      frostedStripLeft: 0,
      frostedStripRight: 0,
      frostedStripCircularOffset: 50,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && glassToEdit) {
        form.reset({
          ...glassToEdit,
          shape: glassToEdit.shape || 'rectangle',
          isBeveled: glassToEdit.isBeveled || false,
          hasFrostedStrips: glassToEdit.hasFrostedStrips || false,
          frostedStripWidth: glassToEdit.frostedStripWidth || 50,
          frostedStripTop: glassToEdit.frostedStripTop || 0,
          frostedStripBottom: glassToEdit.frostedStripBottom || 0,
          frostedStripLeft: glassToEdit.frostedStripLeft || 0,
          frostedStripRight: glassToEdit.frostedStripRight || 0,
          frostedStripCircularOffset: glassToEdit.frostedStripCircularOffset || 50,
          cornerRadiusTopLeft: glassToEdit.cornerRadiusTopLeft || 0,
          cornerRadiusTopRight: glassToEdit.cornerRadiusTopRight || 0,
          cornerRadiusBottomLeft: glassToEdit.cornerRadiusBottomLeft || 0,
          cornerRadiusBottomRight: glassToEdit.cornerRadiusBottomRight || 0,
        });
      } else {
        form.reset({
          shape: 'rectangle',
          type: glassTypes[0],
          width: 500,
          height: 700,
          diameter: 500,
          quantity: 1,
          cornerRadiusTopLeft: 0,
          cornerRadiusTopRight: 0,
          cornerRadiusBottomLeft: 0,
          cornerRadiusBottomRight: 0,
          isBeveled: false,
          hasFrostedStrips: false,
          frostedStripWidth: 50,
          frostedStripTop: 0,
          frostedStripBottom: 0,
          frostedStripLeft: 0,
          frostedStripRight: 0,
          frostedStripCircularOffset: 50,
        });
      }
    }
  }, [isOpen, isEditMode, glassToEdit, form]);

  const onSubmit = (data: GlassCreatorFormValues) => {
    if (viewOnly) return;
    onSave(data);
    onClose();
  };

  const glassData = form.watch();
  const hasFrostedStripsFeature = form.watch('hasFrostedStrips');
  const isBeveled = form.watch('isBeveled');
  const shape = form.watch('shape');

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
    const data = form.getValues();
    const scale = 0.2;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    
    const specsColumnWidth = 90;
    const drawingColumnX = margin + specsColumnWidth + 10;

    // --- Specs ---
    doc.setFontSize(18);
    doc.text('Folha de Produção - Vidro / Espelho', margin, 20);
    doc.setFontSize(12);
    let currentY = 30;
    const writeSpec = (label: string, value: string | number | undefined) => {
      if(value){
        doc.text(`${label}: ${value}`, margin, currentY);
        currentY += 6;
      }
    };
    
    writeSpec('Cliente', clientName || 'N/A');
    writeSpec('Formato', data.shape === 'circle' ? 'Círculo' : 'Retângulo');
    writeSpec('Tipo', data.type);
    writeSpec('Qtd', data.quantity);
    if(data.shape === 'circle') {
        writeSpec('Diâmetro', `${data.diameter} mm`);
    } else {
        writeSpec('Dimensões', `${data.width} x ${data.height} mm`);
        const radii = [data.cornerRadiusTopLeft, data.cornerRadiusTopRight, data.cornerRadiusBottomRight, data.cornerRadiusBottomLeft].map(r => r || 0);
        if (radii.some(r => r > 0)) {
           if (radii.every(r => r === radii[0])) {
               writeSpec('Raio dos Cantos', `${radii[0]} mm`);
           } else {
              writeSpec('Raios (SE, SD, IE, ID)', `${radii[0]}mm, ${radii[1]}mm, ${radii[3]}mm, ${radii[2]}mm`);
           }
        }
    }

    if (data.isBeveled) {
      writeSpec('Acabamento', 'Bisotê');
    }

    if (data.hasFrostedStrips && data.frostedStripWidth) {
        currentY += 2;
        doc.setFontSize(11);
        doc.text('Faixa Jateada:', margin, currentY);
        currentY += 5;
        doc.text(`- Largura da Faixa: ${data.frostedStripWidth} mm`, margin + 5, currentY); currentY += 5;
        if(data.shape === 'circle') {
            doc.text(`- Distância da Borda: ${data.frostedStripCircularOffset} mm`, margin + 5, currentY); currentY += 5;
        } else {
            doc.text('Recuos (offset em mm):', margin, currentY); currentY += 5;
            if(data.frostedStripTop) doc.text(`- Superior: ${data.frostedStripTop} mm`, margin + 5, currentY); currentY += 5;
            if(data.frostedStripBottom) doc.text(`- Inferior: ${data.frostedStripBottom} mm`, margin + 5, currentY); currentY += 5;
            if(data.frostedStripLeft) doc.text(`- Esquerda: ${data.frostedStripLeft} mm`, margin + 5, currentY); currentY += 5;
            if(data.frostedStripRight) doc.text(`- Direita: ${data.frostedStripRight} mm`, margin + 5, currentY); currentY += 5;
        }
    }
    

    // --- Drawing ---
    const drawWidth = (data.shape === 'circle' ? data.diameter! : data.width!) * scale;
    const drawHeight = (data.shape === 'circle' ? data.diameter! : data.height!) * scale;
    const tl = (data.cornerRadiusTopLeft || 0) * scale;
    const tr = (data.cornerRadiusTopRight || 0) * scale;
    const br = (data.cornerRadiusBottomRight || 0) * scale;
    const bl = (data.cornerRadiusBottomLeft || 0) * scale;
    
    const startX = drawingColumnX + ((pageWidth - drawingColumnX - margin) / 2) - (drawWidth / 2);
    const startY = (pageHeight / 2) - (drawHeight / 2);

    doc.setDrawColor(0);
    doc.setFillColor(230, 230, 230);
    if(data.shape === 'circle'){
        doc.ellipse(startX + drawWidth / 2, startY + drawHeight / 2, drawWidth / 2, drawHeight / 2, 'FD');
    } else {
        doc.roundedRect(startX, startY, drawWidth, drawHeight, tl, tr, br, bl, 'FD');
    }

    if (data.isBeveled) {
      doc.setDrawColor(150);
      doc.setLineWidth(0.5);
      const bevelOffset = 2 * scale; // 2mm bevel visual representation
      if (data.shape === 'circle') {
        doc.ellipse(startX + drawWidth / 2, startY + drawHeight / 2, (drawWidth / 2) - bevelOffset, (drawHeight / 2) - bevelOffset, 'D');
      } else {
        doc.roundedRect(startX + bevelOffset, startY + bevelOffset, drawWidth - 2 * bevelOffset, drawHeight - 2 * bevelOffset, tl, tr, br, bl, 'D');
      }
    }

    if (data.hasFrostedStrips && data.frostedStripWidth) {
      doc.setFillColor(255, 255, 0); // Yellow fill for strips

      const stripWidth = data.frostedStripWidth * scale;

      if(data.shape === 'circle' && data.frostedStripCircularOffset){
          const offset = data.frostedStripCircularOffset * scale;
          const innerDiameter = drawWidth - 2 * offset;
          const innerRadius = innerDiameter / 2;
          const outerRadius = drawWidth / 2;
          
          doc.ellipse(startX + outerRadius, startY + outerRadius, outerRadius, outerRadius, 'F');
          doc.setFillColor(230, 230, 230); // Color of glass
          doc.ellipse(startX + outerRadius, startY + outerRadius, innerRadius, innerRadius, 'F');
      } else {
        const topOffset = (data.frostedStripTop || 0) * scale;
        const bottomOffset = (data.frostedStripBottom || 0) * scale;
        const leftOffset = (data.frostedStripLeft || 0) * scale;
        const rightOffset = (data.frostedStripRight || 0) * scale;
        
        doc.setFillColor(255, 255, 255, 0); // Transparent fill
        doc.setDrawColor(255, 255, 0); // Yellow stroke
        doc.setLineWidth(stripWidth);
        doc.roundedRect(startX + leftOffset + stripWidth/2, startY + topOffset + stripWidth/2, drawWidth - leftOffset - rightOffset - stripWidth, drawHeight - topOffset - bottomOffset - stripWidth, tl, tr, br, bl, 'D');
      }
    }

    doc.save(`Vidro_${clientName || 'especificacao'}.pdf`);
  };

const GlassVisualizer = () => {
    const {
        shape,
        width = 0,
        height = 0,
        diameter = 0,
        cornerRadiusTopLeft = 0,
        cornerRadiusTopRight = 0,
        cornerRadiusBottomLeft = 0,
        cornerRadiusBottomRight = 0,
        type,
        isBeveled,
        hasFrostedStrips,
        frostedStripWidth = 0,
        frostedStripTop = 0,
        frostedStripBottom = 0,
        frostedStripLeft = 0,
        frostedStripRight = 0,
        frostedStripCircularOffset = 0,
    } = glassData;

    const glassColorClass = type === 'Espelho' ? 'bg-gray-300' : 'bg-blue-200/50';
    const isCircle = shape === 'circle';
    const displayWidth = isCircle ? diameter : width;
    const displayHeight = isCircle ? diameter : height;

    if (!displayWidth || displayWidth <= 0 || !displayHeight || displayHeight <= 0) return null;

    const scaleFactor = 300 / Math.max(displayWidth, displayHeight, 300);

    const outerStyle: React.CSSProperties = {
        width: `${displayWidth * scaleFactor}px`,
        height: `${displayHeight * scaleFactor}px`,
        borderRadius: isCircle ? '50%' : `${cornerRadiusTopLeft * scaleFactor}px ${cornerRadiusTopRight * scaleFactor}px ${cornerRadiusBottomRight * scaleFactor}px ${cornerRadiusBottomLeft * scaleFactor}px`,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
    };

    const showStrips = hasFrostedStrips && frostedStripWidth > 0;

    return (
        <div style={outerStyle} className={cn(glassColorClass, 'shadow-md')}>
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 text-center p-2 break-words">{type}</div>
            
            {isBeveled && (
              <div
                style={{
                  position: 'absolute',
                  top: '5px',
                  bottom: '5px',
                  left: '5px',
                  right: '5px',
                  borderRadius: 'inherit',
                  border: '1px dashed rgba(0,0,0,0.3)',
                  boxSizing: 'border-box'
                }}
              ></div>
            )}

            {showStrips && (
                isCircle ? (
                    <div
                        style={{
                            position: 'absolute',
                            top: `${frostedStripCircularOffset * scaleFactor}px`,
                            bottom: `${frostedStripCircularOffset * scaleFactor}px`,
                            left: `${frostedStripCircularOffset * scaleFactor}px`,
                            right: `${frostedStripCircularOffset * scaleFactor}px`,
                            borderRadius: '50%',
                            border: `${frostedStripWidth * scaleFactor}px solid rgba(255, 255, 0, 0.8)`,
                            boxSizing: 'border-box'
                        }}
                    ></div>
                ) : (
                    <div
                        style={{
                            position: 'absolute',
                            top: `${frostedStripTop * scaleFactor}px`,
                            bottom: `${frostedStripBottom * scaleFactor}px`,
                            left: `${frostedStripLeft * scaleFactor}px`,
                            right: `${frostedStripRight * scaleFactor}px`,
                            borderRadius: 'inherit',
                            border: `${frostedStripWidth * scaleFactor}px solid rgba(255, 255, 0, 0.8)`,
                            boxSizing: 'border-box'
                        }}
                    ></div>
                )
            )}
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
                name="shape"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Formato</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="rectangle" /></FormControl>
                          <FormLabel className="font-normal">Retângulo</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="circle" /></FormControl>
                          <FormLabel className="font-normal">Círculo</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              {shape === 'rectangle' ? (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="width" render={({ field }) => ( <FormItem><FormLabel>Largura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="height" render={({ field }) => ( <FormItem><FormLabel>Altura (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                     <div className="grid grid-cols-1 gap-4">
                        <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     </div>
                     <div>
                        <FormLabel>Raios dos Cantos (mm)</FormLabel>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                           <FormField control={form.control} name="cornerRadiusTopLeft" render={({ field }) => ( <FormItem className="relative"><FormLabel className="text-xs absolute -top-2 left-2 bg-background px-1 text-muted-foreground">Sup. Esq.</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           <FormField control={form.control} name="cornerRadiusTopRight" render={({ field }) => ( <FormItem className="relative"><FormLabel className="text-xs absolute -top-2 left-2 bg-background px-1 text-muted-foreground">Sup. Dir.</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           <FormField control={form.control} name="cornerRadiusBottomLeft" render={({ field }) => ( <FormItem className="relative"><FormLabel className="text-xs absolute -top-2 left-2 bg-background px-1 text-muted-foreground">Inf. Esq.</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                           <FormField control={form.control} name="cornerRadiusBottomRight" render={({ field }) => ( <FormItem className="relative"><FormLabel className="text-xs absolute -top-2 left-2 bg-background px-1 text-muted-foreground">Inf. Dir.</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                     </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="diameter" render={({ field }) => ( <FormItem><FormLabel>Diâmetro (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
              )}
                
                <Separator />
                
                <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isBeveled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                          <div className="space-y-0.5">
                            <FormLabel>Acabamento Bisotê</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasFrostedStrips"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/50">
                          <div className="space-y-0.5">
                            <FormLabel>Ativar Faixa Jateada</FormLabel>
                            <FormDescription className="text-xs">
                              Habilita os campos para configurar a faixa.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {hasFrostedStripsFeature && (
                        <div className="space-y-4 mt-4 p-4 border rounded-lg">
                             <FormField control={form.control} name="frostedStripWidth" render={({ field }) => ( <FormItem><FormLabel>Largura da Faixa (mm)</FormLabel><FormControl><Input type="number" placeholder='Ex: 50' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             {shape === 'circle' ? (
                                <FormField control={form.control} name="frostedStripCircularOffset" render={({ field }) => ( <FormItem><FormLabel>Distância da Borda (mm)</FormLabel><FormControl><Input type="number" placeholder='Ex: 50' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             ) : (
                                <>
                                <p className='text-xs text-muted-foreground -mt-2'>Defina o recuo da faixa. Deixe em 0 para não aplicar em uma borda.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="frostedStripTop" render={({ field }) => ( <FormItem><FormLabel>Recuo Superior (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="frostedStripBottom" render={({ field }) => ( <FormItem><FormLabel>Recuo Inferior (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="frostedStripLeft" render={({ field }) => ( <FormItem><FormLabel>Recuo Esquerdo (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="frostedStripRight" render={({ field }) => ( <FormItem><FormLabel>Recuo Direito (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                </>
                             )}
                        </div>
                    )}
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
                    <p><strong>Formato:</strong> {glassData.shape === 'circle' ? 'Círculo' : 'Retângulo'}</p>
                    <p><strong>Tipo:</strong> {glassData.type}</p>
                    {glassData.shape === 'circle' ? (
                        <p><strong>Diâmetro:</strong> {glassData.diameter || 0}mm</p>
                    ) : (
                        <>
                         <p><strong>Dimensões:</strong> {glassData.width || 0}mm x {glassData.height || 0}mm</p>
                         <p><strong>Raios (SE, SD, IE, ID):</strong> {glassData.cornerRadiusTopLeft || 0}mm, {glassData.cornerRadiusTopRight || 0}mm, {glassData.cornerRadiusBottomLeft || 0}mm, {glassData.cornerRadiusBottomRight || 0}mm</p>
                        </>
                    )}
                    <p><strong>Quantidade:</strong> {glassData.quantity}</p>
                    {isBeveled && <p><strong>Acabamento:</strong> Bisotê</p>}
                    {hasFrostedStripsFeature && (glassData.frostedStripWidth || 0) > 0 && (
                        <>
                            <p className='text-xs'><strong>Largura Faixa:</strong> {glassData.frostedStripWidth}mm</p>
                             {shape === 'circle' ? (
                                <p className='text-xs'><strong>Distância Borda:</strong> {glassData.frostedStripCircularOffset || 0}mm</p>
                             ) : (
                                <>
                                {(glassData.frostedStripTop || 0) > 0 && <p className='text-xs'><strong>Recuo Superior: {glassData.frostedStripTop}mm</strong></p>}
                                {(glassData.frostedStripBottom || 0) > 0 && <p className='text-xs'><strong>Recuo Inferior: {glassData.frostedStripBottom}mm</strong></p>}
                                {(glassData.frostedStripLeft || 0) > 0 && <p className='text-xs'><strong>Recuo Esquerdo: {glassData.frostedStripLeft}mm</strong></p>}
                                {(glassData.frostedStripRight || 0) > 0 && <p className='text-xs'><strong>Recuo Direito: {glassData.frostedStripRight}mm</strong></p>}
                                </>
                             )}
                        </>
                    )}
                </div>
            </div>
            
            <DialogFooter className="md:col-span-2 mt-auto pt-6 border-t">
              <Button type="button" variant={viewOnly ? 'default' : 'ghost'} onClick={onClose}>
                {viewOnly ? "Fechar" : "Cancelar"}
              </Button>
               <Button type="button" variant="outline" onClick={generatePDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
              {!viewOnly && (
                 <Button type="submit">
                    {shape === 'circle' ? <Circle className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
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
