import React, { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  isAdmin: boolean;
}

export function ProjectList({ onSelectProject, isAdmin }: ProjectListProps) {
  const projects = useQuery(api.projects.getMyProjects);
  const notifySummary = useAction(api.notify_summary.notifyProjectSummary);

  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  if (projects === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4">
          {isAdmin ? "No projects created yet" : "No projects assigned to you yet"}
        </div>
        <p className="text-gray-400">
          {isAdmin ? "Create your first project to get started" : "Your projects will appear here once assigned"}
        </p>
      </div>
    );
  }

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

  const formatStatus = (status: string) =>
    status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

  async function handleNotifySummary(e: React.MouseEvent, projectId: Id<"projects">) {
    e.stopPropagation();
    try {
      setBusyProjectId(projectId);
      const res = await notifySummary({ projectId });
      if (res?.sent) {
        toast.success("Client notified with a summary email.");
      } else {
        toast.info("No new updates since last time.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to send summary.");
    } finally {
      setBusyProjectId(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
          {isAdmin ? "All Projects" : "Your Projects"}
        </h2>
        <p className="text-gray-600">
          {isAdmin ? "Manage all client projects" : "View and interact with your assigned projects"}
        </p>

        {/* DEBUG — remove later */}
        <div className="text-xs text-gray-400">ProjectList isAdmin = {String(isAdmin)}</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project._id}
            onClick={() => onSelectProject(project._id)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                {project.name}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {formatStatus(project.status)}
              </span>
            </div>

            {project.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {project.description}
              </p>
            )}

            <div className="space-y-2 text-sm text-gray-500">
              {isAdmin && (
                <div className="flex items-center">
                  <span className="font-medium">Client:</span>
                  <span className="ml-2">
                    {project.client?.profile?.firstName} {project.client?.profile?.lastName}
                  </span>
                </div>
              )}

              {project.budget && (
                <div className="flex items-center">
                  <span className="font-medium">Budget:</span>
                  <span className="ml-2">£{project.budget.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center">
                <span className="font-medium">Created:</span>
                <span className="ml-2">
                  {new Date(project._creationTime).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                className="text-[#0D333F] font-medium text-sm hover:text-[#0D333F]/80 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProject(project._id);
                }}
              >
                View Project →
              </button>

              {isAdmin && (
                <button
                  onClick={(e) => handleNotifySummary(e, project._id as Id<"projects">)}
                  disabled={busyProjectId === project._id}
                  className={`px-3 py-2 rounded-lg text-white transition-colors ${
                    busyProjectId === project._id
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#0D333F] hover:bg-[#0D333F]/90"
                  } text-sm`}
                  title="Send one email summarising recent changes"
                >
                  {busyProjectId === project._id ? "Sending…" : "Notify client about changes"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}