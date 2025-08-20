import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { ProjectList } from "./ProjectList";
import { ProjectView } from "./ProjectView";
import { AdminPanel } from "./AdminPanel";
import { NotificationBell } from "./NotificationBell";

interface DashboardProps {
  user: any;
}

export function Dashboard({ user }: DashboardProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"projects" | "admin">("projects");

  const isAdmin = user.profile?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-[#0D333F]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {isAdmin ? "Admin Dashboard" : "Client Portal"}
              </h1>
              
              {isAdmin && (
                <nav className="flex space-x-4">
                  <button
                    onClick={() => {
                      setActiveTab("projects");
                      setSelectedProjectId(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "projects"
                        ? "bg-[#0D333F] text-white"
                        : "text-gray-600 hover:text-[#0D333F]"
                    }`}
                  >
                    Projects
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("admin");
                      setSelectedProjectId(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === "admin"
                        ? "bg-[#0D333F] text-white"
                        : "text-gray-600 hover:text-[#0D333F]"
                    }`}
                  >
                    Admin
                  </button>
                </nav>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="text-sm text-gray-600">
                Welcome, {user.profile?.firstName} {user.profile?.lastName}
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProjectId ? (
          <ProjectView 
            projectId={selectedProjectId} 
            onBack={() => setSelectedProjectId(null)}
            isAdmin={isAdmin}
          />
        ) : activeTab === "admin" && isAdmin ? (
          <AdminPanel />
        ) : (
          <ProjectList 
            onSelectProject={setSelectedProjectId}
            isAdmin={isAdmin}
          />
        )}
      </main>
    </div>
  );
}
