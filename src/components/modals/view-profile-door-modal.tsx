'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProfileDoorItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { useRef, useEffect, useState } from 'react';

const handlePositions: Record<string, string> = {
    left: 'Esquerda',
    right: 'Direita',
    both: 'Ambos os Lados',
    none: 'Nenhum',
    top: 'Em cima',
    bottom: 'Em baixo',
};

interface ViewProfileDoorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  door: ProfileDoorItem;
}

export function ViewProfileDoorModal({ isOpen, onClose, clientName, door }: ViewProfileDoorModalProps) {
  const isPair = door.isPair;
  const doorType = door.doorType;
  const doorSetCount = door.doorSet?.count || 1;
  const handleType = door.handleType;
  const hinges = door.hinges;
  const doorWidth = door.width;
  const doorHeight = door.height;


  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });
    const data = door;
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
        const doorWidthPx = data.width! * scale;
        const doorHeightPx = data.height! * scale;
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
    
    const doorCountForSpec = data.doorType === 'Correr' && data.doorSet ? data.doorSet.count : data.quantity;
    writeSpec(`Qtd: ${doorCountForSpec}${data.isPair ? ' (par)' : ''}`);

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
            const handlePosLabel = handlePositions[data.handlePosition!];
            const mirrorPosLabel = data.isPair ? ` / ${handlePositions[{left: 'right', right: 'left', top: 'top', bottom: 'bottom'}[data.handlePosition!]]}` : '';
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

    const doorWidthInMM = data.width! * scale;
    const doorHeightInMM = data.height! * scale;
    const spacingInMM = 10;
    
    let doorCount = 1;
    if(data.doorType === 'Correr') doorCount = data.doorSet?.count || 1;
    if(doorType === 'Giro' && data.isPair) doorCount = 2;

    const totalDrawingWidth = doorWidthInMM * doorCount + (spacingInMM * (doorCount - 1));
    
    const drawingStartY = (pageHeight - doorHeightInMM) / 2;
    const drawingStartX = drawingColumnX + (drawingColumnWidth - totalDrawingWidth) / 2;
    
    if (data.doorType === 'Correr' && data.doorSet?.doors) {
        for(let i=0; i < doorCount; i++) {
            const startX = drawingStartX + (i * (doorWidthInMM + spacingInMM));
            drawDoor(startX, drawingStartY, false, data.doorSet.doors[i]?.handlePosition || 'none');
        }
    } else if (data.doorType === 'Giro' && data.isPair) {
        drawDoor(drawingStartX, drawingStartY, false, data.handlePosition!);
        drawDoor(drawingStartX + doorWidthInMM + spacingInMM, drawingStartY, true, data.handlePosition!);
    } else {
        drawDoor(drawingStartX, drawingStartY, false, data.handlePosition!);
    }

    doc.save(`Porta_${clientName || 'especificacao'}.pdf`);
  };

  const profileColorClass = {
    'Preto': 'bg-gray-800',
    'Aluminio': 'bg-gray-400',
    'Inox': 'bg-gray-500'
  }[door.profileColor || ''] || 'bg-gray-700';

  const PROFILE_WIDTH_MM = 45;

  const HandleVisualizer = ({ mirrored = false, positionOverride }: { mirrored?: boolean, positionOverride?: 'left' | 'right' | 'top' | 'bottom' | 'both' | 'none' }) => {
    if (handleType === 'Sem Puxador' || !positionOverride || positionOverride === 'none') return null;

    const style: React.CSSProperties = { position: 'absolute', backgroundColor: 'red' };
    
    const positionsToDraw = positionOverride === 'both' ? ['left', 'right'] : [positionOverride];
    
    const handleThickness = 8;
    
    return (
      <>
        {positionsToDraw.map(pos => {
          let currentPos = pos as 'left' | 'right' | 'top' | 'bottom';
          if (doorType === 'Giro' && mirrored) {
            currentPos = { 'left': 'right', 'right': 'left', 'top': 'top', 'bottom': 'bottom' }[currentPos] as any;
          }
          const individualStyle: React.CSSProperties = { ...style };
          switch (currentPos) {
              case 'top': case 'bottom':
                  individualStyle.height = `${handleThickness}px`;
                  if (handleType === 'Linear inteiro') {
                      individualStyle.width = '100%'; individualStyle.left = '0';
                  } else if (door.handleWidth && door.width){
                      individualStyle.width = `${(door.handleWidth / door.width) * 100}%`;
                      individualStyle.left = `${((door.handleOffset || 0) / door.width) * 100}%`;
                  }
                  if (currentPos === 'top') individualStyle.top = '0'; else individualStyle.bottom = '0';
                  break;
              case 'left': case 'right':
                  individualStyle.width = `${handleThickness}px`;
                  if (handleType === 'Linear inteiro') {
                      individualStyle.height = '100%'; individualStyle.top = '0';
                  } else if (door.handleWidth && door.height){
                      individualStyle.height = `${(door.handleWidth / door.height) * 100}%`;
                      individualStyle.top = `${((door.handleOffset || 0) / door.height) * 100}%`;
                  }
                  if (currentPos === 'left') individualStyle.left = '0'; else individualStyle.right = '0';
                  break;
          }
          return <div key={`${pos}-${currentPos}`} style={individualStyle}></div>
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
        
        const containerPadding = 32; // p-4 = 1rem = 16px * 2
        const containerWidth = rawContainerWidth - containerPadding; 
        const containerHeight = rawContainerHeight - containerPadding;
        
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
            <span className="text-base text-white font-semibold text-center p-2 break-all">{door.glassType}</span>
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
      <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
        <div className="flex items-center justify-center gap-2" style={{ width: containerSize.width, height: containerSize.height }}>
            {doorType === 'Correr' && (door.doorSet?.doors || []).map((field, index) => {
                return (
                    <div key={index} className="flex flex-col items-center gap-1">
                        <DoorVisualizer style={doorDimensions} positionOverride={field.handlePosition} />
                        <p className="text-xs font-semibold text-muted-foreground">Porta {index + 1}</p>
                    </div>
                )
            })}
            {doorType === 'Giro' && <DoorVisualizer style={doorDimensions} positionOverride={door.handlePosition}/>}
            {doorType === 'Giro' && isPair && <DoorVisualizer mirrored={true} style={doorDimensions} positionOverride={door.handlePosition} />}
            {doorType !== 'Correr' && doorType !== 'Giro' && <DoorVisualizer style={doorDimensions} positionOverride={door.handlePosition} />}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Visualizar Porta de Perfil</DialogTitle>
          <DialogDescription>
            Visualize os detalhes da porta.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex min-h-0 gap-8">
            {/* Left Column: Visualizer */}
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-lg relative min-h-0 border p-4 gap-4">
                <div className="w-full flex-1 flex items-center justify-center min-h-0">
                    <VisualizerContainer />
                </div>
            </div>

            {/* Right Column: Specs */}
            <div className="w-[350px] flex-shrink-0 space-y-4 overflow-y-auto pr-6 border-l pl-6">
              <h3 className="font-bold text-lg mb-2">Especificações</h3>
              {clientName && <p><strong>Cliente:</strong> {clientName}</p>}
              <p><strong>Tipo:</strong> {door.doorType} {door.doorType === 'Correr' && door.slidingSystem ? `(${door.slidingSystem})` : ''}</p>
              <p><strong>Dimensões (por porta):</strong> {doorWidth}mm x {doorHeight}mm</p>
              {door.doorType === 'Correr' && <p><strong>Conjunto:</strong> {door.doorSet?.count} porta(s)</p>}
              <p><strong>Cor Perfil:</strong> {door.profileColor}</p>
              <p><strong>Vidro:</strong> {door.glassType}</p>
              <p><strong>Puxador:</strong> {door.handleType}</p>
              {door.handleType !== 'Sem Puxador' && (
                  <div className="pl-4 text-sm">
                    {door.doorType === 'Correr' ? (
                      (door.doorSet?.doors || []).map((d, index) => (
                          <p key={index}>Porta {index+1}: {handlePositions[d.handlePosition]}</p>
                      ))
                    ) : (
                      <p>Posição: {handlePositions[door.handlePosition!]}</p>
                    )}
                  </div>
              )}
              {door.doorType === 'Giro' && <p><strong>Dobradiças (da base):</strong> {hinges?.map(h => `${h.position}mm`).join(', ')}</p>}
            </div>
          </div>
        
          <DialogFooter className="mt-auto pt-6 border-t">
            <Button type="button" onClick={onClose}>
              Fechar
            </Button>
            <Button type="button" variant="outline" onClick={generatePDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
