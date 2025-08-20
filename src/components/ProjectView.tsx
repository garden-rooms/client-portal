import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DocumentsTab } from "./project/DocumentsTab";
import { PhotosTab } from "./project/PhotosTab";
import { NotesTab } from "./project/NotesTab";
import { OverviewTab } from "./project/OverviewTab";
import { AdditionalWorkTab } from "./project/AdditionalWorkTab";
import { MilestonesTab } from "./project/MilestonesTab";

interface ProjectViewProps {
  projectId: string;
  onBack: () => void;
  isAdmin: boolean;
}

export function ProjectView({ projectId, onBack, isAdmin }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "photos" | "notes" | "additional-work" | "milestones">("overview");
  
  const project = useQuery(api.projects.getProject, { projectId: projectId as any });

  if (project === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">Project not found</div>
        <button
          onClick={onBack}
          className="text-[#0D333F] hover:text-[#0D333F]/80 transition-colors"
        >
          ← Back to Projects
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "documents", label: "Documents", icon: "📄" },
    { id: "photos", label: "Photos", icon: "📸" },
    { id: "notes", label: "Notes", icon: "📝" },
    { id: "additional-work", label: "Additional Work", icon: "💰" },
    { id: "milestones", label: "Milestones", icon: "🎯" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "review": return "bg-purple-100 text-purple-800";
      case "completed": return "bg-green-100 text-green-800";
      case "on_hold": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-[#0D333F] hover:text-[#0D333F]/80 transition-colors mb-4 flex items-center"
        >
          ← Back to Projects
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {project.name}
            </h1>
            {project.description && (
              <p className="text-gray-600 mb-4">{project.description}</p>
            )}
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                {formatStatus(project.status)}
              </span>
              {isAdmin && (
                <span className="text-sm text-gray-500">
                  Client: {project.client?.profile?.firstName} {project.client?.profile?.lastName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#0D333F] text-[#0D333F]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab project={project} isAdmin={isAdmin} />
        )}
        {activeTab === "documents" && (
          <DocumentsTab projectId={projectId as any} isAdmin={isAdmin} />
        )}
        {activeTab === "photos" && (
          <PhotosTab projectId={projectId as any} isAdmin={isAdmin} />
        )}
        {activeTab === "notes" && (
          <NotesTab projectId={projectId as any} isAdmin={isAdmin} />
        )}
        {activeTab === "additional-work" && (
          <AdditionalWorkTab projectId={projectId as any} isAdmin={isAdmin} />
        )}
        {activeTab === "milestones" && (
          <MilestonesTab projectId={projectId as any} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
