import jsPDF from 'jspdf';
import type { ProfileDoorItem } from '@/lib/types';
import {
  HANDLE_POSITIONS,
  calculateProfileDoorCutList,
  PROFILE_COLORS,
  GLASS_TYPES,
} from '@/lib/profile-door-constants';

export interface GenerateProfileDoorPDFParams {
  door: ProfileDoorItem;
  clientName?: string;
  environmentName?: string;
  furnitureName?: string;
}

export function generateProfileDoorPDF({
  door,
  clientName = 'Não informado',
  environmentName,
  furnitureName,
}: GenerateProfileDoorPDFParams) {
  // Configuração paisagem A4: 297mm x 210mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210
  const margin = 12;

  const profileWidthMM = door.profileWidthMM || 45;
  const glassDiscountMM = door.glassDiscountMM || 70;
  const doorWidth = Number(door.width) || 400;
  const doorHeight = Number(door.height) || 700;
  const quantity = Number(door.quantity) || 1;
  const doorType = door.doorType || 'Giro';
  const hinges = door.hinges || [];
  const hingeSide = door.hingeSide || 'left';
  const isPair = !!door.isPair;
  const handleType = door.handleType || 'Sem Puxador';
  const handlePosition = door.handlePosition || 'left';

  const cutList = calculateProfileDoorCutList({
    width: doorWidth,
    height: doorHeight,
    quantity: doorType === 'Correr' && door.doorSet ? door.doorSet.count : quantity,
    profileWidthMM,
    glassDiscountMM,
    hingesCount: hinges.length,
  });

  // --- CABEÇALHO / HEADER INDUSTRIAL ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, margin, pageWidth - 2 * margin, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TORINO AMBIENTES — FOLHA TÉCNICA DE PRODUÇÃO', margin + 6, margin + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('ESQUADRIAS DE ALUMÍNIO E VIDRAÇARIA DE PRECISÃO', margin + 6, margin + 14);

  const issueDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Emissão: ${issueDate}`, pageWidth - margin - 6, margin + 8, { align: 'right' });
  doc.text(`Doc ID: PRF-${Date.now().toString().slice(-6)}`, pageWidth - margin - 6, margin + 14, { align: 'right' });

  // BARRA DE INFORMAÇÕES DO PROJETO
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, margin + 19, pageWidth - 2 * margin, 11, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', margin + 4, margin + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(clientName, margin + 20, margin + 26);

  let currentInfoX = margin + 95;
  if (environmentName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ambiente:', currentInfoX, margin + 26);
    doc.setFont('helvetica', 'normal');
    doc.text(environmentName, currentInfoX + 20, margin + 26);
    currentInfoX += 75;
  }

  if (furnitureName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Móvel:', currentInfoX, margin + 26);
    doc.setFont('helvetica', 'normal');
    doc.text(furnitureName, currentInfoX + 14, margin + 26);
  }

  // --- LAYOUT DE DUAS COLUNAS: DESENHO TÉCNICO CAD À ESQUERDA, TABELAS À DIREITA ---
  const contentTop = margin + 33;
  const contentHeight = pageHeight - contentTop - margin;
  const leftColWidth = 145;
  const rightColX = margin + leftColWidth + 8;
  const rightColWidth = pageWidth - margin - rightColX;

  // ÁREA DO DESENHO TÉCNICO (CAD CANVAS)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, contentTop, leftColWidth, contentHeight, 'FD');

  // Título da área de desenho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DESENHO TÉCNICO VETORIAL & COTAS (mm)', margin + 5, contentTop + 7);

  // Escala dinâmica para encaixar as portas com as cotas na coluna esquerda
  const drawingBoxPadding = 18;
  const availableDrawW = leftColWidth - 2 * drawingBoxPadding;
  const availableDrawH = contentHeight - 2 * drawingBoxPadding - 6;

  let doorCount = 1;
  if (door.doorSet?.count && door.doorSet.count >= 1) {
    doorCount = door.doorSet.count;
  } else if (doorType === 'Correr' && door.doorSet) {
    doorCount = Math.max(1, door.doorSet.count);
  } else if (doorType === 'Giro' && isPair) {
    doorCount = 2;
  }

  const doorGapMM = 60; // folga visual entre folhas em mm
  const totalModelWidthMM = doorWidth * doorCount + (doorCount - 1) * doorGapMM;
  const totalModelHeightMM = doorHeight;

  // Escala milimétrica para a página PDF
  const scale = Math.min(
    availableDrawW / totalModelWidthMM,
    availableDrawH / totalModelHeightMM,
    0.14 // limite superior para não ficar desproporcional em portas pequenas
  );

  const drawStartX = margin + drawingBoxPadding + (availableDrawW - totalModelWidthMM * scale) / 2;
  const drawStartY = contentTop + 14 + (availableDrawH - totalModelHeightMM * scale) / 2;

  // Helper para desenhar cotas com setas nítidas
  const drawDimension = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    text: string,
    isVertical: boolean,
    offset: number
  ) => {
    doc.setDrawColor(30, 41, 59);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setLineWidth(0.25);

    if (isVertical) {
      const dimX = x1 + offset;
      // Linhas de chamada (extension lines)
      doc.line(x1, y1, dimX + (offset > 0 ? 2 : -2), y1);
      doc.line(x2, y2, dimX + (offset > 0 ? 2 : -2), y2);
      // Linha de cota principal
      doc.line(dimX, y1, dimX, y2);
      // Setas verticais
      const arrowSize = 1.5;
      doc.triangle(dimX, y1, dimX - 0.7, y1 + arrowSize, dimX + 0.7, y1 + arrowSize, 'FD');
      doc.triangle(dimX, y2, dimX - 0.7, y2 - arrowSize, dimX + 0.7, y2 - arrowSize, 'FD');
      // Texto da cota
      const midY = (y1 + y2) / 2;
      doc.text(text, dimX + (offset > 0 ? 1.5 : -1.5), midY + 1, {
        align: offset > 0 ? 'left' : 'right',
      });
    } else {
      const dimY = y1 + offset;
      // Linhas de chamada
      doc.line(x1, y1, x1, dimY + (offset > 0 ? 2 : -2));
      doc.line(x2, y2, x2, dimY + (offset > 0 ? 2 : -2));
      // Linha de cota principal
      doc.line(x1, dimY, x2, dimY);
      // Setas horizontais
      const arrowSize = 1.5;
      doc.triangle(x1, dimY, x1 + arrowSize, dimY - 0.7, x1 + arrowSize, dimY + 0.7, 'FD');
      doc.triangle(x2, dimY, x2 - arrowSize, dimY - 0.7, x2 - arrowSize, dimY + 0.7, 'FD');
      // Texto da cota
      const midX = (x1 + x2) / 2;
      doc.text(text, midX, dimY + (offset > 0 ? 3.5 : -1.5), { align: 'center' });
    }
  };

  // Função interna para renderizar uma folha no desenho CAD do PDF
  const renderSingleDoorPDF = (
    x: number,
    y: number,
    w: number,
    h: number,
    currentHingeSide: 'left' | 'right' | 'none',
    currentHandlePos: string,
    doorLabel: string,
    doorIdx: number = 0
  ) => {
    const profW = profileWidthMM * scale;

    // Perfil externo (moldura)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.setFillColor(226, 232, 240); // tom alumínio neutro no desenho técnico
    doc.rect(x, y, w, h, 'FD');

    // Chanfros nos 4 cantos para corte a 45º
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.2);
    doc.line(x, y, x + profW, y + profW);
    doc.line(x + w, y, x + w - profW, y + profW);
    doc.line(x, y + h, x + profW, y + h - profW);
    doc.line(x + w, y + h, x + w - profW, y + h - profW);

    // Vidro interno
    doc.setFillColor(255, 255, 255);
    doc.rect(x + profW, y + profW, w - 2 * profW, h - 2 * profW, 'FD');

    // Rótulo da porta e especificação do vidro no centro
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(doorLabel, x + w / 2, y + h / 2 - 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${door.glassType}`, x + w / 2, y + h / 2 + 2, { align: 'center' });

    // Dobradiças
    if (doorType === 'Giro' && currentHingeSide !== 'none' && hinges.length > 0) {
      const hingeDiameterMM = 35;
      const hingeRadiusPx = (hingeDiameterMM / 2) * scale;
      const hingeCenterX =
        currentHingeSide === 'left'
          ? x + (profileWidthMM / 2) * scale
          : x + w - (profileWidthMM / 2) * scale;

      hinges.forEach((hinge, idx) => {
        const hingePosMM = Number(hinge.position) || 0;
        const hingeCenterY = y + h - hingePosMM * scale;

        // Desenhar caneco Ø35
        doc.setFillColor(239, 68, 68); // vermelho vivo
        doc.setDrawColor(185, 28, 28);
        doc.circle(hingeCenterX, hingeCenterY, hingeRadiusPx, 'FD');

        // Cruz de centro do furo
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.2);
        doc.line(hingeCenterX - 1, hingeCenterY, hingeCenterX + 1, hingeCenterY);
        doc.line(hingeCenterX, hingeCenterY - 1, hingeCenterX, hingeCenterY + 1);

        // Se for a primeira porta, cota de altura da dobradiça
        if (x === drawStartX) {
          doc.setDrawColor(239, 68, 68);
          doc.line(hingeCenterX, hingeCenterY, x - 2, hingeCenterY);
          doc.setFontSize(6.5);
          doc.setTextColor(185, 28, 28);
          doc.setFont('helvetica', 'bold');
          doc.text(`${hingePosMM}`, x - 3, hingeCenterY + 1, { align: 'right' });
        }
      });
    }

    // Puxador
    if (handleType !== 'Sem Puxador' && currentHandlePos !== 'none') {
      const handleThicknessPx = Math.max(1.8, 3 * scale);
      const positions = currentHandlePos === 'both' ? ['left', 'right'] : [currentHandlePos];

      positions.forEach((pos) => {
        let hX = 0,
          hY = 0,
          hW = 0,
          hH = 0;

        if (pos === 'top' || pos === 'bottom') {
          hH = handleThicknessPx;
          hY = pos === 'top' ? y : y + h - hH;
          if (handleType === 'Linear inteiro') {
            hW = w;
            hX = x;
          } else {
            hW = (door.handleWidth || 150) * scale;
            hX = x + (door.handleOffset || 50) * scale;
          }
        } else {
          // left ou right
          hW = handleThicknessPx;
          hX = pos === 'left' ? x : x + w - hW;
          if (handleType === 'Linear inteiro') {
            hH = h;
            hY = y;
          } else {
            const handleWidthMM = Math.max(10, Number(door.handleWidth) || 150);
            const handleOffsetMM = Math.max(0, Number(door.handleOffset) ?? 100);
            const isFromTop = door.handleOffsetFrom === 'top';
            const distTopMM = isFromTop ? handleOffsetMM : Math.max(0, doorHeight - handleOffsetMM - handleWidthMM);
            const distBottomMM = isFromTop ? Math.max(0, doorHeight - handleOffsetMM - handleWidthMM) : handleOffsetMM;

            hH = handleWidthMM * scale;
            hY = y + distTopMM * scale;

            if (handleType === 'Aba Usinada' && doorIdx === 0) {
              const cotaX = pos === 'left' ? hX - 6 : hX + hW + 6;
              const align = pos === 'left' ? 'right' : 'left';
              doc.setDrawColor(217, 119, 6);
              doc.setTextColor(180, 83, 9);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.5);
              doc.line(hX, hY, cotaX, hY);
              doc.line(hX, hY + hH, cotaX, hY + hH);
              doc.line(cotaX, hY, cotaX, hY + hH);
              doc.text(`${handleWidthMM}mm`, cotaX + (pos === 'left' ? -1 : 1), hY + hH / 2 + 1, { align });

              if (distBottomMM > 0) {
                doc.setFontSize(5.5);
                doc.setTextColor(100, 116, 139);
                doc.text(`${distBottomMM}mm base`, cotaX + (pos === 'left' ? -1 : 1), hY + hH + 3.5, { align });
              }
            }
          }
        }

        doc.setFillColor(220, 38, 38); // destaque do puxador
        doc.setDrawColor(153, 27, 27);
        doc.rect(hX, hY, hW, hH, 'FD');
      });
    }
  };

  // Renderizar as folhas no desenho CAD
  const singleDoorWPx = doorWidth * scale;
  const singleDoorHPx = doorHeight * scale;
  const doorGapPx = doorGapMM * scale;

  if (door.doorSet?.doors && door.doorSet.doors.length > 0 && doorCount > 1) {
    door.doorSet.doors.slice(0, doorCount).forEach((d, idx) => {
      const curX = drawStartX + idx * (singleDoorWPx + doorGapPx);
      const curHinge = doorType === 'Giro'
        ? (d.hingeSide || (idx % 2 === 0 ? 'left' : 'right'))
        : 'none';
      const curHandle = d.handlePosition || (idx % 2 === 0 ? 'right' : 'left');

      renderSingleDoorPDF(
        curX,
        drawStartY,
        singleDoorWPx,
        singleDoorHPx,
        curHinge as any,
        curHandle,
        `Folha ${idx + 1}`,
        idx
      );
      // Cota individual de largura por folha
      drawDimension(
        curX,
        drawStartY + singleDoorHPx,
        curX + singleDoorWPx,
        drawStartY + singleDoorHPx,
        `${doorWidth}`,
        false,
        5
      );
    });
  } else if (doorType === 'Giro' && isPair) {
    const door1Handle = handlePosition === 'left' ? 'right' : handlePosition;
    const door2Handle = door1Handle === 'right' ? 'left' : door1Handle;

    renderSingleDoorPDF(
      drawStartX,
      drawStartY,
      singleDoorWPx,
      singleDoorHPx,
      'left',
      door1Handle,
      'Folha 1 (Esq)'
    );
    renderSingleDoorPDF(
      drawStartX + singleDoorWPx + doorGapPx,
      drawStartY,
      singleDoorWPx,
      singleDoorHPx,
      'right',
      door2Handle,
      'Folha 2 (Dir)'
    );

    drawDimension(
      drawStartX,
      drawStartY + singleDoorHPx,
      drawStartX + singleDoorWPx,
      drawStartY + singleDoorHPx,
      `${doorWidth}`,
      false,
      5
    );
    drawDimension(
      drawStartX + singleDoorWPx + doorGapPx,
      drawStartY + singleDoorHPx,
      drawStartX + 2 * singleDoorWPx + doorGapPx,
      drawStartY + singleDoorHPx,
      `${doorWidth}`,
      false,
      5
    );
  } else {
    // Porta individual
    renderSingleDoorPDF(
      drawStartX,
      drawStartY,
      singleDoorWPx,
      singleDoorHPx,
      doorType === 'Giro' ? hingeSide : 'none',
      handlePosition,
      `Porta (${doorType})`
    );
    drawDimension(
      drawStartX,
      drawStartY + singleDoorHPx,
      drawStartX + singleDoorWPx,
      drawStartY + singleDoorHPx,
      `${doorWidth} mm`,
      false,
      5
    );
  }

  // Cota de altura total no lado direito da área de desenho
  const totalDrawRightX = drawStartX + totalModelWidthMM * scale;
  drawDimension(
    totalDrawRightX,
    drawStartY,
    totalDrawRightX,
    drawStartY + singleDoorHPx,
    `${doorHeight} mm`,
    true,
    6
  );

  // Legenda no rodapé da área de desenho
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '● Caneco Dobradiça Ø35mm  ■ Puxador  | Medidas em milímetros (mm)  |  Corte dos perfis a 45º',
    margin + 5,
    contentTop + contentHeight - 3
  );

  // --- TABELAS TÉCNICAS NA COLUNA DIREITA ---
  let curY = contentTop;

  const renderSectionHeader = (title: string) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(rightColX, curY, rightColWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(title, rightColX + 3, curY + 4);
    curY += 6.5;
  };

  const renderTableRow = (label: string, value: string, isAlt = false) => {
    if (isAlt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(rightColX, curY, rightColWidth, 4.5, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(label, rightColX + 2, curY + 3.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value, rightColX + 46, curY + 3.2);
    curY += 4.5;
  };

  // 1. ESPECIFICAÇÕES DO CONJUNTO
  renderSectionHeader('1. ESPECIFICAÇÕES GERAIS');
  renderTableRow('Tipo de Abertura:', `${doorType} ${door.slidingSystem ? `(${door.slidingSystem})` : ''}`);
  renderTableRow('Quantidade Total:', `${cutList.quantity} folha(s) ${isPair ? '(Par)' : ''}`, true);
  renderTableRow('Dimensões / Folha:', `${doorWidth} x ${doorHeight} mm`);
  renderTableRow('Modelo do Perfil:', `${door.profileModel || 'Perfil 45 (45mm)'}`, true);
  renderTableRow('Cor do Perfil:', `${door.profileColor}`);
  renderTableRow('Tipo de Vidro:', `${door.glassType}`, true);
  renderTableRow('Puxador:', `${handleType}`);
  if (handleType !== 'Sem Puxador') {
    renderTableRow('Posição Puxador:', `${HANDLE_POSITIONS[handlePosition] || handlePosition}`, true);
    if (handleType === 'Aba Usinada') {
      const hW = door.handleWidth || 150;
      const off = door.handleOffset ?? 100;
      const isTop = door.handleOffsetFrom === 'top';
      const dBottom = isTop ? Math.max(0, doorHeight - off - hW) : off;
      const dTop = isTop ? off : Math.max(0, doorHeight - off - hW);
      renderTableRow('Usinagem da Aba:', `${hW} mm (Base: ${dBottom} mm | Topo: ${dTop} mm)`);
    }
  }

  if (door.doorSet?.doors && doorCount > 1) {
    door.doorSet.doors.slice(0, doorCount).forEach((d, idx) => {
      const hSide = d.hingeSide ? (d.hingeSide === 'left' ? 'Dobradiça Esq' : 'Dobradiça Dir') : '';
      const hPos = HANDLE_POSITIONS[d.handlePosition] ? `Puxador ${HANDLE_POSITIONS[d.handlePosition]}` : '';
      const info = [hSide, hPos].filter(Boolean).join(' | ');
      renderTableRow(`Folha ${idx + 1}:`, info || 'Padrão', idx % 2 === 0);
    });
  }

  curY += 2;

  // 2. FURAÇÃO DE DOBRADIÇAS
  if (doorType === 'Giro') {
    renderSectionHeader('2. FURAÇÃO DE DOBRADIÇAS (CANECO Ø35mm)');
    renderTableRow('Lado das Dobradiças:', hingeSide === 'left' ? 'Esquerda' : 'Direita');
    renderTableRow('Quantidade / Folha:', `${hinges.length} dobradiças`, true);

    hinges.forEach((hinge, idx) => {
      const posBase = Number(hinge.position) || 0;
      const posTopo = Math.max(0, doorHeight - posBase);
      renderTableRow(
        `Furo ${idx + 1}:`,
        `${posBase} mm da base (${posTopo} mm do topo)`,
        idx % 2 === 0
      );
    });
    curY += 2;
  }

  // 3. LISTA DE CORTE DE ALUMÍNIO E VIDRAÇARIA
  renderSectionHeader('3. LISTA DE CORTE PARA PRODUÇÃO');
  doc.setFillColor(254, 243, 199); // destaque amarelo suave
  doc.rect(rightColX, curY, rightColWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(146, 64, 14);
  doc.text('CORTE DE VIDRO:', rightColX + 2, curY + 3.5);
  curY += 5.2;

  renderTableRow('Medida Chapa Vidro:', `${cutList.glassWidth} mm x ${cutList.glassHeight} mm`);
  renderTableRow('Qtd de Vidros:', `${cutList.quantity} peça(s)`, true);
  renderTableRow('Área Total Vidro:', `${cutList.totalGlassAreaM2.toFixed(3)} m²`);

  doc.setFillColor(241, 245, 249);
  doc.rect(rightColX, curY, rightColWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text('CORTE DE PERFIS DE ALUMÍNIO (Corte a 45º):', rightColX + 2, curY + 3.5);
  curY += 5.2;

  renderTableRow('Barras Verticais (Alt):', `${cutList.verticalProfilesCount} un x ${cutList.verticalProfileLengthMM} mm`);
  renderTableRow('Barras Horiz. (Larg):', `${cutList.horizontalProfilesCount} un x ${cutList.horizontalProfileLengthMM} mm`, true);
  renderTableRow('Metragem Linear Total:', `${cutList.totalLinearMeters.toFixed(2)} metros lineares (ml)`);

  curY += 2;

  // 4. ACESSÓRIOS & FERRAGENS
  renderSectionHeader('4. FERRAGENS & COMPONENTES');
  renderTableRow('Cantoneiras Montagem:', `${cutList.cornerBracketsCount} un (4 por folha)`);
  if (doorType === 'Giro') {
    renderTableRow('Dobradiças Caneco 35:', `${cutList.hingesTotal} un completas c/ calço`, true);
  }
  renderTableRow('Escova Vedadora / Baguete:', `Aprox. ${cutList.sealGasketMeters.toFixed(1)} metros`);

  // 5. CAMPO DE APROVAÇÃO / CONTROLE DE QUALIDADE NO FINAL DA COLUNA DIREITA
  const remainingH = pageHeight - margin - curY;
  if (remainingH > 18) {
    curY += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(250, 250, 250);
    doc.rect(rightColX, curY, rightColWidth, remainingH - 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text('CONTROLE DE QUALIDADE & EXPEDIÇÃO:', rightColX + 3, curY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('[ ] Medidas e esquadro conferidos   [ ] Furações testadas', rightColX + 3, curY + 8);
    doc.text('[ ] Vidro inspecionado sem avarias   [ ] Embalagem de proteção', rightColX + 3, curY + 12);

    doc.line(rightColX + 45, curY + remainingH - 4, rightColX + rightColWidth - 5, curY + remainingH - 4);
    doc.text('Assinatura do Marceneiro / Montador', rightColX + 48, curY + remainingH - 1.5);
  }

  // Download do PDF com nome descritivo
  const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Porta_Perfil_${safeClient}_${doorWidth}x${doorHeight}.pdf`);
}
