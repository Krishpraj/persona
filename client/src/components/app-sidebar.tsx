"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useMe, displayName } from "@/lib/me-context";
import { supabase } from "@/lib/supabase";

const nav = [
  { title: "Projects", url: "/home" },
  { title: "Skills", url: "/skills" },
  { title: "Usage", url: "/usage" },
  { title: "Settings", url: "/settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const name = displayName(me);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  return (
    <Sidebar className="border-r border-border/60">
      <SidebarHeader className="h-16 shrink-0 justify-center border-b border-border/60 p-0">
        <Link
          href="/"
          className="flex h-full items-center gap-0 px-5 tracking-tight transition-colors hover:bg-card/60"
        >
          <span className="text-[18px] font-medium leading-none text-sidebar-foreground">
            persona
          </span>
          <span className="cursor-blink ml-0.5 font-mono text-[20px] leading-none text-primary">
            _
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-0 pt-3">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {nav.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "h-11 rounded-none border-l-2 border-transparent px-5 font-normal text-[15px] tracking-tight text-sidebar-foreground/80 hover:bg-card/60 hover:text-sidebar-foreground",
                        active &&
                          "border-primary bg-card/40 text-sidebar-foreground"
                      )}
                    >
                      <Link href={item.url}>
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-0">
        <div className="px-5 py-4">
          {me.loading ? (
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              …
            </div>
          ) : name ? (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="mr-2 inline-block h-px w-4 bg-primary/60 align-middle" />
                signed in
              </div>
              <div className="mt-1.5 truncate text-[15px] font-normal tracking-tight text-sidebar-foreground">
                hi, {name}
              </div>
              {me.user?.email && (
                <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">
                  {me.user.email}
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="mt-3 inline-flex h-8 items-center justify-center rounded-none border border-border/70 bg-background/40 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                sign out
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="inline-flex h-8 items-center justify-center rounded-none border border-primary/70 bg-primary px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground"
            >
              sign in
            </Link>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
