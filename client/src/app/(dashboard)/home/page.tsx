"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ProjectFormData {
  productName: string;
  tone: string;
  prompt: string;
}

interface SavedProject {
  id: string;
  name: string;
  tone: string;
  prompt: string;
  createdAt: string;
  lastModified: string;
}

/* ——————————————————————————————————————————————————————————————
 * PAGE
 * —————————————————————————————————————————————————————————————— */

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [formData, setFormData] = useState<ProjectFormData>({
    productName: "",
    tone: "professional",
    prompt: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("persona-projects");
      if (saved) setSavedProjects(JSON.parse(saved));
    } catch (error) {
      console.error("Error loading saved projects:", error);
    }
  }, []);

  const saveProjectsToStorage = (projects: SavedProject[]) => {
    try {
      localStorage.setItem("persona-projects", JSON.stringify(projects));
      setSavedProjects(projects);
    } catch (error) {
      console.error("Error saving projects:", error);
    }
  };

  const toneOptions = [
    { value: "professional", label: "Professional" },
    { value: "friendly", label: "Friendly" },
    { value: "technical", label: "Technical" },
    { value: "casual", label: "Casual" },
    { value: "authoritative", label: "Authoritative" },
    { value: "empathetic", label: "Empathetic" },
  ];

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateProject = () => {
    if (!formData.productName.trim()) {
      alert("Please enter a product name");
      return;
    }
    setIsCreating(true);

    const projectId = `${formData.productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const newProject: SavedProject = {
      id: projectId,
      name: formData.productName,
      tone: formData.tone,
      prompt:
        formData.prompt ||
        `Create comprehensive documentation for ${formData.productName} with a ${formData.tone} tone.`,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    saveProjectsToStorage([newProject, ...savedProjects]);
    setFormData({ productName: "", tone: "professional", prompt: "" });

    const params = new URLSearchParams({
      name: formData.productName,
      tone: formData.tone,
      prompt:
        formData.prompt ||
        `Create comprehensive documentation for ${formData.productName} with a ${formData.tone} tone.`,
    });

    router.push(`/product/${projectId}?${params.toString()}`);
  };

  const quickStartTemplates = [
    {
      name: "SaaS Product",
      tone: "professional",
      prompt:
        "Create comprehensive documentation for a SaaS product including features, pricing, integrations, and user guides.",
    },
    {
      name: "Mobile App",
      tone: "friendly",
      prompt:
        "Document a mobile application with user-friendly guides, troubleshooting tips, and feature explanations.",
    },
    {
      name: "API",
      tone: "technical",
      prompt:
        "Generate technical documentation for an API including endpoints, authentication, examples, and error handling.",
    },
  ];

  const handleQuickStart = (template: (typeof quickStartTemplates)[0]) => {
    setFormData({
      productName: template.name,
      tone: template.tone,
      prompt: template.prompt,
    });
    document
      .getElementById("create")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOpenProject = (project: SavedProject) => {
    const params = new URLSearchParams({
      name: project.name,
      tone: project.tone,
      prompt: project.prompt,
    });
    router.push(`/product/${project.id}?${params.toString()}`);
  };

  const handleDeleteProject = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("Delete this project? This action cannot be undone.")) return;
    saveProjectsToStorage(savedProjects.filter((p) => p.id !== projectId));
    try {
      localStorage.removeItem(`product-flow-${projectId}`);
    } catch (error) {
      console.error("Error removing project data:", error);
    }
  };

  const handleClearAllProjects = () => {
    if (!confirm("Delete ALL projects? This action cannot be undone.")) return;
    savedProjects.forEach((project) => {
      try {
        localStorage.removeItem(`product-flow-${project.id}`);
      } catch (error) {
        console.error("Error removing project data:", error);
      }
    });
    saveProjectsToStorage([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " · " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const canSubmit = !isCreating && formData.productName.trim().length > 0;

  return (
    <div className="-m-4 min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-8 py-12">
        {/* ——— TITLE ——— */}
        <div className="mb-14">
          <h1 className="text-[2.5rem] font-medium leading-[1.05] tracking-[-0.02em]">
            New project
          </h1>
          <p className="mt-3 text-[16px] text-muted-foreground">
            Spin up a typed knowledge graph for your product.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          {/* ——— MAIN COLUMN ——— */}
          <div className="flex flex-col gap-14">
            {/* CREATE */}
            <section id="create" className="scroll-mt-6">
              <h2 className="mb-5 text-[20px] font-medium tracking-tight">
                Details
              </h2>

              <div className="border border-border/70 bg-card/30">
                <div className="divide-y divide-border/60">
                  {/* Name */}
                  <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-center">
                    <label
                      htmlFor="productName"
                      className="text-[14px] text-muted-foreground"
                    >
                      Name
                    </label>
                    <input
                      id="productName"
                      type="text"
                      value={formData.productName}
                      onChange={(e) =>
                        handleInputChange("productName", e.target.value)
                      }
                      placeholder="MyAwesome App"
                      className="w-full rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                    />
                  </div>

                  {/* Tone */}
                  <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-start">
                    <label className="pt-1 text-[14px] text-muted-foreground">
                      Tone
                    </label>
                    <div className="flex flex-wrap gap-px bg-border/70 p-px">
                      {toneOptions.map((tone) => {
                        const active = formData.tone === tone.value;
                        return (
                          <button
                            key={tone.value}
                            type="button"
                            onClick={() =>
                              handleInputChange("tone", tone.value)
                            }
                            className={cn(
                              "min-w-[120px] flex-1 px-4 py-2.5 text-[14px] tracking-tight transition-colors",
                              active
                                ? "bg-primary/15 text-primary"
                                : "bg-card/40 text-foreground/80 hover:bg-card/80 hover:text-foreground"
                            )}
                          >
                            {tone.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:items-start">
                    <label
                      htmlFor="prompt"
                      className="pt-1 text-[14px] text-muted-foreground"
                    >
                      Prompt
                      <span className="ml-2 text-[12px] text-muted-foreground/60">
                        optional
                      </span>
                    </label>
                    <textarea
                      id="prompt"
                      value={formData.prompt}
                      onChange={(e) =>
                        handleInputChange("prompt", e.target.value)
                      }
                      placeholder="Describe the docs, audience, requirements…"
                      rows={4}
                      className="w-full resize-none rounded-none border border-border/70 bg-background/40 px-3 py-2.5 text-[14.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none"
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex items-center justify-end gap-4 bg-background/30 px-6 py-4">
                    <button
                      onClick={handleCreateProject}
                      disabled={!canSubmit}
                      className={cn(
                        "inline-flex h-10 items-center justify-center gap-2 rounded-none border px-6 text-[14px] font-medium tracking-tight transition-colors",
                        canSubmit
                          ? "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90"
                          : "cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground"
                      )}
                    >
                      {isCreating ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
                          Creating…
                        </>
                      ) : (
                        <>Create project</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* RECENT */}
            <section id="projects" className="scroll-mt-6">
              <div className="mb-5 flex items-end justify-between">
                <h2 className="text-[20px] font-medium tracking-tight">
                  Recent
                </h2>
                {savedProjects.length > 0 && (
                  <button
                    onClick={handleClearAllProjects}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {savedProjects.length === 0 ? (
                <div className="border border-dashed border-border/60 bg-card/20 px-6 py-10 text-center text-[14px] text-muted-foreground">
                  No projects yet. Create one above to get started.
                </div>
              ) : (
                <ul className="divide-y divide-border/70 overflow-hidden border border-border/70 bg-card/30">
                  {savedProjects.slice(0, 6).map((project) => (
                    <li
                      key={project.id}
                      onClick={() => handleOpenProject(project)}
                      className="group grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-card/70"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-medium tracking-tight">
                          {project.name}
                        </div>
                        <div className="mt-1 text-[12.5px] text-muted-foreground">
                          {formatDate(project.createdAt)}
                        </div>
                      </div>
                      <span className="text-[12px] uppercase tracking-[0.12em] text-primary/80">
                        {project.tone}
                      </span>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="text-[18px] leading-none text-muted-foreground/60 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                        title="Delete"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {savedProjects.length > 6 && (
                <p className="mt-2 text-right text-[12.5px] text-muted-foreground">
                  +{savedProjects.length - 6} more
                </p>
              )}
            </section>
          </div>

          {/* ——— SIDEBAR COLUMN — TEMPLATES ——— */}
          <aside id="templates" className="scroll-mt-6">
            <h2 className="mb-5 text-[20px] font-medium tracking-tight">
              Templates
            </h2>

            <div className="flex flex-col overflow-hidden border border-border/70 bg-card/30">
              {quickStartTemplates.map((template, i) => (
                <button
                  key={template.name}
                  onClick={() => handleQuickStart(template)}
                  className={cn(
                    "flex flex-col gap-1.5 px-5 py-4 text-left transition-colors hover:bg-card/70",
                    i < quickStartTemplates.length - 1 &&
                      "border-b border-border/60"
                  )}
                >
                  <span className="text-[15px] font-medium tracking-tight">
                    {template.name}
                  </span>
                  <span className="text-[12px] uppercase tracking-[0.12em] text-primary/70">
                    {template.tone}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-[12.5px] text-muted-foreground">
              Click to seed the form.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
