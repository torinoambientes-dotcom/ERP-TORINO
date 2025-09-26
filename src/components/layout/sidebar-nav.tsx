'use client';
import { useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutGrid, PlusCircle, Users, Boxes, LogOut, ShoppingCart, User } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/', label: 'Projetos', icon: LayoutGrid, adminOnly: false },
  { href: '/purchases', label: 'Compras', icon: ShoppingCart, adminOnly: false },
  { href: '/reports', label: 'Relatórios', icon: BarChart3, adminOnly: false },
  { href: '/team', label: 'Equipe', icon: Users, adminOnly: true },
  { href: '/stock', label: 'Estoque', icon: Boxes, adminOnly: false },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const { teamMembers } = useContext(AppContext);
  
  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const isAdmin = user?.email === 'carlos.campigotto@gmail.com';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin).sort((a, b) => {
    const order = ['Projetos', 'Compras', 'Estoque', 'Relatórios', 'Equipe'];
    return order.indexOf(a.label) - order.indexOf(b.label);
  });
  
  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center justify-center gap-2 w-full">
          <Logo className="h-14 w-auto" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-base">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='mt-auto'>
         <SidebarSeparator />
         <div className="p-2 space-y-2">
            {loggedInMember && (
                <div className={cn("flex items-center gap-3 p-2 transition-all", "group-data-[collapsible=icon]:-left-full group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:invisible")}>
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
