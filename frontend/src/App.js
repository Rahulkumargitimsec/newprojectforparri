import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Training from "@/pages/Training";
import Simulator from "@/pages/Simulator";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
          <main className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-64'
          }`}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/training" element={<Training />} />
              <Route path="/simulator" element={<Simulator />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </BrowserRouter>
    </div>
  );
}
export default App;
