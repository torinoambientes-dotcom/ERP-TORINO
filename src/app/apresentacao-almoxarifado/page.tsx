'use client';

import { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { AppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Boxes,
  Maximize,
  Minimize,
  Search,
  Barcode,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  History,
  X,
  RefreshCw,
  Layers,
  User,
  PackageCheck,
  AlertOctagon,
  Delete,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StockItem, StockMovementReason } from '@/lib/types';
import useLocalStorage from '@/hooks/use-local-storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

function LiveClock({ isDark }: { isDark?: boolean }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className={cn("font-black tabular-nums tracking-wider text-xl sm:text-2xl", isDark ? "text-emerald-400" : "text-emerald-600")}>
      {format(time, 'HH:mm:ss')}
    </span>
  );
}

const REASON_LABELS: Record<StockMovementReason, { label: string; icon: string }> = {
  uso_marceneiro: { label: 'Uso Marceneiro', icon: '🔨' },
  despacho_producao: { label: 'Despacho Produção', icon: '🚚' },
  compra: { label: 'Entrada / Compra', icon: '📦' },
  quebra_perda: { label: 'Quebra / Perda', icon: '⚠️' },
  estorno: { label: 'Estorno / Devolução', icon: '↩️' },
  outros: { label: 'Outros Motivos', icon: '📝' },
};

export default function ApresentacaoAlmoxarifadoPage() {
  const { stockItems, stockCategories, stockMovements, addStockMovement, teamMembers, isLoading } = useContext(AppContext);
  const { toast } = useToast();

  // Theme support: defaulting to 'light' (fundo claro) as requested
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('almoxarifadoDisplay:theme', 'light');
  const isDark = theme === 'dark';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  
  // Custom Movement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('exit');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [selectedReason, setSelectedReason] = useState<StockMovementReason>('uso_marceneiro');
  const [movementDetails, setMovementDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Autofocus search on load or barcode button click
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Filter Marceneiros and Operators
  const operators = useMemo(() => {
    return (teamMembers || []).filter(m => ['Marceneiro', 'Serralheiro', 'Pintor', 'Administrativo', 'Gerente de Produção'].includes(m.role));
  }, [teamMembers]);

  // Set default operator if available
  useEffect(() => {
    if (operators.length > 0 && !selectedOperatorId) {
      setSelectedOperatorId(operators[0].id);
    }
  }, [operators, selectedOperatorId]);

  // Identify Critical Items (below minStock or high demand)
  const criticalItems = useMemo(() => {
    return (stockItems || []).filter(item => {
      const totalReserved = (item.reservations || []).reduce((acc, res) => acc + res.quantity, 0);
      const isBelowMin = typeof item.minStock === 'number' && item.quantity < item.minStock;
      const isDemandExceeded = totalReserved > item.quantity;
      return isBelowMin || isDemandExceeded;
    });
  }, [stockItems]);

  // Movements performed today
  const todayMovements = useMemo(() => {
    return (stockMovements || [])
      .filter(m => m.timestamp && isToday(parseISO(m.timestamp)))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockMovements]);

  // Filtered Stock Items
  const filteredItems = useMemo(() => {
    return (stockItems || []).filter(item => {
      // Category filter
      if (selectedCategory === 'critical') {
        const totalReserved = (item.reservations || []).reduce((acc, res) => acc + res.quantity, 0);
        const isBelowMin = typeof item.minStock === 'number' && item.quantity < item.minStock;
        const isDemandExceeded = totalReserved > item.quantity;
        if (!isBelowMin && !isDemandExceeded) return false;
      } else if (selectedCategory !== 'all') {
        if (item.category !== selectedCategory) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesId = item.id.toLowerCase().includes(query);
        return matchesName || matchesCategory || matchesId;
      }

      return true;
    });
  }, [stockItems, selectedCategory, searchQuery]);

  // Open Detailed Movement Modal
  const handleOpenModal = (item: StockItem, defaultType: 'entry' | 'exit') => {
    setTargetItem(item);
    setMovementType(defaultType);
    setQuantityInput('1');
    setSelectedReason(defaultType === 'entry' ? 'compra' : 'uso_marceneiro');
    setMovementDetails('');
    setIsModalOpen(true);
  };

  // Submit Detailed Movement
  const handleConfirmModalMovement = async () => {
    if (!targetItem) return;
    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      toast({
        variant: 'destructive',
        title: 'Quantidade Inválida',
        description: 'Digite uma quantidade maior que zero.',
      });
      return;
    }

    if (movementType === 'exit' && targetItem.quantity < qty) {
      toast({
        variant: 'destructive',
        title: 'Estoque Insuficiente',
        description: `Saldo atual: ${targetItem.quantity} ${targetItem.unit}.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const operatorName = operators.find(o => o.id === selectedOperatorId)?.name || '';
      const fullDetails = [
        operatorName ? `Operador: ${operatorName}` : null,
        movementDetails.trim(),
      ].filter(Boolean).join(' | ');

      await addStockMovement(targetItem.id, {
        type: movementType,
        quantity: qty,
        reason: selectedReason,
        details: fullDetails || 'Movimentação via Monitor Almoxarifado',
        memberId: selectedOperatorId || 'almoxarifado-kiosk',
      });

      toast({
        title: '✅ Movimentação Registrada!',
        description: `${movementType === 'entry' ? 'Entrada' : 'Saída'} de ${qty} ${targetItem.unit} para "${targetItem.name}".`,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Operação',
        description: err?.message || 'Erro ao comunicar com o servidor.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keypad Helper for Modal
  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setQuantityInput('0');
    } else if (val === 'BACK') {
      setQuantityInput(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (val === '.') {
      if (!quantityInput.includes('.')) {
        setQuantityInput(prev => prev + '.');
      }
    } else {
      setQuantityInput(prev => (prev === '0' ? val : prev + val));
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans select-none antialiased transition-colors duration-200",
      isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
    )}>
      {/* TOP HEADER */}
      <header className={cn(
        "px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md shadow-md border-b transition-colors",
        isDark ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border",
            isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
          )}>
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={cn("text-xl sm:text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                MONITOR DO ALMOXARIFADO
              </h1>
            </div>
            <p className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
              Terminal de consulta e atualização rápida de insumos da fábrica
            </p>
          </div>
        </div>

        {/* STATUS COUNTERS & CONTROLS */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
          {/* Live Clock */}
          <div className={cn(
            "px-4 py-2 rounded-2xl border flex items-center gap-2.5 shadow-xs",
            isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <Clock className={cn("w-5 h-5", isDark ? "text-emerald-400" : "text-emerald-600")} />
            <LiveClock isDark={isDark} />
          </div>

          {/* Critical Counter Badge */}
          <button
            onClick={() => setSelectedCategory(selectedCategory === 'critical' ? 'all' : 'critical')}
            className={cn(
              "px-4 py-2 rounded-2xl border flex items-center gap-2 font-bold text-sm transition-all shadow-xs",
              selectedCategory === 'critical'
                ? "bg-red-600 text-white border-red-700 ring-2 ring-red-400/50"
                : criticalItems.length > 0
                ? isDark ? "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                : isDark ? "bg-slate-900 text-slate-400 border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <AlertTriangle className={cn("w-4 h-4", criticalItems.length > 0 && "text-red-500 animate-pulse")} />
            <span>Críticos:</span>
            <span className="font-black text-base">{criticalItems.length}</span>
          </button>

          {/* Today Movements Badge */}
          <div className={cn(
            "px-4 py-2 rounded-2xl border flex items-center gap-2 text-sm font-bold shadow-xs",
            isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
          )}>
            <History className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-emerald-600")} />
            <span>Hoje:</span>
            <span className={cn("font-black text-base", isDark ? "text-emerald-400" : "text-emerald-700")}>{todayMovements.length}</span>
          </div>

          {/* Active Operator Selector */}
          {operators.length > 0 && (
            <div className={cn(
              "border px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-xs",
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            )}>
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none cursor-pointer pr-1"
              >
                {operators.map(op => (
                  <option key={op.id} value={op.id} className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                    {op.name} ({op.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Theme Toggle Button */}
          <Button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            variant="outline"
            size="icon"
            className={cn(
              "h-11 w-11 rounded-2xl shadow-xs transition-colors",
              isDark ? "border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-300" : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
            )}
            title={isDark ? "Mudar para Fundo Claro" : "Mudar para Fundo Escuro"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {/* Fullscreen Button */}
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="icon"
            className={cn(
              "h-11 w-11 rounded-2xl shadow-xs transition-colors",
              isDark ? "border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200" : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
            )}
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto w-full">
        {/* SEARCH BAR & QUICK FILTERS */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search + Barcode Input */}
            <div className="md:col-span-8 lg:col-span-9 relative flex items-center">
              <Search className={cn("w-6 h-6 absolute left-4 pointer-events-none", isDark ? "text-slate-400" : "text-slate-500")} />
              <Input
                ref={barcodeInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Leitor de Código de Barras / Digite o Nome do Material ou ID..."
                className={cn(
                  "h-16 text-lg pl-14 pr-14 rounded-2xl font-semibold shadow-sm transition-colors",
                  isDark
                    ? "bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                )}
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className={cn(
                    "absolute right-4 p-2 rounded-xl transition-colors",
                    isDark ? "text-slate-400 hover:text-white bg-slate-800/50" : "text-slate-500 hover:text-slate-900 bg-slate-100"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => barcodeInputRef.current?.focus()}
                  className={cn(
                    "absolute right-4 p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                    isDark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  )}
                >
                  <Barcode className="w-5 h-5" />
                  <span className="hidden sm:inline">Scanner</span>
                </button>
              )}
            </div>

            {/* Category Reset / Quick Counter */}
            <div className={cn(
              "md:col-span-4 lg:col-span-3 flex items-center justify-between border rounded-2xl px-5 py-3 shadow-sm",
              isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"
            )}>
              <div>
                <span className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-slate-400" : "text-slate-500")}>Itens Exibidos</span>
                <span className={cn("text-2xl font-black", isDark ? "text-white" : "text-slate-900")}>
                  {filteredItems.length} <span className={cn("text-sm font-normal", isDark ? "text-slate-400" : "text-slate-500")}>de {stockItems?.length || 0}</span>
                </span>
              </div>
              {selectedCategory !== 'all' && (
                <Button
                  onClick={() => setSelectedCategory('all')}
                  variant="ghost"
                  size="sm"
                  className={cn("text-xs font-bold", isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-700 hover:text-emerald-800")}
                >
                  Limpar Filtro
                </Button>
              )}
            </div>
          </div>

          {/* CATEGORY TABS (HORIZONTAL SCROLL BAR) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "h-12 px-5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border flex items-center gap-2 shadow-xs shrink-0",
                selectedCategory === 'all'
                  ? isDark
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-emerald-500/20"
                    : "bg-emerald-600 text-white border-emerald-700 font-black shadow-md"
                  : isDark
                    ? "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Layers className="w-4 h-4" />
              <span>Todos os Materiais</span>
            </button>

            <button
              onClick={() => setSelectedCategory('critical')}
              className={cn(
                "h-12 px-5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border flex items-center gap-2 shadow-xs shrink-0",
                selectedCategory === 'critical'
                  ? "bg-red-600 text-white border-red-700 font-black shadow-md"
                  : isDark
                    ? "bg-slate-900 text-red-400 border-red-950 hover:border-red-800"
                    : "bg-white text-red-600 border-red-200 hover:bg-red-50"
              )}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>🔴 Nível Crítico ({criticalItems.length})</span>
            </button>

            {(stockCategories || []).map(cat => {
              const count = (stockItems || []).filter(i => i.category === cat.name).length;
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    "h-12 px-5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border flex items-center gap-2 shadow-xs shrink-0",
                    isSelected
                      ? isDark
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-emerald-500/20"
                        : "bg-emerald-600 text-white border-emerald-700 font-black shadow-md"
                      : isDark
                        ? "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <span>{cat.name}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-black",
                    isSelected
                      ? isDark ? "bg-slate-950/20 text-slate-950" : "bg-white/20 text-white"
                      : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STOCK ITEMS GRID */}
        {isLoading ? (
          <div className={cn("py-20 flex flex-col items-center justify-center space-y-4", isDark ? "text-slate-400" : "text-slate-500")}>
            <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-emerald-400" : "text-emerald-600")} />
            <p className="font-bold text-lg">Carregando estoque do almoxarifado...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={cn(
            "py-16 border rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3",
            isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200 shadow-sm"
          )}>
            <Boxes className={cn("w-16 h-16", isDark ? "text-slate-600" : "text-slate-400")} />
            <h3 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Nenhum item encontrado</h3>
            <p className={cn("max-w-md text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              Não encontramos nenhum material com o termo <span className={cn("font-mono font-bold", isDark ? "text-emerald-400" : "text-emerald-700")}>"{searchQuery}"</span> na categoria selecionada.
            </p>
            <Button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              variant="outline"
              className={cn("mt-2 rounded-xl", isDark ? "border-slate-700 text-slate-200" : "border-slate-300 text-slate-700")}
            >
              Limpar Pesquisa e Filtros
            </Button>
          </div>
        ) : (
          <div className={cn(
            "border rounded-3xl overflow-hidden shadow-sm divide-y",
            isDark ? "bg-slate-900/90 border-slate-800 divide-slate-800/80" : "bg-white border-slate-200 divide-slate-100"
          )}>
            {/* Table Column Headers (Visible on md and up) */}
            <div className={cn(
              "hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b",
              isDark ? "bg-slate-950/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
            )}>
              <div className="col-span-5 lg:col-span-6">Material / Categoria</div>
              <div className="col-span-3 lg:col-span-2 text-right md:text-left">Mínimo / Reservado</div>
              <div className="col-span-2 text-right">Saldo Atual</div>
              <div className="col-span-2 text-center">Ações</div>
            </div>

            {/* List Rows */}
            <div className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-100")}>
              {filteredItems.map((item) => {
                const totalReserved = (item.reservations || []).reduce((acc, res) => acc + res.quantity, 0);
                const isBelowMin = typeof item.minStock === 'number' && item.quantity < item.minStock;
                const isDemandExceeded = totalReserved > item.quantity;
                const isCritical = isBelowMin || isDemandExceeded;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-4 sm:px-6 py-3.5 transition-colors",
                      isCritical
                        ? isDark
                          ? "bg-red-950/20 hover:bg-red-950/30 border-l-4 border-l-red-500"
                          : "bg-red-50/50 hover:bg-red-50/80 border-l-4 border-l-red-500"
                        : isDark
                          ? "hover:bg-slate-800/40 border-l-4 border-l-transparent"
                          : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                    )}
                  >
                    {/* Material & Categoria */}
                    <div className="md:col-span-5 lg:col-span-6 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "font-black text-base sm:text-lg tracking-tight",
                          isDark ? "text-white" : "text-slate-900"
                        )}>
                          {item.name}
                        </span>

                        {isCritical && (
                          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[11px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Crítico
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider",
                            isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {item.category || 'Geral'}
                        </Badge>

                        {isCritical && (
                          <span className={cn("font-bold text-[11px]", isDark ? "text-red-400" : "text-red-600")}>
                            {isBelowMin ? `Abaixo do mínimo (${item.minStock} ${item.unit})` : 'Demanda excede estoque'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mínimo & Reservas */}
                    <div className="md:col-span-3 lg:col-span-2 text-xs flex md:flex-col justify-between md:justify-center items-center md:items-start gap-1">
                      <span className={cn("font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
                        Mínimo: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>
                          {typeof item.minStock === 'number' ? `${item.minStock} ${item.unit}` : '—'}
                        </strong>
                      </span>
                      {totalReserved > 0 ? (
                        <span className={cn(
                          "font-bold px-2 py-0.5 rounded-md border text-[11px]",
                          isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-800 bg-amber-50 border-amber-200"
                        )}>
                          Reservado: {totalReserved} {item.unit}
                        </span>
                      ) : (
                        <span className={cn("hidden md:inline text-[11px]", isDark ? "text-slate-500" : "text-slate-400")}>
                          Sem reservas
                        </span>
                      )}
                    </div>

                    {/* Saldo Atual */}
                    <div className="md:col-span-2 flex md:flex-col justify-between md:justify-center items-center md:items-end">
                      <span className="md:hidden text-xs font-bold text-slate-500 uppercase">Saldo:</span>
                      <div className="flex items-baseline gap-1">
                        <span className={cn(
                          "text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                          isCritical ? "text-red-600" : isDark ? "text-emerald-400" : "text-emerald-600"
                        )}>
                          {item.quantity}
                        </span>
                        <span className={cn("text-xs sm:text-sm font-bold", isDark ? "text-slate-400" : "text-slate-600")}>
                          {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Ações (Saída / Entrada) */}
                    <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(item, 'exit')}
                        className="flex-1 md:flex-initial h-11 px-3.5 sm:px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                        title="Registrar Saída"
                      >
                        <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                        <span>Saída</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenModal(item, 'entry')}
                        className="flex-1 md:flex-initial h-11 px-3.5 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                        title="Registrar Entrada"
                      >
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        <span>Entrada</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTTOM REALTIME ACTIVITY FEED */}
        <div className={cn(
          "mt-8 border rounded-3xl p-5 sm:p-6 shadow-sm",
          isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <History className={cn("w-5 h-5", isDark ? "text-emerald-400" : "text-emerald-600")} />
              <h3 className={cn("text-lg font-black", isDark ? "text-white" : "text-slate-900")}>Últimas Movimentações do Dia</h3>
            </div>
            <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>
              {todayMovements.length} registradas hoje
            </span>
          </div>

          {todayMovements.length === 0 ? (
            <p className={cn("text-sm italic py-4 text-center", isDark ? "text-slate-500" : "text-slate-400")}>
              Nenhuma movimentação realizada até o momento no turno de hoje.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayMovements.slice(0, 6).map((m) => {
                const item = stockItems?.find(i => i.id === m.stockItemId);
                const reasonInfo = REASON_LABELS[m.reason] || { label: m.reason, icon: '📦' };
                const isEntry = m.type === 'entry';
                const member = teamMembers?.find(t => t.id === m.memberId);

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "border rounded-2xl p-3.5 flex items-start gap-3 text-sm shadow-2xs",
                      isDark ? "bg-slate-950/80 border-slate-800/80" : "bg-slate-50/90 border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 mt-0.5 border",
                      isEntry
                        ? isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : isDark ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-100 text-red-800 border-red-200"
                    )}>
                      {isEntry ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn("font-bold truncate", isDark ? "text-white" : "text-slate-900")}>{item?.name || 'Material'}</span>
                        <span className={cn(
                          "font-black tabular-nums text-xs px-2 py-0.5 rounded-md",
                          isEntry
                            ? isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800 font-bold"
                            : isDark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-800 font-bold"
                        )}>
                          {isEntry ? '+' : '-'}{m.quantity} {item?.unit}
                        </span>
                      </div>

                      <div className={cn("flex items-center justify-between text-xs mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                        <span>{reasonInfo.icon} {reasonInfo.label}</span>
                        <span>{format(parseISO(m.timestamp), 'HH:mm')}</span>
                      </div>
                      {m.details && (
                        <p className={cn("text-[11px] truncate mt-0.5", isDark ? "text-slate-500" : "text-slate-600")}>
                          {m.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* DETAILED MOVEMENT TOUCH MODAL WITH NUMERIC KEYPAD */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={cn(
          "max-w-xl p-6 rounded-3xl shadow-2xl border",
          isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        )}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              {movementType === 'entry' ? (
                <span className={cn("flex items-center gap-2", isDark ? "text-emerald-400" : "text-emerald-700")}>
                  <ArrowUpRight className="w-7 h-7" /> Entrada de Estoque
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-2">
                  <ArrowDownRight className="w-7 h-7" /> Saída de Estoque
                </span>
              )}
            </DialogTitle>
            <DialogDescription className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              {targetItem?.name} (Saldo Atual: <strong className={isDark ? "text-white" : "text-slate-900"}>{targetItem?.quantity} {targetItem?.unit}</strong>)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* DISPLAYED QUANTITY BUFFER */}
            <div className={cn(
              "border-2 rounded-2xl p-4 text-right shadow-inner",
              isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
            )}>
              <span className={cn("text-xs font-bold uppercase tracking-wider block mb-1", isDark ? "text-slate-400" : "text-slate-500")}>
                Quantidade a {movementType === 'entry' ? 'Adicionar' : 'Retirar'} ({targetItem?.unit})
              </span>
              <div className={cn("text-4xl font-black tabular-nums tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {quantityInput} <span className={cn("text-lg font-normal", isDark ? "text-slate-400" : "text-slate-500")}>{targetItem?.unit}</span>
              </div>
            </div>

            {/* NUMERIC TOUCH KEYPAD & PRESETS */}
            <div className="grid grid-cols-4 gap-2">
              {/* Presets (+1, +5, +10) */}
              {['1', '2', '3'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className={cn(
                    "h-14 rounded-2xl border text-2xl font-black transition-all active:scale-95 shadow-2xs",
                    isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900"
                  )}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuantityInput(prev => String(Math.max(1, parseFloat(prev || '0') + 1)))}
                className={cn(
                  "h-14 rounded-2xl border font-bold text-sm transition-all active:scale-95 shadow-2xs",
                  isDark ? "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300" : "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800"
                )}
              >
                +1 {targetItem?.unit}
              </button>

              {['4', '5', '6'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className={cn(
                    "h-14 rounded-2xl border text-2xl font-black transition-all active:scale-95 shadow-2xs",
                    isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900"
                  )}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuantityInput(prev => String(Math.max(1, parseFloat(prev || '0') + 5)))}
                className={cn(
                  "h-14 rounded-2xl border font-bold text-sm transition-all active:scale-95 shadow-2xs",
                  isDark ? "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300" : "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800"
                )}
              >
                +5 {targetItem?.unit}
              </button>

              {['7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className={cn(
                    "h-14 rounded-2xl border text-2xl font-black transition-all active:scale-95 shadow-2xs",
                    isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900"
                  )}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuantityInput(prev => String(Math.max(1, parseFloat(prev || '0') + 10)))}
                className={cn(
                  "h-14 rounded-2xl border font-bold text-sm transition-all active:scale-95 shadow-2xs",
                  isDark ? "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300" : "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800"
                )}
              >
                +10 {targetItem?.unit}
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('.')}
                className={cn(
                  "h-14 rounded-2xl border text-2xl font-black transition-all active:scale-95 shadow-2xs",
                  isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900"
                )}
              >
                ,
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className={cn(
                  "h-14 rounded-2xl border text-2xl font-black transition-all active:scale-95 shadow-2xs",
                  isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900"
                )}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('BACK')}
                className={cn(
                  "h-14 rounded-2xl border text-red-600 font-black text-lg transition-all active:scale-95 flex items-center justify-center shadow-2xs",
                  isDark ? "bg-slate-900 hover:bg-slate-800 border-slate-800" : "bg-slate-100 hover:bg-slate-200 border-slate-200"
                )}
              >
                <Delete className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('CLEAR')}
                className={cn(
                  "h-14 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-2xs",
                  isDark ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-300" : "bg-red-100 hover:bg-red-200 border-red-200 text-red-700"
                )}
              >
                Limpar
              </button>
            </div>

            {/* REASON SELECTOR */}
            <div>
              <label className={cn("text-xs font-bold uppercase tracking-wider block mb-2", isDark ? "text-slate-400" : "text-slate-500")}>
                Motivo da Movimentação
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(REASON_LABELS) as StockMovementReason[]).map((reasonKey) => {
                  const info = REASON_LABELS[reasonKey];
                  const isSelected = selectedReason === reasonKey;
                  return (
                    <button
                      key={reasonKey}
                      type="button"
                      onClick={() => setSelectedReason(reasonKey)}
                      className={cn(
                        "p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center gap-2 shadow-2xs",
                        isSelected
                          ? isDark
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg"
                            : "bg-emerald-600 text-white border-emerald-700 font-black shadow-md"
                          : isDark
                            ? "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span className="text-base">{info.icon}</span>
                      <span className="truncate">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ADDITIONAL DETAILS / NOTES */}
            <div>
              <label className={cn("text-xs font-bold uppercase tracking-wider block mb-1", isDark ? "text-slate-400" : "text-slate-500")}>
                Observações / Projeto (Opcional)
              </label>
              <Input
                value={movementDetails}
                onChange={(e) => setMovementDetails(e.target.value)}
                placeholder="Ex: Utilizado na Cozinha da Ana, Ref. Chapa 02..."
                className={cn(
                  "h-12 rounded-2xl",
                  isDark ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
                )}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className={cn(
                "h-14 rounded-2xl font-bold text-base flex-1",
                isDark ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmModalMovement}
              className={cn(
                "h-14 rounded-2xl font-black text-base flex-1 shadow-xl text-white",
                movementType === 'entry' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              )}
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Movimentação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
