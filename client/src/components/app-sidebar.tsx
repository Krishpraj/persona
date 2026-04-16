"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const nav = [
  { title: "Workspace", url: "/home" },
  { title: "Templates", url: "/home#templates" },
  { title: "Recent", url: "/home#projects" },
  { title: "Create", url: "/home#create" },
  { title: "Landing", url: "/" },
  { title: "GitHub", url: "https://github.com/KushalPraja/persona", external: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/60 p-0">
        <Link
          href="/"
          className="flex items-baseline gap-0 px-5 py-5 tracking-tight transition-colors hover:bg-card/60"
        >
          <span className="text-[18px] font-medium text-sidebar-foreground">
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
                const base = item.url.split("#")[0];
                const active =
                  !item.external &&
                  pathname === base &&
                  !item.url.includes("#");
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
                      <a
                        href={item.url}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noreferrer" : undefined}
                      >
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-0">
        <div className="px-5 py-4 text-[12px] text-muted-foreground">
          © {new Date().getFullYear()} persona
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
