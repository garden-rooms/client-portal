import { useAction } from "convex/react";



import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"clients" | "projects">("clients");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);

  const clients = useQuery(api.users.getAllClients);
  const projects = useQuery(api.projects.getMyProjects);
  // const inviteClient = useMutation(api.users.inviteClient);
  const createProject = useMutation(api.projects.createProject);
const inviteClientAndEmail = useAction(api.invitations.inviteClientAndEmail);
  const handleInviteClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const company = formData.get("company") as string;

    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await inviteClientAndEmail({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || undefined,
      });

      toast.success("Client invited successfully!");
      setShowInviteForm(false);
      e.currentTarget.reset();
      // (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to invite client");
    }
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const clientId = formData.get("clientId") as string;
    const budget = formData.get("budget") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    if (!name.trim() || !clientId) {
      toast.error("Please provide project name and select a client");
      return;
    }

    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        clientId: clientId as any,
        budget: budget ? parseFloat(budget) : undefined,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
      });

      toast.success("Project created successfully!");
      setShowCreateProjectForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error("Create project error:", error);
      toast.error(error.message || "Failed to create project");
    }
  };

  const tabs = [
    { id: "clients", label: "Clients", icon: "👥" },
    { id: "projects", label: "Projects", icon: "📊" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Admin Panel
        </h2>
        <p className="text-gray-600">Manage clients and projects</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Client Management</h3>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="bg-[#0D333F] text-white px-4 py-2 rounded-lg hover:bg-[#0D333F]/90 transition-colors"
            >
              {showInviteForm ? "Cancel" : "Invite Client"}
            </button>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Invite New Client</h4>
              <form onSubmit={handleInviteClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    id="company"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0D333F] text-white rounded-lg hover:bg-[#0D333F]/90 transition-colors"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Clients List */}
          {clients === undefined ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">No clients yet</div>
              <p className="text-gray-400">Invite your first client to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => (
                <div key={client._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-[#0D333F] rounded-full flex items-center justify-center text-white font-semibold">
                      {client.profile?.firstName?.[0]}{client.profile?.lastName?.[0]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {client.profile?.firstName} {client.profile?.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                  </div>
                  
                  {client.profile?.company && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Company:</span> {client.profile.company}
                    </p>
                  )}
                  
                  {client.profile?.phone && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Phone:</span> {client.profile.phone}
                    </p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.profile?.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {client.profile?.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Project Management</h3>
            <button
              onClick={() => setShowCreateProjectForm(!showCreateProjectForm)}
              className="bg-[#0D333F] text-white px-4 py-2 rounded-lg hover:bg-[#0D333F]/90 transition-colors"
            >
              {showCreateProjectForm ? "Cancel" : "Create Project"}
            </button>
          </div>

          {/* Create Project Form */}
          {showCreateProjectForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h4>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      name="clientId"
                      id="clientId"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                    >
                      <option value="">Select a client</option>
                      {clients?.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.profile?.firstName} {client.profile?.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                      Budget (£)
                    </label>
                    <input
                      type="number"
                      name="budget"
                      id="budget"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      id="startDate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      id="endDate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateProjectForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0D333F] text-white rounded-lg hover:bg-[#0D333F]/90 transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Projects List */}
          {projects === undefined ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">No projects yet</div>
              <p className="text-gray-400">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div key={project._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Client:</span> {project.client?.profile?.firstName} {project.client?.profile?.lastName}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> 
                      <span className="ml-1 capitalize">{project.status.replace("_", " ")}</span>
                    </div>
                    {project.budget && (
                      <div>
                        <span className="font-medium">Budget:</span> £{project.budget.toLocaleString()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Created:</span> {new Date(project._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
