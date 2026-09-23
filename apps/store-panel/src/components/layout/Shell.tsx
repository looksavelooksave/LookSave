import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Package,
  Send,
  Settings,
  ShieldBan,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrderStream } from '@/hooks/useOrderStream';

const NAV = [
  { to: '/', label: 'Bosh sahifa', end: true, icon: LayoutDashboard },
  { to: '/orders', label: 'Buyurtmalar', end: false, icon: ShoppingBag },
  { to: '/products', label: 'Mahsulotlar', end: false, icon: Package },
  { to: '/analytics', label: 'Statistika', end: false, icon: BarChart3 },
  { to: '/invoices', label: 'Hisoblar', end: false, icon: BadgeDollarSign },
  { to: '/blocklist', label: "Qora ro'yxat", end: false, icon: ShieldBan },
  { to: '/team', label: 'Jamoa', end: false, icon: Users },
  { to: '/settings', label: 'Sozlamalar', end: false, icon: Settings },
  { to: '/telegram', label: 'Telegram', end: false, icon: Send },
];

/** Do'kon egasi boshqa oynada ishlayotgan bo'lishi mumkin — sarlavhada sanoq. */
function useTitleCounter(): (orderNumber: string) => void {
  const unseen = useRef(0);

  return (orderNumber: string) => {
    unseen.current += 1;
    document.title = `(${unseen.current}) LookSave — yangi buyurtma`;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Yangi buyurtma', { body: orderNumber });
    }
  };
}

const STREAM_LABEL = {
  live: { text: 'Jonli', className: 'text-success', dot: 'bg-success' },
  connecting: { text: 'Ulanmoqda', className: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  offline: { text: 'Aloqa yo‘q', className: 'text-warning', dot: 'bg-warning' },
} as const;

export function Shell(): JSX.Element {
  const { user, signOut } = useAuth();
  const notify = useTitleCounter();

  const stream = useOrderStream(true, {
    onNewOrder: (order) => notify(order.orderNumber),
  });

  const status =
    STREAM_LABEL[stream === 'live' ? 'live' : stream === 'connecting' ? 'connecting' : 'offline'];
  const name = user?.fullName ?? user?.phone ?? '';

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/80 bg-card/70 backdrop-blur-xl">
        <SidebarHeader className="gap-0 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <ShoppingBag className="size-5" />
            </span>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold uppercase tracking-wordmark text-brand">
                LookSave
              </span>
              <span className="mt-1 block text-xs text-dim">Do'kon kabineti</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Boshqaruv</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    {/*
                     * `NavLink` faol holatni o'zi biladi, shuning uchun
                     * `isActive` shu yerdan `SidebarMenuButton` ga uzatiladi —
                     * yo'lni ikkinchi marta taqqoslash shart emas.
                     */}
                    <NavLink to={item.to} end={item.end}>
                      {({ isActive }) => (
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <span>
                            <item.icon />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3">
          <p
            className={cn(
              'flex items-center gap-2 rounded-2xl border border-border/70 bg-surface2/50 px-3 py-2 text-xs font-medium group-data-[collapsible=icon]:hidden',
              status.className,
            )}
          >
            <span className={cn('size-2 rounded-full shadow-[0_0_18px_currentColor]', status.dot)} />
            {status.text}
          </p>

          <Separator className="group-data-[collapsible=icon]:hidden" />

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-auto py-2" tooltip={name}>
                <Avatar className="size-6">
                  <AvatarFallback className="bg-surface2 text-[10px] text-brand">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => void signOut()} tooltip="Chiqish">
                <LogOut />
                <span>Chiqish</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-transparent">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/75 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <Badge variant="outline" className={cn('gap-1.5 border-border', status.className)}>
            <span className={cn('size-1.5 rounded-full', status.dot)} />
            {status.text}
          </Badge>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-2xl border border-border/80 bg-card/70 text-dim transition hover:border-borderStrong hover:text-foreground"
              aria-label="Bildirishnomalar"
            >
              <Bell className="size-4" />
            </button>
            <div className="hidden items-center gap-3 rounded-2xl border border-border/80 bg-card/70 px-3 py-2 sm:flex">
              <Avatar className="size-7">
                <AvatarFallback className="bg-surface2 text-[11px] text-brand">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-40 truncate text-sm font-medium text-foreground">{name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-7 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
