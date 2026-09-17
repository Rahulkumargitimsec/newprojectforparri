import { NavLink } from "react-router-dom";
import { LayoutDashboard, Brain, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Sidebar = ({ collapsed, setCollapsed }) => {
  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/training", icon: Brain, label: "Model Training" },
    { path: "/simulator", icon: Users, label: "Simulator" },
  ];

  return (
    <aside
      data-testid="sidebar"
      className={`fixed left-0 h-full bg-card/50 backdrop-blur-xl border-r border-border/60 z-40 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-border/40">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <h2 className="text-xl font-bold tracking-tight">CBA Analytics</h2>
                <p className="text-xs text-muted-foreground mt-1">Web Usage Mining</p>
              </div>
            )}
            <Button
              data-testid="sidebar-toggle-btn"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="hover:bg-accent"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-link-${item.label.toLowerCase().replace(' ', '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {!collapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">CS Final Year Project</p>
              <p>Customer Behaviour Prediction</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
