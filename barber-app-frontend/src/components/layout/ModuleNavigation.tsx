import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type DashboardModule = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type ModuleNavigationProps = {
  modules: DashboardModule[];
  activeModule: string;
  onChange: (moduleId: string) => void;
};

export function ModuleNavigation({ modules, activeModule, onChange }: ModuleNavigationProps) {
  const active = modules.find((module) => module.id === activeModule) ?? modules[0];
  const ActiveIcon = active?.icon;

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-3 sm:p-4">
      <div className="sm:hidden flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2">
          {ActiveIcon ? <ActiveIcon className="h-4 w-4 text-primary" /> : null}
          <span className="text-sm font-medium">{active?.label ?? "Módulo"}</span>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="px-3">
              <Menu className="h-4 w-4 mr-2" />
              Menú
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm">
            <SheetHeader>
              <SheetTitle>Módulos</SheetTitle>
            </SheetHeader>
            <div className="mt-6 grid gap-2">
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = activeModule === module.id;
                return (
                  <Button
                    key={module.id}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => onChange(module.id)}
                    className={`justify-start gap-2 ${
                      isActive ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {module.label}
                    {isActive ? <span className="ml-auto h-2 w-2 rounded-full bg-primary-foreground" /> : null}
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden sm:flex flex-wrap gap-2">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;
          return (
            <Button
              key={module.id}
              variant={isActive ? "default" : "outline"}
              onClick={() => onChange(module.id)}
              className={`flex items-center gap-2 transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-primary/10 hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {module.label}
              {isActive ? <div className="w-2 h-2 bg-primary-foreground rounded-full ml-1" /> : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
