'use client';

import React, { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProfileDoorItem } from '@/lib/types';
import {
  HANDLE_POSITIONS,
  calculateProfileDoorCutList,
} from '@/lib/profile-door-constants';
import { generateProfileDoorPDF } from '@/lib/profile-door-pdf';
import { ProfileDoorVisualizer } from '@/components/profile-door/profile-door-visualizer';
import {
  FileDown,
  Layers,
  Scissors,
  CheckCircle2,
  DoorOpen,
} from 'lucide-react';

interface ViewProfileDoorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  environmentName?: string;
  furnitureName?: string;
  door: ProfileDoorItem;
}

export function ViewProfileDoorModal({
  isOpen,
  onClose,
  clientName,
  environmentName,
  furnitureName,
  door,
}: ViewProfileDoorModalProps) {
  const [activeTab, setActiveTab] = useState<'cad' | 'cutlist'>('cad');

  if (!door) return null;

  const isPair = !!door.isPair;
  const doorType = door.doorType || 'Giro';
  const handleType = door.handleType || 'Sem Puxador';
  const hinges = door.hinges || [];
  const doorWidth = Number(door.width) || 400;
  const doorHeight = Number(door.height) || 700;
  const hingeSide = door.hingeSide || 'left';

  const cutList = calculateProfileDoorCutList({
    width: doorWidth,
    height: doorHeight,
    quantity: doorType === 'Correr' && door.doorSet ? door.doorSet.count : door.quantity || 1,
    profileWidthMM: door.profileWidthMM || 45,
    glassDiscountMM: door.glassDiscountMM || 70,
    hingesCount: hinges.length,
  });

  const handleGeneratePDF = () => {
    generateProfileDoorPDF({
      door,
      clientName: clientName || 'Não informado',
      environmentName,
      furnitureName,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-7xl h-[92vh] flex flex-col p-6 gap-4">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-headline text-xl flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-primary" />
                Visualizar Porta de Perfil de Alumínio
              </DialogTitle>
              <DialogDescription>
                Folha técnica com desenho vetorial, cotas milimétricas e especificações de corte.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {clientName && (
                <Badge variant="secondary" className="text-xs">
                  Cliente: <strong className="ml-1">{clientName}</strong>
                </Badge>
              )}
              {environmentName && (
                <Badge variant="outline" className="text-xs">
                  Ambiente: <strong className="ml-1">{environmentName}</strong>
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 gap-6">
          {/* COLUNA ESQUERDA: VISUALIZADOR CAD INTERATIVO & LISTA DE CORTE */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-muted/20 rounded-xl border p-3 gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex items-center justify-between pb-2">
                <TabsList className="h-8">
                  <TabsTrigger value="cad" className="text-xs gap-1.5 px-3">
                    <Layers className="h-3.5 w-3.5" />
                    Desenho CAD & Cotas
                  </TabsTrigger>
                  <TabsTrigger value="cutlist" className="text-xs gap-1.5 px-3">
                    <Scissors className="h-3.5 w-3.5" />
                    Lista de Corte Industrial
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    {cutList.quantity} folha(s) {isPair ? '(Par)' : ''}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-normal">
                    Vidro: {cutList.totalGlassAreaM2.toFixed(2)} m²
                  </Badge>
                </div>
              </div>

              {/* ABA 1: VISUALIZADOR CAD */}
              <TabsContent
                value="cad"
                className="flex-1 min-h-0 m-0 relative rounded-lg border overflow-hidden bg-background"
              >
                <ProfileDoorVisualizer door={door} clientName={clientName} />
              </TabsContent>

              {/* ABA 2: LISTA DE CORTE */}
              <TabsContent
                value="cutlist"
                className="flex-1 min-h-0 m-0 p-4 rounded-lg border overflow-y-auto bg-background space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Medidas de Corte para Fabricação</h4>
                    <p className="text-xs text-muted-foreground">
                      Especificações para o modelo de perfil {door.profileModel || 'Perfil 45'}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Card do Vidro */}
                  <div className="p-3.5 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Scissors className="h-4 w-4" />
                        Chapa de Vidro
                      </span>
                      <Badge variant="outline" className="text-[11px] font-mono border-amber-500/30">
                        {door.glassType}
                      </Badge>
                    </div>
                    <div className="pt-1">
                      <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
                        {cutList.glassWidth} × {cutList.glassHeight}{' '}
                        <span className="text-xs font-normal text-muted-foreground">mm</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Medida de corte por peça
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20 text-xs">
                      <div>
                        <span className="text-muted-foreground">Qtd Peças:</span>
                        <p className="font-bold">{cutList.quantity} un</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Área Total:</span>
                        <p className="font-bold font-mono">{cutList.totalGlassAreaM2.toFixed(3)} m²</p>
                      </div>
                    </div>
                  </div>

                  {/* Card dos Perfis de Alumínio */}
                  <div className="p-3.5 rounded-lg border bg-blue-500/5 border-blue-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        Perfis de Alumínio (Corte 45º)
                      </span>
                      <Badge variant="outline" className="text-[11px] font-mono border-blue-500/30">
                        {door.profileColor}
                      </Badge>
                    </div>
                    <div className="pt-1 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Perfis Verticais (Altura):</span>
                        <span className="font-mono font-bold">
                          {cutList.verticalProfilesCount} un × {cutList.verticalProfileLengthMM} mm
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Perfis Horizontais (Largura):</span>
                        <span className="font-mono font-bold">
                          {cutList.horizontalProfilesCount} un × {cutList.horizontalProfileLengthMM} mm
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/20 text-xs">
                      <div>
                        <span className="text-muted-foreground">Metragem Total:</span>
                        <p className="font-bold font-mono">{cutList.totalLinearMeters.toFixed(2)} ml</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cantoneiras:</span>
                        <p className="font-bold font-mono">{cutList.cornerBracketsCount} un</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ferragens */}
                <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2 text-xs">
                  <h5 className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Ferragens & Componentes
                  </h5>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-muted-foreground">Dobradiças:</span>
                      <p className="font-medium">
                        {doorType === 'Giro'
                          ? `${cutList.hingesTotal} un (Caneco 35mm - ${hingeSide === 'left' ? 'Esquerda' : 'Direita'})`
                          : 'N/A (Correr)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Puxador:</span>
                      <p className="font-medium">
                        {handleType !== 'Sem Puxador' ? `${handleType} (${HANDLE_POSITIONS[door.handlePosition || 'right']})` : 'Sem puxador'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Escova Vedadora:</span>
                      <p className="font-medium font-mono">~{cutList.sealGasketMeters.toFixed(1)} metros</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* COLUNA DIREITA: ESPECIFICAÇÕES TÉCNICAS */}
          <div className="w-[340px] flex-shrink-0 space-y-3 overflow-y-auto pr-2 border-l pl-5 text-sm">
            <h3 className="font-bold text-base pb-1 border-b">Ficha Técnica</h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Tipo de Abertura:</span>
                <span className="font-semibold text-right">
                  {doorType} {door.slidingSystem ? `(${door.slidingSystem})` : ''}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Dimensões / Folha:</span>
                <span className="font-mono font-semibold text-right">
                  {doorWidth} × {doorHeight} mm
                </span>
              </div>

              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Quantidade de Folhas:</span>
                <span className="font-semibold text-right">
                  {cutList.quantity} folha(s) {isPair ? '(Par)' : ''}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Modelo do Perfil:</span>
                <span className="font-semibold text-right">{door.profileModel || 'Perfil 45'}</span>
              </div>

              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Acabamento do Alumínio:</span>
                <span className="font-semibold text-right">{door.profileColor}</span>
              </div>

              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Tipo de Vidro:</span>
                <span className="font-semibold text-right">{door.glassType}</span>
              </div>

              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Puxador:</span>
                <span className="font-semibold text-right">{handleType}</span>
              </div>

              {handleType !== 'Sem Puxador' && (
                <div className="pl-2 space-y-1 py-1 border-b text-[11px] text-muted-foreground">
                  {door.doorSet?.doors && door.doorSet.doors.length > 1 ? (
                    door.doorSet.doors.map((d, index) => (
                      <div key={index} className="flex justify-between py-0.5 border-b last:border-0">
                        <span className="font-semibold text-foreground">Porta {index + 1}:</span>
                        <span className="text-right">
                          {d.hingeSide ? `${d.hingeSide === 'left' ? 'Dobradiça Esq' : 'Dobradiça Dir'} • ` : ''}
                          Puxador {HANDLE_POSITIONS[d.handlePosition] || d.handlePosition}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span>Posição:</span>
                      <span className="font-medium text-foreground">{HANDLE_POSITIONS[door.handlePosition || 'right']}</span>
                    </div>
                  )}
                  {handleType === 'Aba Usinada' && (
                    <>
                      <div className="flex justify-between">
                        <span>Comprimento:</span>
                        <span className="font-medium text-foreground">{door.handleWidth || 150} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dist. Canto:</span>
                        <span className="font-medium text-foreground">{door.handleOffset || 50} mm</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {doorType === 'Giro' && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Lado das Dobradiças:</span>
                    <Badge variant="outline" className="text-[11px]">
                      {hingeSide === 'left' ? 'Esquerda' : 'Direita'}
                    </Badge>
                  </div>
                  <div className="p-2 bg-muted/40 rounded-md space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                      Furações Caneco Ø35mm:
                    </span>
                    {hinges.map((h, i) => (
                      <div key={i} className="flex justify-between text-[11px] font-mono">
                        <span>Furo #{i + 1}:</span>
                        <span className="font-semibold">
                          {h.position} mm base ({Math.max(0, doorHeight - h.position)} mm topo)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <DialogFooter className="mt-2 pt-3 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Folha de produção pronta para impressão ou envio ao fornecedor.
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button type="button" onClick={handleGeneratePDF} className="gap-1.5">
              <FileDown className="h-4 w-4" />
              Gerar PDF de Produção
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
