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
  onSave: (glass: Omit<GlassItem, 'id'>) => void;
  glassToEdit?: GlassItem | null;
  clientName?: string;
  viewOnly?: boolean;
}

const glassTypes = ['Vidro Incolor', 'Espelho', 'Vidro Reflecta Incolor', 'Vidro Reflecta Bronze', 'Vidro Reflecta Fume'];

const glassCreatorSchema = z.object({
  shape: z.enum(['rectangle', 'circle']),
  type: z.string().min(1, 'O tipo de vidro é obrigatório.'),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  diameter: z.coerce.number().optional(),
  quantity: z.coerce.number().min(1, 'A quantidade mínima é 1.'),
  cornerRadius: z.coerce.number().min(0, 'O raio não pode ser negativo.').optional(),
  hasFrostedStrips: z.boolean().default(false),
  frostedStripTop: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripBottom: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripLeft: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripRight: z.coerce.number().min(0, 'Offset não pode ser negativo.').optional(),
  frostedStripWidth: z.coerce.number().min(0, 'A largura não pode ser negativa.').optional(),
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
      cornerRadius: 0,
      hasFrostedStrips: false,
      frostedStripTop: 0,
      frostedStripBottom: 0,
      frostedStripLeft: 0,
      frostedStripRight: 0,
      frostedStripWidth: 50,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && glassToEdit) {
        form.reset({
          ...glassToEdit,
          shape: glassToEdit.shape || 'rectangle',
          hasFrostedStrips: glassToEdit.hasFrostedStrips || false,
          frostedStripTop: glassToEdit.frostedStripTop || 0,
          frostedStripBottom: glassToEdit.frostedStripBottom || 0,
          frostedStripLeft: glassToEdit.frostedStripLeft || 0,
          frostedStripRight: glassToEdit.frostedStripRight || 0,
          frostedStripWidth: glassToEdit.frostedStripWidth || 50,
        });
      } else {
        form.reset({
          shape: 'rectangle',
          type: glassTypes[0],
          width: 500,
          height: 700,
          diameter: 500,
          quantity: 1,
          cornerRadius: 0,
          hasFrostedStrips: false,
          frostedStripTop: 0,
          frostedStripBottom: 0,
          frostedStripLeft: 0,
          frostedStripRight: 0,
          frostedStripWidth: 50,
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
  const hasFrostedStripsFeature = form.watch('hasFrostedStrips');
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
        writeSpec('Raio do Canto', `${data.cornerRadius || 0} mm`);
    }

    if (data.hasFrostedStrips) {
        currentY += 2;
        doc.setFontSize(11);
        doc.text('Faixa Jateada (offset em mm):', margin, currentY);
        currentY += 5;
        if(data.frostedStripWidth) doc.text(`- Largura da Faixa: ${data.frostedStripWidth} mm`, margin + 5, currentY); currentY += 5;
        if(data.frostedStripTop) doc.text(`- Recuo Superior: ${data.frostedStripTop} mm`, margin + 5, currentY); currentY += 5;
        if(data.frostedStripBottom) doc.text(`- Recuo Inferior: ${data.frostedStripBottom} mm`, margin + 5, currentY); currentY += 5;
        if(data.frostedStripLeft) doc.text(`- Recuo Esquerda: ${data.frostedStripLeft} mm`, margin + 5, currentY); currentY += 5;
        if(data.frostedStripRight) doc.text(`- Recuo Direita: ${data.frostedStripRight} mm`, margin + 5, currentY); currentY += 5;
    }
    

    // --- Drawing ---
    const drawWidth = (data.shape === 'circle' ? data.diameter! : data.width!) * scale;
    const drawHeight = (data.shape === 'circle' ? data.diameter! : data.height!) * scale;
    const drawRadius = (data.cornerRadius || 0) * scale;
    
    const startX = drawingColumnX + ((pageWidth - drawingColumnX - margin) / 2) - (drawWidth / 2);
    const startY = (pageHeight / 2) - (drawHeight / 2);

    doc.setDrawColor(0);
    doc.setFillColor(230, 230, 230);
    if(data.shape === 'circle'){
        doc.ellipse(startX + drawWidth / 2, startY + drawHeight / 2, drawWidth / 2, drawHeight / 2, 'FD');
    } else {
        doc.roundedRect(startX, startY, drawWidth, drawHeight, drawRadius, drawRadius, 'FD');
    }

    if (data.hasFrostedStrips) {
      doc.setFillColor(255, 255, 0); // Yellow fill for strips

      const topOffset = (data.frostedStripTop || 0) * scale;
      const bottomOffset = (data.frostedStripBottom || 0) * scale;
      const leftOffset = (data.frostedStripLeft || 0) * scale;
      const rightOffset = (data.frostedStripRight || 0) * scale;
      const stripWidth = (data.frostedStripWidth || 0) * scale;

      if(stripWidth > 0) {
        if (data.shape === 'rectangle') {
            // Top strip
            if (topOffset > 0) doc.rect(startX + leftOffset, startY + topOffset, drawWidth - leftOffset - rightOffset, stripWidth, 'F');
            // Bottom strip
            if (bottomOffset > 0) doc.rect(startX + leftOffset, startY + drawHeight - bottomOffset - stripWidth, drawWidth - leftOffset - rightOffset, stripWidth, 'F');
            // Left strip
            if (leftOffset > 0) doc.rect(startX + leftOffset, startY + topOffset, stripWidth, drawHeight - topOffset - bottomOffset, 'F');
            // Right strip
            if (rightOffset > 0) doc.rect(startX + drawWidth - rightOffset - stripWidth, startY + topOffset, stripWidth, drawHeight - topOffset - bottomOffset, 'F');
        }
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
      cornerRadius = 0,
      type,
      hasFrostedStrips,
      frostedStripWidth = 0,
      frostedStripTop = 0,
      frostedStripBottom = 0,
      frostedStripLeft = 0,
      frostedStripRight = 0
    } = glassData;
  
    const glassColorClass = type === 'Espelho' ? 'bg-gray-300' : 'bg-blue-200/50';
    const isCircle = shape === 'circle';
    const displayWidth = isCircle ? diameter : width;
    const displayHeight = isCircle ? diameter : height;
  
    if (displayWidth === 0 || displayHeight === 0) return null;
  
    const scaleFactor = 300 / Math.max(displayWidth, displayHeight, 300);
  
    const outerWidth = displayWidth * scaleFactor;
    const outerHeight = displayHeight * scaleFactor;
    const outerRadius = isCircle ? '50%' : `${Math.min(cornerRadius, Math.min(displayWidth, displayHeight) / 2) * scaleFactor}px`;
  
    const innerTop = frostedStripTop * scaleFactor;
    const innerBottom = frostedStripBottom * scaleFactor;
    const innerLeft = frostedStripLeft * scaleFactor;
    const innerRight = frostedStripRight * scaleFactor;
  
    const innerRadiusValue = Math.max(0, (isCircle ? outerWidth / 2 : Math.min(cornerRadius, Math.min(displayWidth, displayHeight) / 2)) - Math.max(frostedStripLeft, frostedStripRight, frostedStripTop, frostedStripBottom));
    const innerRadius = isCircle ? '50%' : `${innerRadiusValue * scaleFactor}px`;

    const showStrips = hasFrostedStrips && frostedStripWidth > 0;
  
    return (
      <div
        className={cn("relative flex items-center justify-center transition-all duration-300 overflow-hidden", showStrips ? 'bg-yellow-400' : glassColorClass)}
        style={{
          width: `${outerWidth}px`,
          height: `${outerHeight}px`,
          borderRadius: outerRadius,
        }}
      >
        <div
            className={cn("absolute", glassColorClass)}
            style={{
                top: `${innerTop}px`,
                right: `${innerRight}px`,
                bottom: `${innerBottom}px`,
                left: `${innerLeft}px`,
                borderRadius: innerRadius,
            }}
        >
          {!showStrips && <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground text-center p-2 break-all">{type}</span>}
        </div>
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
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="cornerRadius" render={({ field }) => ( <FormItem><FormLabel>Raio do Canto (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                     </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="diameter" render={({ field }) => ( <FormItem><FormLabel>Diâmetro (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
              )}

                <Separator />

                <div>
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
                            <p className='text-xs text-muted-foreground -mt-2'>Defina o recuo da faixa. Deixe em 0 para não aplicar em uma borda.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="frostedStripTop" render={({ field }) => ( <FormItem><FormLabel>Recuo Superior (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="frostedStripBottom" render={({ field }) => ( <FormItem><FormLabel>Recuo Inferior (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="frostedStripLeft" render={({ field }) => ( <FormItem><FormLabel>Recuo Esquerdo (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="frostedStripRight" render={({ field }) => ( <FormItem><FormLabel>Recuo Direito (mm)</FormLabel><FormControl><Input type="number" placeholder='0' {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
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
                         <p><strong>Raio do Canto:</strong> {glassData.cornerRadius || 0}mm</p>
                        </>
                    )}
                    <p><strong>Quantidade:</strong> {glassData.quantity}</p>
                    {hasFrostedStripsFeature && (glassData.frostedStripWidth || 0) > 0 && <p className='text-xs'><strong>Largura Faixa:</strong> {glassData.frostedStripWidth}mm</p>}
                    {hasFrostedStripsFeature && (glassData.frostedStripTop || 0) > 0 && <p className='text-xs'><strong>Recuo Superior: {glassData.frostedStripTop}mm</strong></p>}
                    {hasFrostedStripsFeature && (glassData.frostedStripBottom || 0) > 0 && <p className='text-xs'><strong>Recuo Inferior: {glassData.frostedStripBottom}mm</strong></p>}
                    {hasFrostedStripsFeature && (glassData.frostedStripLeft || 0) > 0 && <p className='text-xs'><strong>Recuo Esquerdo: {glassData.frostedStripLeft}mm</strong></p>}
                    {hasFrostedStripsFeature && (glassData.frostedStripRight || 0) > 0 && <p className='text-xs'><strong>Recuo Direito: {glassData.frostedStripRight}mm</strong></p>}
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
