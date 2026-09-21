'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileDoorVisualizer } from '@/components/profile-door/profile-door-visualizer';
import { generateProfileDoorPDF } from '@/lib/profile-door-pdf';
import type { PurchaseRequest, ProfileDoorItem } from '@/lib/types';
import {
  FileDown,
  Printer,
  Scissors,
  CheckCircle2,
  DoorOpen,
  User,
  Home,
  Check,
  Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PurchaseDoorViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PurchaseRequest | null;
  onEditDoor?: (door: ProfileDoorItem) => void;
}

/**
 * Reconstrói ou recupera a especificação completa da porta de perfil a partir da PurchaseRequest.
 */
export function getDoorFromPurchaseRequest(request: PurchaseRequest | null): {
  door: ProfileDoorItem;
  clientName: string;
  environmentName: string;
} | null {
  if (!request) return null;

  // 1. Se já tiver profileDoorConfig salvo diretamente
  if (request.profileDoorConfig) {
    const config = request.profileDoorConfig;
    const clientName =
      config.clientName ||
      extractClientFromText(request.reason || request.projectName || '');
    const environmentName =
      config.environmentName ||
      extractEnvironmentFromText(request.reason || request.projectName || '');

    return {
      door: config,
      clientName: clientName || 'Cliente',
      environmentName: environmentName || 'Geral',
    };
  }

  // 2. Fallback: Reconstrução a partir da descrição e observações
  const textDesc = `${request.description || ''} ${request.notes || ''} ${request.reason || ''}`;
  
  // Extrair dimensões (\d+)x(\d+) ou (\d+)×(\d+)
  const dimMatch = textDesc.match(/(\d+)\s*[x×X]\s*(\d+)\s*mm/);
  const width = dimMatch ? parseInt(dimMatch[1], 10) : 400;
  const height = dimMatch ? parseInt(dimMatch[2], 10) : 700;

  // Extrair quantidade
  const count = request.quantity || 1;

  // Extrair cor
  const colorMatch = textDesc.match(/(Preto Fosco|Branco|Bronze|Champagne|Inox Escovado|Grafite|Dourado|Alumínio Natural)/i);
  const profileColor = colorMatch ? colorMatch[1] : 'Preto Fosco';

  // Extrair vidro
  const glassMatch = textDesc.match(/(Incolor \d+mm|Reflecta Bronze|Reflecta Fumê|Espelho Prata|Espelho Fumê|Espelho Bronze|Acidato Branco|Canelado)/i);
  const glassType = glassMatch ? glassMatch[1] : 'Incolor 4mm';

  // Extrair puxador
  let handleType = 'Linear inteiro';
  let handleWidth = 150;
  let handleOffset = 100;
  let handleOffsetFrom: 'bottom' | 'top' = 'bottom';

  if (textDesc.includes('Aba Usinada')) {
    handleType = 'Aba Usinada';
    const widthMatch = textDesc.match(/Aba Usinada\s*\(([0-9]+)mm/i) || textDesc.match(/Comprimento:\s*([0-9]+)mm/i);
    if (widthMatch) handleWidth = parseInt(widthMatch[1], 10);

    const fromTopMatch = textDesc.includes('a partir de Topo') || textDesc.includes('do Topo');
    if (fromTopMatch) handleOffsetFrom = 'top';

    const offsetMatch = textDesc.match(/(?:Base|Topo):\s*([0-9]+)mm/i) || textDesc.match(/(?:Distância|offset):\s*([0-9]+)mm/i);
    if (offsetMatch) handleOffset = parseInt(offsetMatch[1], 10);
  } else if (textDesc.includes('Perfil Puxador Integrado')) {
    handleType = 'Perfil Puxador Integrado';
  } else if (textDesc.includes('Sem Puxador')) {
    handleType = 'Sem Puxador';
  }

  // Extrair dobradiças
  const hinges: { position: number }[] = [];
  const hingesMatches = textDesc.match(/(\d+)mm\b/g);
  if (hingesMatches && textDesc.includes('dobradiça')) {
    hingesMatches.forEach((m) => {
      const val = parseInt(m, 10);
      if (val < height && val > 0 && val !== width && val !== height && val !== handleWidth) {
        if (!hinges.some((h) => h.position === val)) {
          hinges.push({ position: val });
        }
      }
    });
  }
  if (hinges.length === 0) {
    hinges.push({ position: 100 }, { position: Math.max(150, height - 100) });
  }

  const clientName = extractClientFromText(request.reason || request.projectName || '') || 'Cliente';
  const environmentName = extractEnvironmentFromText(request.reason || request.projectName || '') || 'Ambiente';

  const doorSetDoors = Array.from({ length: count }, (_, i) => ({
    handlePosition: (i % 2 === 0 ? 'right' : 'left') as any,
    hingeSide: (i % 2 === 0 ? 'left' : 'right') as any,
  }));

  const door: ProfileDoorItem = {
    id: request.id,
    doorType: 'Giro',
    profileModel: 'Perfil 45',
    profileWidthMM: 45,
    glassDiscountMM: 70,
    profileColor,
    glassType,
    handleType,
    width,
    height,
    quantity: count,
    hinges,
    hingeSide: 'left',
    handlePosition: 'right',
    handleWidth,
    handleOffset,
    handleOffsetFrom,
    clientName,
    environmentName,
    doorSet: {
      count,
      doors: doorSetDoors,
    },
  };

  return { door, clientName, environmentName };
}

function extractClientFromText(text: string): string {
  // Ex: "Porta de perfil para Carlos Silva - Ambiente: Cozinha"
  const m = text.match(/para\s+([^-–]+)/i);
  if (m) return m[1].trim();
  const m2 = text.match(/^([^-–]+)\s*[-–]/);
  if (m2) return m2[1].trim();
  return '';
}

function extractEnvironmentFromText(text: string): string {
  const m = text.match(/Ambiente:\s*([^,\.\n]+)/i);
  if (m) return m[1].trim();
  const m2 = text.match(/[-–]\s*([^-–\n]+)$/);
  if (m2) return m2[1].trim();
  return '';
}

export function PurchaseDoorViewerModal({
  isOpen,
  onClose,
  request,
  onEditDoor,
}: PurchaseDoorViewerModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const parsed = getDoorFromPurchaseRequest(request);

  if (!parsed) return null;

  const { door, clientName, environmentName } = parsed;

  const doorWidth = Number(door.width) || 400;
  const doorHeight = Number(door.height) || 700;
  const doorCount = door.doorSet?.count || door.quantity || 1;

  const handleGeneratePDF = () => {
    generateProfileDoorPDF({
      door,
      clientName: clientName || 'Especificação Técnica',
      environmentName: environmentName || 'Geral',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `*TORINO AMBIENTES — ORDEM DE PRODUÇÃO DE PORTA DE PERFIL*
• Cliente: ${clientName}
• Ambiente: ${environmentName}
• Quantidade: ${doorCount} Folha(s)
• Perfil de Alumínio: ${door.profileColor || 'Alumínio Natural'} — ${doorWidth} × ${doorHeight} mm
• Tipo de Vidro/Espelho: ${door.glassType || 'Incolor'}
• Puxador: ${door.handleType || 'Sem Puxador'}${
      door.handleType === 'Aba Usinada'
        ? ` (${door.handleWidth || 150}mm, medido da ${door.handleOffsetFrom === 'top' ? 'Topo' : 'Base'}: ${door.handleOffset || 0}mm)`
        : ''
    }
• Furações Dobradiças: ${door.hinges?.length || 0} furos caneco Ø35mm (${door.hinges?.map((h) => `${h.position}mm`).join(', ')})`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    toast({
      title: 'Especificação Copiada!',
      description: 'O texto com as medidas e especificações técnicas foi copiado para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-7xl h-[94vh] flex flex-col p-5 gap-3 sm:gap-4 overflow-hidden">
        {/* CABEÇALHO TÉCNICO FORMATADO PARA PRINT / FORNECEDOR */}
        <DialogHeader className="pb-2 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
                  <DoorOpen className="h-5 w-5 text-primary" />
                  Visualizador Técnico de Produção — Porta de Perfil
                </DialogTitle>
                <Badge variant="outline" className="text-[11px] font-mono border-primary/40 text-primary">
                  {doorCount} {doorCount > 1 ? 'Folhas' : 'Folha'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Prancheta técnica em escala com cotas milimétricas para corte e usinagem. Pronta para envio ao fornecedor.
              </DialogDescription>
            </div>

            {/* BADGES DESTACADAS DE CLIENTE E AMBIENTE */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 border border-primary/25 text-xs text-primary font-medium">
                <User className="h-3.5 w-3.5" />
                <span>Cliente:</span>
                <strong className="font-semibold text-foreground">{clientName}</strong>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted border text-xs text-muted-foreground font-medium">
                <Home className="h-3.5 w-3.5 text-primary" />
                <span>Ambiente:</span>
                <strong className="font-semibold text-foreground">{environmentName}</strong>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ÁREA PRINCIPAL: VISUALIZADOR TÉCNICO CAD & ESPECIFICAÇÕES */}
        <div ref={printAreaRef} className="flex-1 flex flex-col min-h-0 gap-3">
          {/* PRANCHETA TÉCNICA */}
          <div className="flex-1 min-h-0 relative rounded-lg border bg-background overflow-hidden shadow-inner">
            <ProfileDoorVisualizer
              door={door}
              clientName={clientName}
              environmentName={environmentName}
              showDimensions={true}
            />
          </div>

          {/* RODAPÉ TÉCNICO: ESPECIFICAÇÕES PARA O FORNECEDOR */}
          <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-2 flex-shrink-0">
            <div className="flex flex-wrap items-center justify-between border-b pb-1.5 gap-2">
              <span className="font-bold flex items-center gap-1.5 text-foreground text-xs sm:text-sm">
                <Scissors className="h-3.5 w-3.5 text-primary" />
                Especificações Técnicas de Fabricação para o Fornecedor
              </span>
              {/* NOME DO CLIENTE E AMBIENTE NESTA PARTE */}
              <div className="flex items-center gap-2 text-xs">
                {clientName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-medium">
                    <User className="h-3 w-3" />
                    <span className="text-muted-foreground">Cliente:</span>
                    <strong className="text-foreground">{clientName}</strong>
                  </span>
                )}
                {environmentName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-muted border text-muted-foreground font-medium">
                    <Home className="h-3 w-3 text-primary" />
                    <span>Ambiente:</span>
                    <strong className="text-foreground">{environmentName}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
              {/* Card 1: Perfil de Alumínio (apenas a cor e o tamanho altura e largura) */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Perfil de Alumínio:</span>
                <p className="font-semibold text-foreground truncate text-sm">
                  {door.profileColor || 'Alumínio Natural'}
                </p>
                <p className="text-xs font-mono font-medium text-foreground">
                  {door.width} × {door.height} mm {((door.doorSet?.count || door.quantity || 1) > 1) ? `(${door.doorSet?.count || door.quantity} folhas)` : ''}
                </p>
              </div>

              {/* Card 2: Tipo de Vidro / Espelho (apenas o nome sem dimensões) */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Tipo de Vidro / Espelho:</span>
                <p className="font-semibold text-foreground truncate text-sm">
                  {door.glassType || 'Incolor'}
                </p>
              </div>

              {/* Card 3: Puxador & Usinagem */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Puxador & Usinagem:</span>
                <p className="font-semibold text-foreground truncate text-sm">
                  {door.handleType}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                  {door.handleType === 'Aba Usinada'
                    ? `Aba: ${door.handleWidth || 150}mm • ${door.handleOffsetFrom === 'top' ? 'Topo' : 'Base'}: ${door.handleOffset || 0}mm`
                    : 'Padrão'}
                </p>
              </div>

              {/* Card 4: Furações de Dobradiça */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Furações de Dobradiça:</span>
                <p className="font-semibold text-foreground truncate text-sm">
                  {door.doorType === 'Giro'
                    ? `${door.hinges?.length || 0} Furos Caneco Ø35mm`
                    : door.doorType}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {door.hinges && door.hinges.length > 0
                    ? `Posições: ${door.hinges.map((h) => `${h.position}mm`).join(', ')}`
                    : 'Sem dobradiças'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ COM AÇÕES PARA ENVIO AO FORNECEDOR */}
        <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Tire um print da tela ou gere a folha PDF para enviar diretamente ao fornecedor.</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="gap-1.5 text-xs"
              title="Copiar texto com todas as medidas para WhatsApp / Email"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Gerar Folha PDF</span>
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onClose}
              className="text-xs px-4"
            >
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
