'use client';

import React, { useRef, useState, useEffect } from 'react';
import type { ProfileDoorItem } from '@/lib/types';
import {
  PROFILE_COLORS,
  GLASS_TYPES,
  HANDLE_POSITIONS,
} from '@/lib/profile-door-constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Eye, Layers } from 'lucide-react';

interface ProfileDoorVisualizerProps {
  door: Partial<ProfileDoorItem>;
  clientName?: string;
  environmentName?: string;
  className?: string;
  showDimensions?: boolean;
}

export function ProfileDoorVisualizer({
  door,
  clientName,
  environmentName,
  className,
  showDimensions = true,
}: ProfileDoorVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<'realistic' | 'cad'>('realistic');

  // Medidas reais em milímetros
  const doorWidth = Math.max(100, Number(door.width) || 400);
  const doorHeight = Math.max(100, Number(door.height) || 700);
  const doorType = door.doorType || 'Giro';
  const isPair = !!door.isPair;
  const hinges = door.hinges || [];
  const handleType = door.handleType || 'Sem Puxador';
  const profileColor = door.profileColor || 'Preto Fosco';
  const glassType = door.glassType || 'Incolor 4mm';
  const profileWidthMM = door.profileWidthMM || 45;

  // Determinar quantidade de folhas
  let doorCount = 1;
  if (door.doorSet?.count && door.doorSet.count >= 1) {
    doorCount = door.doorSet.count;
  } else if (doorType === 'Correr') {
    doorCount = door.doorSet?.count || 1;
  } else if (doorType === 'Giro' && isPair) {
    doorCount = 2;
  }

  // Lista de portas individuais no conjunto
  const doorsConfig = Array.from({ length: doorCount }, (_, index) => {
    const existing = door.doorSet?.doors?.[index];
    if (existing) {
      return {
        handlePosition: existing.handlePosition || (index % 2 === 0 ? 'right' : 'left'),
        hingeSide: existing.hingeSide || (index % 2 === 0 ? 'left' : 'right'),
      };
    }
    // Fallback padrão: alternado em pares
    if (doorType === 'Giro') {
      const defaultHinge = isPair ? (index % 2 === 0 ? 'left' : 'right') : (door.hingeSide || 'left');
      const defaultHandle = isPair ? (index % 2 === 0 ? 'right' : 'left') : (door.handlePosition || 'right');
      return {
        handlePosition: defaultHandle,
        hingeSide: defaultHinge,
      };
    }
    return {
      handlePosition: door.handlePosition || 'left',
      hingeSide: 'none' as const,
    };
  });

  // Obter configurações de cor e vidro
  const colorCfg =
    PROFILE_COLORS.find((c) => c.name.toLowerCase() === profileColor.toLowerCase()) || {
      name: profileColor,
      hex: '#26292e',
      borderHex: '#141618',
      textColor: '#ffffff',
    };

  const glassCfg =
    GLASS_TYPES.find((g) => g.name.toLowerCase() === glassType.toLowerCase()) || {
      name: glassType,
      bgStyle: 'rgba(215, 235, 248, 0.3)',
      reflectionStyle:
        'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
      borderHex: '#cbd5e1',
      textColor: '#0f172a',
    };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const containerW = containerSize.width;
  const containerH = containerSize.height;

  // Margens em pixels para abrigar as cotas sem cortes
  const padLeft = showDimensions ? 75 : 20;
  const padRight = showDimensions ? (handleType === 'Aba Usinada' ? 140 : 75) : 20;
  const padTop = showDimensions ? 48 : 20;
  const padBottom = showDimensions ? 46 : 20;

  const availW = Math.max(60, containerW - padLeft - padRight);
  const availH = Math.max(60, containerH - padTop - padBottom);

  const gap = 12; // espaçamento entre portas em px
  const totalGapW = (doorCount - 1) * gap;
  const netAvailW = Math.max(40, availW - totalGapW);
  const aspectRatio = doorWidth / doorHeight;

  let singleDoorW: number;
  let singleDoorH: number;

  const maxHFromW = netAvailW / doorCount / aspectRatio;
  if (maxHFromW <= availH) {
    singleDoorH = maxHFromW;
    singleDoorW = singleDoorH * aspectRatio;
  } else {
    singleDoorH = availH;
    singleDoorW = singleDoorH * aspectRatio;
  }

  const totalDoorsW = doorCount * singleDoorW + totalGapW;
  const totalDoorsH = singleDoorH;

  // Ponto de origem para centralizar o conjunto de portas
  const originX = padLeft + (availW - totalDoorsW) / 2;
  const originY = padTop + (availH - totalDoorsH) / 2;

  const getDoorX = (index: number) => originX + index * (singleDoorW + gap);
  const doorTop = originY;
  const doorBottom = originY + singleDoorH;

  // Espessura do perfil na tela (proporcional em px)
  const profileBorderThicknessPx = Math.max(4, (profileWidthMM / doorWidth) * singleDoorW);

  // Renderizador de Puxador
  const renderHandle = (
    pos: 'left' | 'right' | 'top' | 'bottom' | 'both' | 'none',
    doorIndex: number
  ) => {
    if (handleType === 'Sem Puxador' || pos === 'none') return null;

    const positionsToDraw = pos === 'both' ? ['left', 'right'] : [pos];
    const handleThicknessPx = Math.max(5, Math.min(10, profileBorderThicknessPx * 0.45));

    return (
      <>
        {positionsToDraw.map((p) => {
          const currentPos = p as 'left' | 'right' | 'top' | 'bottom';
          const style: React.CSSProperties = {
            position: 'absolute',
            zIndex: 20,
            borderRadius: viewMode === 'cad' ? '0px' : '1px',
          };

          if (viewMode === 'cad') {
            style.backgroundColor = '#ef4444';
            style.border = '1px solid #b91c1c';
          } else {
            style.background =
              handleType === 'Perfil Puxador Integrado'
                ? colorCfg.hex
                : 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';
            style.boxShadow = '0 2px 5px rgba(0,0,0,0.35)';
          }

          if (currentPos === 'top' || currentPos === 'bottom') {
            style.height = `${handleThicknessPx}px`;
            if (handleType === 'Linear inteiro') {
              style.width = '100%';
              style.left = 0;
            } else {
              const hW = door.handleWidth || 150;
              const hOff = door.handleOffset || 50;
              style.width = `${Math.min(100, (hW / doorWidth) * 100)}%`;
              style.left = `${Math.min(90, (hOff / doorWidth) * 100)}%`;
            }
            if (currentPos === 'top') style.top = `${profileBorderThicknessPx * 0.15}px`;
            else style.bottom = `${profileBorderThicknessPx * 0.15}px`;
          } else {
            style.width = `${handleThicknessPx}px`;
            if (handleType === 'Linear inteiro') {
              style.height = '100%';
              style.top = 0;
            } else {
              const handleWidthMM = Math.max(10, Number(door.handleWidth) || 150);
              const handleOffsetMM = Math.max(0, Number(door.handleOffset) || 0);
              const isFromTop = door.handleOffsetFrom === 'top';
              const distTopMM = isFromTop ? handleOffsetMM : Math.max(0, doorHeight - handleOffsetMM - handleWidthMM);
              const distBottomMM = isFromTop ? Math.max(0, doorHeight - handleOffsetMM - handleWidthMM) : handleOffsetMM;

              style.height = `${Math.min(100, (handleWidthMM / doorHeight) * 100)}%`;
              if (isFromTop) {
                style.top = `${Math.min(100, (distTopMM / doorHeight) * 100)}%`;
              } else {
                style.bottom = `${Math.min(100, (distBottomMM / doorHeight) * 100)}%`;
              }
            }
            if (currentPos === 'left') style.left = `${profileBorderThicknessPx * 0.15}px`;
            else style.right = `${profileBorderThicknessPx * 0.15}px`;
          }

          return (
            <div
              key={`${doorIndex}-${p}-${currentPos}`}
              style={style}
              title={`Puxador: ${handleType} (${HANDLE_POSITIONS[currentPos] || currentPos})`}
              className="transition-all duration-200"
            />
          );
        })}
      </>
    );
  };

  // Renderizador de Dobradiças em uma folha
  const renderHinges = (currentHingeSide: 'left' | 'right') => {
    if (doorType !== 'Giro' || hinges.length === 0) return null;

    const hingeDiamMM = 35;
    const hingeDiamPx = Math.max(9, Math.min(20, (hingeDiamMM / doorWidth) * singleDoorW));

    return (
      <>
        {hinges.map((hinge, idx) => {
          const hingePosMM = Number(hinge.position) || 0;
          const posPercentFromBottom = Math.max(0, Math.min(100, (hingePosMM / doorHeight) * 100));

          const style: React.CSSProperties = {
            position: 'absolute',
            bottom: `calc(${posPercentFromBottom}% - ${hingeDiamPx / 2}px)`,
            width: `${hingeDiamPx}px`,
            height: `${hingeDiamPx}px`,
            borderRadius: '50%',
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          };

          const centerOffsetInProfile = profileBorderThicknessPx / 2 - hingeDiamPx / 2;
          if (currentHingeSide === 'left') {
            style.left = `${centerOffsetInProfile}px`;
          } else {
            style.right = `${centerOffsetInProfile}px`;
          }

          if (viewMode === 'cad') {
            style.backgroundColor = '#ef4444';
            style.border = '1.5px solid #ffffff';
            style.boxShadow = '0 0 0 1px #991b1b';
          } else {
            style.background =
              'radial-gradient(circle at 35% 35%, #fca5a5 0%, #ef4444 60%, #991b1b 100%)';
            style.boxShadow = '0 1px 3px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.4)';
          }

          return (
            <div
              key={idx}
              style={style}
              title={`Furo ${idx + 1}: ${hingePosMM}mm da base`}
              className="group cursor-help transition-transform hover:scale-125"
            >
              <div className="w-[3px] h-[3px] bg-white rounded-full opacity-90" />
            </div>
          );
        })}
      </>
    );
  };

  const isCad = viewMode === 'cad';

  return (
    <div className={cn('flex flex-col w-full h-full relative select-none', className)}>
      {/* Barra superior de status e controles */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background/80 backdrop-blur text-xs z-30">
        <div className="flex items-center gap-2">
          {(clientName || environmentName) && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] max-w-[220px] truncate font-medium">
              {clientName || ''}{clientName && environmentName ? ' • ' : ''}{environmentName || ''}
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-[10px]">
            {doorWidth} × {doorHeight} mm {doorCount > 1 ? `(${doorCount} Folhas)` : ''}
          </Badge>
          <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
            {door.profileModel || 'Perfil 45'} • {profileColor}
          </Badge>
          {doorType === 'Giro' && hinges.length > 0 && (
            <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">
              {hinges.length} Dobradiças / Folha
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => setViewMode('realistic')}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors',
              viewMode === 'realistic'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Visualização realista dos materiais"
          >
            <Eye className="h-3 w-3" />
            <span className="hidden md:inline">Realista</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cad')}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors',
              viewMode === 'cad'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Visualização técnica estilo CAD"
          >
            <Layers className="h-3 w-3" />
            <span className="hidden md:inline">CAD</span>
          </button>
        </div>
      </div>

      {/* Prancheta gráfica com folhas e cotas */}
      <div
        ref={containerRef}
        className="flex-1 w-full relative overflow-hidden bg-dot-pattern"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {containerW > 0 && containerH > 0 && (
          <>
            {/* 1. FOLHAS DAS PORTAS (POSICIONAMENTO EM PIXELS EXATOS) */}
            {doorsConfig.map((cfg, index) => {
              const dX = getDoorX(index);
              const label = doorCount > 1 ? `Porta ${index + 1}` : doorType;

              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: `${dX}px`,
                    top: `${doorTop}px`,
                    width: `${singleDoorW}px`,
                    height: `${singleDoorH}px`,
                  }}
                  className="flex flex-col items-center select-none transition-all duration-200"
                >
                  {/* Moldura da Folha (Cantos 100% Retos) */}
                  <div
                    className={cn(
                      'relative w-full h-full rounded-none overflow-hidden flex items-center justify-center transition-all duration-300',
                      isCad ? 'border-2 border-slate-700 bg-slate-200 dark:bg-slate-800' : 'shadow-xl'
                    )}
                    style={{
                      padding: `${profileBorderThicknessPx}px`,
                      backgroundColor: isCad ? '#e2e8f0' : colorCfg.hex,
                      border: isCad ? '1.5px solid #0f172a' : `1px solid ${colorCfg.borderHex}`,
                      boxShadow: isCad ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.3)',
                      borderRadius: 0,
                    }}
                  >
                    {/* Chanfros 45º */}
                    {!isCad && (
                      <>
                        <div
                          className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30"
                          style={{
                            background:
                              'linear-gradient(45deg, transparent 49.5%, rgba(255,255,255,0.4) 50%, transparent 50.5%)',
                          }}
                        />
                        <div
                          className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-30"
                          style={{
                            background:
                              'linear-gradient(-45deg, transparent 49.5%, rgba(255,255,255,0.4) 50%, transparent 50.5%)',
                          }}
                        />
                      </>
                    )}

                    {/* Vidro (Cantos 100% Retos) */}
                    <div
                      className="relative w-full h-full rounded-none flex flex-col items-center justify-center overflow-hidden transition-all duration-300 p-2"
                      style={{
                        backgroundColor: isCad ? '#f8fafc' : glassCfg.bgStyle,
                        border: `1px solid ${glassCfg.borderHex}`,
                        boxShadow: isCad ? 'none' : 'inset 0 0 15px rgba(0,0,0,0.12)',
                        borderRadius: 0,
                      }}
                    >
                      {!isCad && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: glassCfg.reflectionStyle }}
                        />
                      )}

                      {glassCfg.isRibbed && !isCad && (
                        <div
                          className="absolute inset-0 pointer-events-none opacity-40"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 6px)',
                          }}
                        />
                      )}

                      <div className="relative z-10 text-center px-1.5 py-0.5 rounded bg-black/25 dark:bg-black/45 backdrop-blur-sm border border-white/10 max-w-[95%]">
                        <p
                          className="text-[10px] font-bold tracking-tight truncate"
                          style={{ color: glassCfg.textColor }}
                        >
                          {label}
                        </p>
                        <p
                          className="text-[8.5px] font-medium opacity-90 truncate"
                          style={{ color: glassCfg.textColor }}
                        >
                          {glassType}
                        </p>
                      </div>
                    </div>

                    {/* Dobradiças individuais desta folha */}
                    {cfg.hingeSide && cfg.hingeSide !== 'none' && renderHinges(cfg.hingeSide as 'left' | 'right')}

                    {/* Puxador individual desta folha */}
                    {renderHandle(cfg.handlePosition as any, index)}
                  </div>
                </div>
              );
            })}

            {/* 2. CAMADA VETORIAL SVG DE COTAS MILIMÉTRICAS COM COORDENADAS EXATAS */}
            {showDimensions && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={containerW}
                height={containerH}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* Setas CAD azuis para largura e altura */}
                  <marker
                    id="arrow-end-cad"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 2 L 8 5 L 0 8 z" fill="#0284c7" />
                  </marker>
                  <marker
                    id="arrow-start-cad"
                    viewBox="0 0 10 10"
                    refX="3"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                  >
                    <path d="M 8 2 L 0 5 L 8 8 z" fill="#0284c7" />
                  </marker>
                  {/* Setas CAD âmbar para cotas de puxador aba usinada */}
                  <marker
                    id="arrow-end-amber"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 2 L 8 5 L 0 8 z" fill="#d97706" />
                  </marker>
                  <marker
                    id="arrow-start-amber"
                    viewBox="0 0 10 10"
                    refX="3"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                  >
                    <path d="M 8 2 L 0 5 L 8 8 z" fill="#d97706" />
                  </marker>
                </defs>

                {/* --- A. COTA DE LARGURA TOTAL NO TOPO --- */}
                <g className="text-[#0284c7]">
                  {/* Linha de chamada esquerda */}
                  <line
                    x1={originX}
                    y1={doorTop - 2}
                    x2={originX}
                    y2={originX <= 0 ? 0 : doorTop - 22}
                    stroke="#0284c7"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  {/* Linha de chamada direita */}
                  <line
                    x1={originX + totalDoorsW}
                    y1={doorTop - 2}
                    x2={originX + totalDoorsW}
                    y2={originX <= 0 ? 0 : doorTop - 22}
                    stroke="#0284c7"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  {/* Linha de cota principal com setas */}
                  <line
                    x1={originX}
                    y1={doorTop - 16}
                    x2={originX + totalDoorsW}
                    y2={doorTop - 16}
                    stroke="#0284c7"
                    strokeWidth="1.5"
                    markerStart="url(#arrow-start-cad)"
                    markerEnd="url(#arrow-end-cad)"
                  />
                  {/* Texto de cota superior */}
                  <text
                    x={originX + totalDoorsW / 2}
                    y={doorTop - 21}
                    fill="#0284c7"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {doorCount > 1
                      ? `${doorWidth} mm cada • Total: ${doorWidth * doorCount} mm`
                      : `${doorWidth} mm`}
                  </text>
                </g>

                {/* --- B. COTAS INDIVIDUAIS DE LARGURA POR FOLHA (SE HOUVER MAIS DE 1) --- */}
                {doorCount > 1 &&
                  doorsConfig.map((_, i) => {
                    const dX1 = getDoorX(i);
                    const dX2 = dX1 + singleDoorW;
                    const cotaY = doorBottom + 16;
                    return (
                      <g key={`ind-w-${i}`} className="text-[#0284c7]">
                        <line
                          x1={dX1}
                          y1={doorBottom + 2}
                          x2={dX1}
                          y2={cotaY + 6}
                          stroke="#94a3b8"
                          strokeWidth="0.8"
                          strokeDasharray="2,2"
                        />
                        <line
                          x1={dX2}
                          y1={doorBottom + 2}
                          x2={dX2}
                          y2={cotaY + 6}
                          stroke="#94a3b8"
                          strokeWidth="0.8"
                          strokeDasharray="2,2"
                        />
                        <line
                          x1={dX1}
                          y1={cotaY}
                          x2={dX2}
                          y2={cotaY}
                          stroke="#0284c7"
                          strokeWidth="1"
                          markerStart="url(#arrow-start-cad)"
                          markerEnd="url(#arrow-end-cad)"
                        />
                        <text
                          x={(dX1 + dX2) / 2}
                          y={cotaY + 12}
                          fill="#0284c7"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {doorWidth} mm
                        </text>
                      </g>
                    );
                  })}

                {/* --- C. COTAS VERTICAIS NO LADO DIREITO (ALTURA TOTAL & USINAGEM DA ABA) --- */}
                {(() => {
                  const rightEdge = originX + totalDoorsW;
                  const isAbaUsinada = handleType === 'Aba Usinada';

                  // Parâmetros de usinagem da aba
                  const handleWidthMM = Math.max(10, Number(door.handleWidth) || 150);
                  const handleOffsetMM = Math.max(0, Number(door.handleOffset) || 0);
                  const isFromTop = door.handleOffsetFrom === 'top';
                  const distTopMM = isFromTop
                    ? handleOffsetMM
                    : Math.max(0, doorHeight - handleOffsetMM - handleWidthMM);
                  const distBottomMM = isFromTop
                    ? Math.max(0, doorHeight - handleOffsetMM - handleWidthMM)
                    : handleOffsetMM;

                  const hTopY = doorTop + (distTopMM / doorHeight) * singleDoorH;
                  const hBottomY = hTopY + (handleWidthMM / doorHeight) * singleDoorH;
                  const hSegmentH = hBottomY - hTopY;
                  const topSegmentH = hTopY - doorTop;
                  const bottomSegmentH = doorBottom - hBottomY;

                  // Posições X das colunas de cotas externas à direita
                  const cotaHandleX = rightEdge + 30;
                  const cotaHeightX = isAbaUsinada ? cotaHandleX + 62 : rightEdge + 24;

                  // Identificar a primeira porta com puxador para desenhar o indicador local na folha
                  const firstHandleDoorIdx = doorsConfig.findIndex((cfg) => cfg.handlePosition !== 'none');
                  const hasHandleDoor = firstHandleDoorIdx !== -1;
                  const handleDoorCfg = hasHandleDoor ? doorsConfig[firstHandleDoorIdx] : null;
                  const isRightHandle = handleDoorCfg
                    ? handleDoorCfg.handlePosition === 'right' || handleDoorCfg.handlePosition === 'both'
                    : true;
                  const handleDoorX = hasHandleDoor ? getDoorX(firstHandleDoorIdx) : 0;
                  const localHandleX = isRightHandle ? handleDoorX + singleDoorW : handleDoorX;

                  // Helper para desenhar badge com fundo opaco (máscara de leitura para nunca colidir com linhas)
                  const renderCotaBadge = (
                    cx: number,
                    cy: number,
                    text: string,
                    variant: 'amber' | 'blue' | 'amber-highlight'
                  ) => {
                    const textLen = text.length;
                    const bw = Math.max(46, textLen * 6.5 + 12);
                    const bh = 17;
                    const isBlue = variant === 'blue';
                    const isHighlight = variant === 'amber-highlight';

                    const stroke = isBlue ? '#0284c7' : isHighlight ? '#b45309' : '#d97706';
                    const fill = isCad
                      ? isHighlight
                        ? '#fef3c7'
                        : '#ffffff'
                      : isHighlight
                      ? '#451a03'
                      : '#0f172a';
                    const textFill = isCad
                      ? isBlue
                        ? '#0284c7'
                        : isHighlight
                        ? '#92400e'
                        : '#b45309'
                      : isBlue
                      ? '#38bdf8'
                      : isHighlight
                      ? '#fde047'
                      : '#fde68a';

                    return (
                      <g className="select-none pointer-events-none" key={`badge-${text}-${cx}-${cy}`}>
                        <rect
                          x={cx - bw / 2}
                          y={cy - bh / 2}
                          width={bw}
                          height={bh}
                          rx={3}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={isHighlight ? '1.5' : '1'}
                          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))' }}
                        />
                        <text
                          x={cx}
                          y={cy + 0.5}
                          fill={textFill}
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {text}
                        </text>
                      </g>
                    );
                  };

                  return (
                    <g key="right-side-vertical-cotas">
                      {/* 1. SE FOR ABA USINADA: COLUNA DE USINAGEM DA ABA */}
                      {isAbaUsinada && (
                        <g className="text-amber-600">
                          {/* Linhas de extensão horizontais a partir da borda do conjunto até a cota */}
                          <line
                            x1={rightEdge + 2}
                            y1={doorTop}
                            x2={cotaHandleX + 8}
                            y2={doorTop}
                            stroke="#d97706"
                            strokeWidth="0.8"
                            strokeDasharray="2,2"
                          />
                          <line
                            x1={rightEdge + 2}
                            y1={hTopY}
                            x2={cotaHandleX + 8}
                            y2={hTopY}
                            stroke="#d97706"
                            strokeWidth="1"
                            strokeDasharray="3,2"
                          />
                          <line
                            x1={rightEdge + 2}
                            y1={hBottomY}
                            x2={cotaHandleX + 8}
                            y2={hBottomY}
                            stroke="#d97706"
                            strokeWidth="1"
                            strokeDasharray="3,2"
                          />
                          <line
                            x1={rightEdge + 2}
                            y1={doorBottom}
                            x2={cotaHandleX + 8}
                            y2={doorBottom}
                            stroke="#d97706"
                            strokeWidth="0.8"
                            strokeDasharray="2,2"
                          />

                          {/* Se a porta com o puxador não for a última, linha de alinhamento suave */}
                          {hasHandleDoor && firstHandleDoorIdx !== doorCount - 1 && (
                            <line
                              x1={localHandleX}
                              y1={(hTopY + hBottomY) / 2}
                              x2={rightEdge}
                              y2={(hTopY + hBottomY) / 2}
                              stroke="#d97706"
                              strokeWidth="0.8"
                              strokeDasharray="2,3"
                              opacity="0.35"
                            />
                          )}

                          {/* Indicador suave na folha onde está o puxador */}
                          {hasHandleDoor && (
                            <circle
                              cx={localHandleX + (isRightHandle ? 3 : -3)}
                              cy={(hTopY + hBottomY) / 2}
                              r="2.5"
                              fill="#d97706"
                            />
                          )}

                          {/* SEGMENTO A: DISTÂNCIA DO TOPO (se houver) */}
                          {distTopMM > 0 && topSegmentH > 4 && (
                            <g>
                              <line
                                x1={cotaHandleX}
                                y1={doorTop}
                                x2={cotaHandleX}
                                y2={hTopY}
                                stroke="#d97706"
                                strokeWidth="1.2"
                                markerStart="url(#arrow-start-amber)"
                                markerEnd="url(#arrow-end-amber)"
                              />
                              {topSegmentH >= 24 ? (
                                renderCotaBadge(cotaHandleX, (doorTop + hTopY) / 2, `${distTopMM} mm topo`, 'amber')
                              ) : (
                                <>
                                  <line
                                    x1={cotaHandleX}
                                    y1={(doorTop + hTopY) / 2}
                                    x2={cotaHandleX + 16}
                                    y2={(doorTop + hTopY) / 2}
                                    stroke="#d97706"
                                    strokeWidth="0.8"
                                  />
                                  {renderCotaBadge(cotaHandleX + 46, (doorTop + hTopY) / 2, `${distTopMM} mm topo`, 'amber')}
                                </>
                              )}
                            </g>
                          )}

                          {/* SEGMENTO B: COMPRIMENTO DA ABA */}
                          {hSegmentH > 2 && (
                            <g>
                              <line
                                x1={cotaHandleX}
                                y1={hTopY}
                                x2={cotaHandleX}
                                y2={hBottomY}
                                stroke="#d97706"
                                strokeWidth="1.8"
                                markerStart="url(#arrow-start-amber)"
                                markerEnd="url(#arrow-end-amber)"
                              />
                              {hSegmentH >= 24 ? (
                                renderCotaBadge(cotaHandleX, (hTopY + hBottomY) / 2, `${handleWidthMM} mm (Aba)`, 'amber-highlight')
                              ) : (
                                <>
                                  <line
                                    x1={cotaHandleX}
                                    y1={(hTopY + hBottomY) / 2}
                                    x2={cotaHandleX + 16}
                                    y2={(hTopY + hBottomY) / 2}
                                    stroke="#d97706"
                                    strokeWidth="1"
                                  />
                                  {renderCotaBadge(cotaHandleX + 48, (hTopY + hBottomY) / 2, `${handleWidthMM} mm (Aba)`, 'amber-highlight')}
                                </>
                              )}
                            </g>
                          )}

                          {/* SEGMENTO C: DISTÂNCIA DA BASE (se houver) */}
                          {distBottomMM > 0 && bottomSegmentH > 4 && (
                            <g>
                              <line
                                x1={cotaHandleX}
                                y1={hBottomY}
                                x2={cotaHandleX}
                                y2={doorBottom}
                                stroke="#d97706"
                                strokeWidth="1.2"
                                markerStart="url(#arrow-start-amber)"
                                markerEnd="url(#arrow-end-amber)"
                              />
                              {bottomSegmentH >= 24 ? (
                                renderCotaBadge(cotaHandleX, (hBottomY + doorBottom) / 2, `${distBottomMM} mm base`, 'amber')
                              ) : (
                                <>
                                  <line
                                    x1={cotaHandleX}
                                    y1={(hBottomY + doorBottom) / 2}
                                    x2={cotaHandleX + 16}
                                    y2={(hBottomY + doorBottom) / 2}
                                    stroke="#d97706"
                                    strokeWidth="0.8"
                                  />
                                  {renderCotaBadge(cotaHandleX + 46, (hBottomY + doorBottom) / 2, `${distBottomMM} mm base`, 'amber')}
                                </>
                              )}
                            </g>
                          )}
                        </g>
                      )}

                      {/* 2. COTA DE ALTURA TOTAL (COLUNA AZUL CAD) */}
                      <g className="text-[#0284c7]">
                        {/* Linhas de chamada até a coluna de altura */}
                        <line
                          x1={rightEdge + 2}
                          y1={doorTop}
                          x2={cotaHeightX + 8}
                          y2={doorTop}
                          stroke="#0284c7"
                          strokeWidth="0.8"
                          strokeDasharray="2,2"
                        />
                        <line
                          x1={rightEdge + 2}
                          y1={doorBottom}
                          x2={cotaHeightX + 8}
                          y2={doorBottom}
                          stroke="#0284c7"
                          strokeWidth="0.8"
                          strokeDasharray="2,2"
                        />
                        {/* Linha vertical principal com setas */}
                        <line
                          x1={cotaHeightX}
                          y1={doorTop}
                          x2={cotaHeightX}
                          y2={doorBottom}
                          stroke="#0284c7"
                          strokeWidth="1.5"
                          markerStart="url(#arrow-start-cad)"
                          markerEnd="url(#arrow-end-cad)"
                        />
                        {/* Badge de altura total com máscara */}
                        {renderCotaBadge(cotaHeightX, doorTop + singleDoorH / 2, `${doorHeight} mm`, 'blue')}
                      </g>
                    </g>
                  );
                })()}

                {/* --- D. COTAS DE DISTÂNCIA DAS DOBRADIÇAS NA LATERAL ESQUERDA --- */}
                {doorType === 'Giro' && hinges.length > 0 && (
                  <g className="text-red-500">
                    {/* Linha de base da porta */}
                    <line
                      x1={originX - 35}
                      y1={doorBottom}
                      x2={originX}
                      y2={doorBottom}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="3,2"
                    />
                    <text
                      x={originX - 38}
                      y={doorBottom + 3}
                      fill="#64748b"
                      fontSize="8.5"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      Base 0
                    </text>

                    {/* Cada furo com linha de cota lateral e valor da base */}
                    {hinges.map((hinge, idx) => {
                      const posMM = Number(hinge.position) || 0;
                      const yHinge = doorBottom - (posMM / doorHeight) * singleDoorH;

                      return (
                        <g key={`hinge-cota-${idx}`}>
                          {/* Linha de chamada até a dobradiça */}
                          <line
                            x1={originX - 22}
                            y1={yHinge}
                            x2={originX}
                            y2={yHinge}
                            stroke="#ef4444"
                            strokeWidth="1.2"
                          />
                          {/* Ponto indicador vermelho */}
                          <circle cx={originX - 22} cy={yHinge} r="2.5" fill="#ef4444" />
                          {/* Texto milimétrico com a cota da base */}
                          <text
                            x={originX - 26}
                            y={yHinge + 3}
                            fill="#ef4444"
                            fontSize="9.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            {posMM}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>
            )}
          </>
        )}
      </div>

      {/* Rodapé explicativo da prancheta */}
      <div className="flex items-center justify-between px-3 py-1 bg-muted/40 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            Caneco Ø35mm (Furações à esquerda da base)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-xs bg-red-600" />
            Puxador: {handleType}
          </span>
          {handleType === 'Aba Usinada' && (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <span className="inline-block w-2 h-2 rounded-xs bg-amber-500" />
              Cotas de usinagem (Tamanho e Posições)
            </span>
          )}
        </div>
        <span>Cotas milimétricas (mm)</span>
      </div>
    </div>
  );
}
