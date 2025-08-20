import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface MilestonesTabProps {
  projectId: string;
  isAdmin: boolean;
}

export function MilestonesTab({ projectId, isAdmin }: MilestonesTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const milestones = useQuery(api.milestones.getProjectMilestones, { projectId: projectId as any });
  const createMilestone = useMutation(api.milestones.createMilestone);
  const updateMilestone = useMutation(api.milestones.updateMilestone);
  const deleteMilestone = useMutation(api.milestones.deleteMilestone);

  const handleCreateMilestone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dueDate = formData.get("dueDate") as string;

    if (!title.trim()) {
      toast.error("Please provide a milestone title");
      return;
    }

    try {
      await createMilestone({
        projectId: projectId as any,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      });

      toast.success("Milestone created successfully!");
      setShowCreateForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Create milestone error:", error);
      toast.error("Failed to create milestone");
    }
  };

  const handleToggleComplete = async (milestoneId: string, isCompleted: boolean) => {
    try {
      await updateMilestone({
        milestoneId: milestoneId as any,
        isCompleted: !isCompleted,
      });
      toast.success(`Milestone ${!isCompleted ? 'completed' : 'reopened'}!`);
    } catch (error) {
      console.error("Update milestone error:", error);
      toast.error("Failed to update milestone");
    }
  };

  const handleDelete = async (milestoneId: string) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    
    try {
      await deleteMilestone({ milestoneId: milestoneId as any });
      toast.success("Milestone deleted successfully!");
    } catch (error) {
      console.error("Delete milestone error:", error);
      toast.error("Failed to delete milestone");
    }
  };

  if (milestones === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }

  const completedCount = milestones.filter(m => m.isCompleted).length;
  const totalCount = milestones.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Milestones
          </h2>
          {totalCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {completedCount} of {totalCount} completed ({Math.round(progressPercentage)}%)
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-[#0D333F] text-white px-4 py-2 rounded-lg hover:bg-[#0D333F]/90 transition-colors"
          >
            {showCreateForm ? "Cancel" : "Add Milestone"}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-[#0D333F] h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Milestone</h3>
          <form onSubmit={handleCreateMilestone} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  id="dueDate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                />
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
                placeholder="Describe this milestone..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0D333F] text-white rounded-lg hover:bg-[#0D333F]/90 transition-colors"
              >
                Create Milestone
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No milestones created yet</div>
          <p className="text-gray-400">
            {isAdmin ? "Create your first milestone to track project progress" : "Milestones will appear here once created"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div key={milestone._id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
              milestone.isCompleted ? 'opacity-75' : ''
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <button
                    onClick={() => isAdmin && handleToggleComplete(milestone._id, milestone.isCompleted)}
                    disabled={!isAdmin}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      milestone.isCompleted 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300 hover:border-[#0D333F]'
                    } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {milestone.isCompleted && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${
                      milestone.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      {milestone.title}
                    </h3>
                    
                    {milestone.description && (
                      <p className="text-gray-600 mt-2 whitespace-pre-wrap">{milestone.description}</p>
                    )}
                    
                    <div className="mt-3 text-sm text-gray-500 space-y-1">
                      {milestone.dueDate && (
                        <div className={`flex items-center ${
                          milestone.dueDate < Date.now() && !milestone.isCompleted ? 'text-red-600' : ''
                        }`}>
                          <span className="font-medium">Due:</span>
                          <span className="ml-2">{new Date(milestone.dueDate).toLocaleDateString()}</span>
                          {milestone.dueDate < Date.now() && !milestone.isCompleted && (
                            <span className="ml-2 text-red-600 font-medium">(Overdue)</span>
                          )}
                        </div>
                      )}
                      
                      {milestone.completedAt && (
                        <div className="text-green-600">
                          <span className="font-medium">Completed:</span>
                          <span className="ml-2">{new Date(milestone.completedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDelete(milestone._id)}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
