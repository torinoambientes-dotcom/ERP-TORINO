'use client';
import { useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutGrid, PlusCircle, Users, Boxes, LogOut, ShoppingCart, User, X, Calendar } from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { RegisterProjectModal } from '../modals/register-project-modal';
import { Button } from '../ui/button';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { Badge } from '../ui/badge';
import type { MaterialItem, GlassItem, ProfileDoorItem, StockItem } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import { Separator } from '../ui/separator';


interface LowStockInfo extends StockItem {
  demand?: number;
}

const menuItems = [
  { href: '/', label: 'Projetos', icon: LayoutGrid, adminOnly: false },
  { href: '/calendar', label: 'Calendário', icon: Calendar, adminOnly: false },
  { href: '/purchases', label: 'Compras', icon: ShoppingCart, adminOnly: false },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, adminOnly: false },
  { href: '/team', label: 'Equipe', icon: Users, adminOnly: true },
  { href: '/stock', label: 'Estoque', icon: Boxes, adminOnly: false },
];

const defaultColors = [
  '#3b82f6', '#16a34a', '#f97316', '#8b5cf6',
  '#ef4444', '#eab308', '#ec4899', '#14b8a6',
];


export function SidebarNav() {
  const pathname = usePathname();
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const { teamMembers, projects, stockItems, updateTeamMember } = useContext(AppContext);
  const { toast } = useToast();
  
  const [isAvatarPopoverOpen, setAvatarPopoverOpen] = useState(false);

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);
  
  const isAdmin = user?.email === 'carlos.campigotto@gmail.com';

  const pendingPurchasesCount = useMemo(() => {
    let count = 0;
    
    // 1. Low Stock Items
    const lowStockItems = stockItems
      .filter(item => {
        const totalReserved = (item.reservations || []).reduce((acc, res) => acc + res.quantity, 0);
        const hasMinStockAlert = typeof item.minStock === 'number' && item.quantity < item.minStock;
        const hasDemandAlert = totalReserved > item.quantity;
        return !item.alertHandledAt && (hasMinStockAlert || hasDemandAlert) && !item.awaitingReceipt;
      });
    count += lowStockItems.length;

    const activeProjects = projects.filter(p => !p.completedAt);

    activeProjects.forEach(project => {
        project.environments.forEach(environment => {
            environment.furniture.forEach(furniture => {
                // 2. Materials to Buy
                const materialsToBuy = (furniture.materials || []).filter(m => !m.stockItemId && !m.purchased);
                count += materialsToBuy.length;

                // 3. Glass Items to Buy
                const glassToBuy = (furniture.glassItems || []).filter(g => !g.purchased);
                count += glassToBuy.length;

                // 4. Profile Doors to Buy
                const doorsToBuy = (furniture.profileDoors || []).filter(d => !d.purchased);
                count += doorsToBuy.length;
            });
        });
    });

    return count;
  }, [projects, stockItems]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const handleColorUpdate = (color: string) => {
    if (!loggedInMember) return;
    updateTeamMember({ ...loggedInMember, color });
    toast({
      title: 'Cor do avatar atualizada!',
    });
  };
  
  const handleRemoveAvatar = () => {
    if (!loggedInMember) return;
    updateTeamMember({ ...loggedInMember, avatarUrl: '' });
    toast({
      title: 'Foto de perfil removida!',
      description: 'Seu avatar agora exibirá suas iniciais.',
    });
    setAvatarPopoverOpen(false);
  };
  
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin).sort((a, b) => {
    const order = ['Projetos', 'Calendário', 'Compras', 'Estoque', 'Relatórios', 'Equipe'];
    return order.indexOf(a.label) - order.indexOf(b.label);
  });

  return (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center justify-center gap-2 w-full">
          <Logo className="h-14 w-auto" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {visibleMenuItems.map((item) => {
            const showBadge = item.href === '/purchases' && pendingPurchasesCount > 0;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="justify-start relative"
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="text-base">{item.label}</span>
                     {showBadge && (
                        <Badge className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-[20px] justify-center p-1 text-xs group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:top-0">
                            {pendingPurchasesCount}
                        </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='mt-auto'>
         <SidebarSeparator />
         <div className="p-2 space-y-2">
            {loggedInMember && (
              <Popover open={isAvatarPopoverOpen} onOpenChange={setAvatarPopoverOpen}>
                <PopoverTrigger asChild>
                    <div className={cn("flex items-center gap-3 p-2 rounded-md transition-all cursor-pointer hover:bg-sidebar-accent", "group-data-[collapsible=icon]:-left-full group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:invisible")}>
                        <Avatar className="h-9 w-9">
                            {loggedInMember.avatarUrl && <AvatarImage src={loggedInMember.avatarUrl} alt={loggedInMember.name} />}
                            <AvatarFallback style={{backgroundColor: loggedInMember.color}}>
                                {getInitials(loggedInMember.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-sm font-medium truncate text-sidebar-foreground">{loggedInMember.name}</p>
                            <p className="text-xs text-sidebar-foreground/70 truncate">{loggedInMember.email}</p>
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Personalizar Avatar</h4>
                      <p className="text-sm text-muted-foreground">
                        Escolha uma cor de fundo para o seu avatar.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {defaultColors.map((color) => (
                          <button
                            type="button"
                            key={color}
                            onClick={() => handleColorUpdate(color)}
                            className="h-8 w-8 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                loggedInMember.color === color
                                  ? 'hsl(var(--primary))'
                                  : 'transparent',
                            }}
                          />
                        ))}
                    </div>
                    {loggedInMember.avatarUrl && (
                        <>
                            <Separator />
                            <Button variant="outline" size="sm" onClick={handleRemoveAvatar}>
                                <X className="mr-2 h-4 w-4" />
                                Remover Foto
                            </Button>
                        </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
           <Button
            onClick={() => setProjectModalOpen(true)}
            variant="default"
            className="w-full justify-start [&>span]:flex-1"
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-base text-center">Novo Projeto</span>
          </Button>
           <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start [&>span]:flex-1"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-base text-center">Sair</span>
          </Button>
         </div>
      </SidebarFooter>

      <RegisterProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </>
  );
}
