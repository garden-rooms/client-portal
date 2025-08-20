import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface OverviewTabProps {
  project: any;
  isAdmin: boolean;
}

export function OverviewTab({ project, isAdmin }: OverviewTabProps) {
  // Get actual counts for project activity
  const documents = useQuery(api.documents.getProjectDocuments, { projectId: project._id });
  const photos = useQuery(api.photos.getProjectPhotos, { projectId: project._id });
  const notes = useQuery(api.notes.getProjectNotes, { projectId: project._id });
  const milestones = useQuery(api.milestones.getProjectMilestones, { projectId: project._id });

  const documentCount = documents?.length || 0;
  const photoCount = photos?.length || 0;
  const noteCount = notes?.length || 0;
  const milestoneCount = milestones?.length || 0;
  const completedMilestones = milestones?.filter(m => m.isCompleted).length || 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Project Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Project Details
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Status</span>
            <p className="text-gray-900 capitalize">{project.status.replace("_", " ")}</p>
          </div>
          
          {project.budget && (
            <div>
              <span className="text-sm font-medium text-gray-500">Budget</span>
              <p className="text-gray-900">£{project.budget.toLocaleString()}</p>
            </div>
          )}
          
          <div>
            <span className="text-sm font-medium text-gray-500">Created</span>
            <p className="text-gray-900">{new Date(project._creationTime).toLocaleDateString()}</p>
          </div>
          
          {project.startDate && (
            <div>
              <span className="text-sm font-medium text-gray-500">Start Date</span>
              <p className="text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
            </div>
          )}
          
          {project.endDate && (
            <div>
              <span className="text-sm font-medium text-gray-500">End Date</span>
              <p className="text-gray-900">{new Date(project.endDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Client Information */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Client Information
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Name</span>
              <p className="text-gray-900">
                {project.client?.profile?.firstName} {project.client?.profile?.lastName}
              </p>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-500">Email</span>
              <p className="text-gray-900">{project.client?.email}</p>
            </div>
            
            {project.client?.profile?.company && (
              <div>
                <span className="text-sm font-medium text-gray-500">Company</span>
                <p className="text-gray-900">{project.client.profile.company}</p>
              </div>
            )}
            
            {project.client?.profile?.phone && (
              <div>
                <span className="text-sm font-medium text-gray-500">Phone</span>
                <p className="text-gray-900">{project.client.profile.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Project Activity
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0D333F]">{documentCount}</div>
            <div className="text-sm text-gray-500">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0D333F]">{photoCount}</div>
            <div className="text-sm text-gray-500">Photos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0D333F]">{noteCount}</div>
            <div className="text-sm text-gray-500">Notes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0D333F]">{milestoneCount}</div>
            <div className="text-sm text-gray-500">Milestones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#0D333F]">{completedMilestones}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>
      </div>

      {/* Milestones Progress */}
      {milestoneCount > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Milestone Progress
          </h3>
          <div className="space-y-3">
            {milestones?.slice(0, 5).map((milestone) => (
              <div key={milestone._id} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                  milestone.isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {milestone.isCompleted && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    milestone.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {milestone.title}
                  </div>
                  {milestone.dueDate && (
                    <div className="text-xs text-gray-500">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {milestoneCount > 5 && (
              <div className="text-sm text-gray-500 text-center pt-2">
                And {milestoneCount - 5} more milestones...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
