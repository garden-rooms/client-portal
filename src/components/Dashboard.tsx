import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProjectList } from "./ProjectList";

export default function Dashboard() {
  // Load the signed-in user (and their profile/role)
  const me = useQuery(api.users.getCurrentUser);
  const isAdmin = me?.profile?.role === "admin";

  

  



  // Navigate to a project (adjust if you use a router)
  const handleSelectProject = (projectId: string) => {
    window.location.href = `/portal/projects/${projectId}`;
  };

  // Optional loader while user/profile is loading
  if (me === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }
  
<ProjectList onSelectProject={handleSelectProject} isAdmin={!!isAdmin} />

  return (
    <div className="space-y-4">
      {/* DEBUG — remove once you confirm it's true */}
      <div className="text-xs text-gray-400">Dashboard isAdmin = {String(isAdmin)}</div>

      <ProjectList
        onSelectProject={handleSelectProject}
        isAdmin={!!isAdmin}
      />
    </div>

    
  );
}