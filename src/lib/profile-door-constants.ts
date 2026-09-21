export interface ProfileModelConfig {
  id: string;
  name: string;
  widthMM: number;
  glassDiscountMM: number;
  description: string;
}

export const PROFILE_MODELS: ProfileModelConfig[] = [
  {
    id: 'perfil-45',
    name: 'Perfil 45 (45mm Tradicional)',
    widthMM: 45,
    glassDiscountMM: 70,
    description: 'Perfil padrão robusto para portas de giro e correr.',
  },
  {
    id: 'perfil-slim-20',
    name: 'Perfil Slim 20 (20mm Minimalista)',
    widthMM: 20,
    glassDiscountMM: 24,
    description: 'Moldura ultrafina moderna com visual clean e contemporâneo.',
  },
  {
    id: 'perfil-gola-45',
    name: 'Perfil Faceta / Gola 45 (Puxador Integrado)',
    widthMM: 45,
    glassDiscountMM: 70,
    description: 'Perfil com cava/pega contínua embutida na lateral.',
  },
  {
    id: 'perfil-custom',
    name: 'Personalizado',
    widthMM: 45,
    glassDiscountMM: 70,
    description: 'Defina espessuras e descontos específicos sob medida.',
  },
];

export interface ProfileColorConfig {
  name: string;
  hex: string;
  borderHex: string;
  textColor: string;
}

export const PROFILE_COLORS: ProfileColorConfig[] = [
  { name: 'Preto Fosco', hex: '#1e2022', borderHex: '#111213', textColor: '#ffffff' },
  { name: 'Champagne', hex: '#bba789', borderHex: '#9a8569', textColor: '#ffffff' },
  { name: 'Bronze', hex: '#5e4334', borderHex: '#453024', textColor: '#ffffff' },
  { name: 'Inox / Escovado', hex: '#8a94a0', borderHex: '#6a7480', textColor: '#ffffff' },
  { name: 'Alumínio Natural', hex: '#c5ced8', borderHex: '#9ba7b4', textColor: '#1e293b' },
  { name: 'Grafite / Chumbo', hex: '#374151', borderHex: '#1f2937', textColor: '#ffffff' },
  { name: 'Dourado / Gold', hex: '#c89d3d', borderHex: '#9f7a26', textColor: '#ffffff' },
  { name: 'Branco', hex: '#f8fafc', borderHex: '#cbd5e1', textColor: '#0f172a' },
];

export interface GlassTypeConfig {
  name: string;
  bgStyle: string;
  reflectionStyle: string;
  borderHex: string;
  textColor: string;
  isRibbed?: boolean;
}

export const GLASS_TYPES: GlassTypeConfig[] = [
  {
    name: 'Incolor 4mm',
    bgStyle: 'rgba(215, 235, 248, 0.28)',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.25) 100%)',
    borderHex: '#cbd5e1',
    textColor: '#0f172a',
  },
  {
    name: 'Reflecta Fumê 4mm',
    bgStyle: 'rgba(38, 41, 46, 0.78)',
    reflectionStyle: 'linear-gradient(135deg, rgba(220,225,235,0.6) 0%, rgba(45,48,54,0.85) 45%, rgba(190,195,205,0.4) 100%)',
    borderHex: '#475569',
    textColor: '#ffffff',
  },
  {
    name: 'Reflecta Bronze 4mm',
    bgStyle: 'rgba(92, 62, 42, 0.8)',
    reflectionStyle: 'linear-gradient(135deg, rgba(230,190,150,0.65) 0%, rgba(75,48,30,0.85) 45%, rgba(210,170,130,0.45) 100%)',
    borderHex: '#78350f',
    textColor: '#ffffff',
  },
  {
    name: 'Fumê 4mm',
    bgStyle: 'rgba(35, 38, 42, 0.65)',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.03) 60%)',
    borderHex: '#334155',
    textColor: '#ffffff',
  },
  {
    name: 'Bronze 4mm',
    bgStyle: 'rgba(115, 78, 52, 0.65)',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.03) 60%)',
    borderHex: '#7c2d12',
    textColor: '#ffffff',
  },
  {
    name: 'Espelho Prata 4mm',
    bgStyle: 'rgba(228, 235, 245, 0.96)',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(205,215,230,0.65) 50%, rgba(255,255,255,0.85) 100%)',
    borderHex: '#94a3b8',
    textColor: '#1e293b',
  },
  {
    name: 'Espelho Bronze 4mm',
    bgStyle: 'rgba(165, 120, 85, 0.92)',
    reflectionStyle: 'linear-gradient(135deg, rgba(245,210,175,0.9) 0%, rgba(135,95,65,0.82) 50%, rgba(230,195,155,0.75) 100%)',
    borderHex: '#9a3412',
    textColor: '#ffffff',
  },
  {
    name: 'Espelho Fumê 4mm',
    bgStyle: 'rgba(65, 68, 75, 0.92)',
    reflectionStyle: 'linear-gradient(135deg, rgba(200,205,215,0.85) 0%, rgba(55,58,65,0.88) 50%, rgba(175,180,190,0.65) 100%)',
    borderHex: '#334155',
    textColor: '#ffffff',
  },
  {
    name: 'Canelado 4mm',
    bgStyle: 'rgba(230, 242, 248, 0.55)',
    reflectionStyle: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 4px, rgba(175,195,210,0.25) 4px, rgba(175,195,210,0.25) 8px)',
    borderHex: '#94a3b8',
    textColor: '#0f172a',
    isRibbed: true,
  },
  {
    name: 'Mini Boreal 4mm',
    bgStyle: 'rgba(235, 245, 252, 0.65)',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(210,225,240,0.2) 50%, rgba(255,255,255,0.3) 100%)',
    borderHex: '#cbd5e1',
    textColor: '#0f172a',
  },
  {
    name: 'Acidato 4mm',
    bgStyle: 'rgba(240, 246, 250, 0.72)',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(220,230,240,0.15) 100%)',
    borderHex: '#cbd5e1',
    textColor: '#0f172a',
  },
  {
    name: 'Laqueado Preto 4mm',
    bgStyle: '#09090b',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(0,0,0,0) 50%)',
    borderHex: '#000000',
    textColor: '#ffffff',
  },
  {
    name: 'Laqueado Branco 4mm',
    bgStyle: '#ffffff',
    reflectionStyle: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(235,238,242,0.4) 50%)',
    borderHex: '#e2e8f0',
    textColor: '#0f172a',
  },
];

export const HANDLE_POSITIONS: Record<string, string> = {
  left: 'Esquerda',
  right: 'Direita',
  both: 'Ambos os Lados',
  none: 'Nenhum',
  top: 'Em cima',
  bottom: 'Em baixo',
};

export const HANDLE_TYPES = ['Linear inteiro', 'Aba Usinada', 'Perfil Puxador Integrado', 'Sem Puxador'] as const;
export const DOOR_TYPES = ['Giro', 'Correr', 'Escamoteavel', 'Frente de gaveta'] as const;

/**
 * Calcula automaticamente as alturas recomendadas de dobradiças com base na altura da porta
 * seguindo as normas da marcenaria brasileira (espaçamento seguro e recuo de 100mm das extremidades).
 */
export function calculateRecommendedHinges(doorHeight: number, endOffsetMM = 100): number[] {
  if (!doorHeight || doorHeight <= 0) return [100, 600];

  const minOffset = Math.min(endOffsetMM, Math.floor(doorHeight / 3));
  const topHingePos = Math.max(0, doorHeight - minOffset);
  const bottomHingePos = minOffset;

  if (doorHeight <= 900) {
    // 2 dobradiças
    return [bottomHingePos, topHingePos];
  }

  if (doorHeight <= 1600) {
    // 3 dobradiças
    const midPos = Math.round(doorHeight / 2);
    return [bottomHingePos, midPos, topHingePos];
  }

  if (doorHeight <= 2150) {
    // 4 dobradiças
    const span = topHingePos - bottomHingePos;
    const h2 = Math.round(bottomHingePos + span / 3);
    const h3 = Math.round(bottomHingePos + (span * 2) / 3);
    return [bottomHingePos, h2, h3, topHingePos];
  }

  // Acima de 2150mm: 5 dobradiças
  const span = topHingePos - bottomHingePos;
  const h2 = Math.round(bottomHingePos + span / 4);
  const h3 = Math.round(bottomHingePos + (span * 2) / 4);
  const h4 = Math.round(bottomHingePos + (span * 3) / 4);
  return [bottomHingePos, h2, h3, h4, topHingePos];
}

export interface ProfileDoorCutList {
  doorWidth: number;
  doorHeight: number;
  quantity: number;
  profileWidthMM: number;
  glassDiscountMM: number;
  // Vidro
  glassWidth: number;
  glassHeight: number;
  glassAreaM2PerDoor: number;
  totalGlassAreaM2: number;
  // Perfis Alumínio
  verticalProfileLengthMM: number;
  verticalProfilesCount: number;
  horizontalProfileLengthMM: number;
  horizontalProfilesCount: number;
  totalLinearMeters: number;
  // Acessórios
  cornerBracketsCount: number;
  sealGasketMeters: number;
  hingesTotal: number;
}

export function calculateProfileDoorCutList(params: {
  width: number;
  height: number;
  quantity: number;
  profileWidthMM?: number;
  glassDiscountMM?: number;
  hingesCount?: number;
}): ProfileDoorCutList {
  const width = Math.max(0, Number(params.width) || 0);
  const height = Math.max(0, Number(params.height) || 0);
  const quantity = Math.max(1, Number(params.quantity) || 1);
  const profileWidthMM = Number(params.profileWidthMM) || 45;
  const glassDiscountMM = Number(params.glassDiscountMM) || 70;
  const hingesCount = Number(params.hingesCount) || 0;

  const glassWidth = Math.max(0, width - glassDiscountMM);
  const glassHeight = Math.max(0, height - glassDiscountMM);
  const glassAreaM2PerDoor = (glassWidth * glassHeight) / 1_000_000;
  const totalGlassAreaM2 = glassAreaM2PerDoor * quantity;

  const verticalProfilesCount = 2 * quantity;
  const horizontalProfilesCount = 2 * quantity;
  const totalLinearMeters = ((2 * height + 2 * width) * quantity) / 1000;

  const cornerBracketsCount = 4 * quantity;
  const sealGasketMeters = totalLinearMeters;
  const hingesTotal = hingesCount * quantity;

  return {
    doorWidth: width,
    doorHeight: height,
    quantity,
    profileWidthMM,
    glassDiscountMM,
    glassWidth,
    glassHeight,
    glassAreaM2PerDoor,
    totalGlassAreaM2,
    verticalProfileLengthMM: height,
    verticalProfilesCount,
    horizontalProfileLengthMM: width,
    horizontalProfilesCount,
    totalLinearMeters,
    cornerBracketsCount,
    sealGasketMeters,
    hingesTotal,
  };
}
