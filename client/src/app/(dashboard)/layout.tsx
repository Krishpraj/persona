"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MeProvider } from "@/lib/me-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, Fragment } from "react";
import type React from "react";

function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
}

type Crumb = { label: string; href?: string };

type LookupCache = {
  projects: Record<string, string>;
  agents: Record<string, { name: string; projectId: string; projectName: string }>;
};

function useBreadcrumbCrumbs(pathname: string): Crumb[] {
  const segments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname]
  );

  const [cache, setCache] = useState<LookupCache>({ projects: {}, agents: {} });

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      // projects/[id]
      if (segments[0] === "projects" && segments[1]) {
        const id = segments[1];
        if (!cache.projects[id]) {
          const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
          if (!res.ok || cancelled) return;
          const body = await res.json().catch(() => null);
          if (!cancelled && body?.project?.name) {
            setCache((c) => ({
              ...c,
              projects: { ...c.projects, [id]: body.project.name },
            }));
          }
        }
      }
      // agent/[id]
      if (segments[0] === "agent" && segments[1]) {
        const id = segments[1];
        if (!cache.agents[id]) {
          const res = await fetch(`/api/agents/${id}`, { cache: "no-store" });
          if (!res.ok || cancelled) return;
          const body = await res.json().catch(() => null);
          const agent = body?.agent;
          if (!cancelled && agent?.id) {
            let projectName = cache.projects[agent.project_id] ?? "";
            if (!projectName && agent.project_id) {
              const pres = await fetch(`/api/projects/${agent.project_id}`, {
                cache: "no-store",
              });
              if (pres.ok) {
                const pbody = await pres.json().catch(() => null);
                projectName = pbody?.project?.name ?? "";
              }
            }
            if (cancelled) return;
            setCache((c) => ({
              ...c,
              projects: projectName
                ? { ...c.projects, [agent.project_id]: projectName }
                : c.projects,
              agents: {
                ...c.agents,
                [id]: {
                  name: agent.name,
                  projectId: agent.project_id,
                  projectName,
                },
              },
            }));
          }
        }
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [segments, cache.projects, cache.agents]);

  return useMemo<Crumb[]>(() => {
    const home: Crumb = { label: "Home", href: "/home" };
    if (segments.length === 0) return [{ label: "Home" }];

    const [root, id] = segments;

    if (root === "home") return [{ label: "Home" }];

    if (root === "settings") return [home, { label: "Settings" }];

    if (root === "usage") return [home, { label: "Usage" }];

    if (root === "skills") return [home, { label: "Skills" }];

    if (root === "projects" && id) {
      const name = cache.projects[id] ?? "Project";
      return [home, { label: name }];
    }

    if (root === "agent" && id) {
      const a = cache.agents[id];
      if (!a) return [home, { label: "Agent" }];
      return [
        home,
        a.projectName
          ? { label: a.projectName, href: `/projects/${a.projectId}` }
          : { label: "Project" },
        { label: a.name || "Agent" },
      ];
    }

    // fallback: title-case each segment
    const crumbs: Crumb[] = [home];
    for (let i = 0; i < segments.length; i++) {
      const href = "/" + segments.slice(0, i + 1).join("/");
      const isLast = i === segments.length - 1;
      const label = segments[i]
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      crumbs.push({ label, href: isLast ? undefined : href });
    }
    return crumbs;
  }, [segments, cache]);
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasMounted = useHasMounted();
  const crumbs = useBreadcrumbCrumbs(pathname);

  if (!hasMounted) {
    return (
      <MeProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="h-16 shrink-0 border-b border-border/60 px-4" />
            <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </MeProvider>
    );
  }

  return (
    <MeProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.map((c, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <Fragment key={`${c.label}-${i}`}>
                      <BreadcrumbItem>
                        {isLast || !c.href ? (
                          <BreadcrumbPage className="max-w-[220px] truncate">
                            {c.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            href={c.href}
                            className="max-w-[220px] truncate"
                          >
                            {c.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </MeProvider>
  );
}
