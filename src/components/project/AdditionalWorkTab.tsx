import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface AdditionalWorkTabProps {
  projectId: string;
  isAdmin: boolean;
}

export function AdditionalWorkTab({ projectId, isAdmin }: AdditionalWorkTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const additionalWork = useQuery(api.additionalWork.getProjectAdditionalWork, { projectId: projectId as any });
  const createWork = useMutation(api.additionalWork.createAdditionalWork);
  const approveWork = useMutation(api.additionalWork.approveAdditionalWork);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);

  const handleCreateWork = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const file = formData.get("file") as File;

    if (!title.trim() || !description.trim() || !price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploading(true);
    try {
      let fileId = undefined;
      let fileName = undefined;

      // Upload file if provided
      if (file && file.size > 0) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await result.json();
        fileId = storageId;
        fileName = file.name;
      }

      await createWork({
        projectId: projectId as any,
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        fileId,
        fileName,
      });

      toast.success("Additional work created successfully!");
      setShowCreateForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Create work error:", error);
      toast.error("Failed to create additional work");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproval = async (workId: string, status: "approved" | "declined", notes?: string) => {
    try {
      await approveWork({
        workId: workId as any,
        status,
        notes,
      });
      toast.success(`Additional work ${status} successfully!`);
    } catch (error) {
      console.error("Approval error:", error);
      toast.error(`Failed to ${status} additional work`);
    }
  };

  if (additionalWork === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "declined": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Additional Work
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-[#0D333F] text-white px-4 py-2 rounded-lg hover:bg-[#0D333F]/90 transition-colors"
          >
            {showCreateForm ? "Cancel" : "Add Work Item"}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Additional Work Item</h3>
          <form onSubmit={handleCreateWork} className="space-y-4">
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
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price (£) *
                </label>
                <input
                  type="number"
                  name="price"
                  id="price"
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                placeholder="Describe the additional work in detail..."
              />
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Supporting Document (Optional)
              </label>
              <input
                type="file"
                name="file"
                id="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
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
                disabled={isUploading}
                className="px-4 py-2 bg-[#0D333F] text-white rounded-lg hover:bg-[#0D333F]/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? "Creating..." : "Create Work Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Work Items List */}
      {additionalWork.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No additional work items yet</div>
          <p className="text-gray-400">
            {isAdmin ? "Create your first work item to get started" : "Additional work items will appear here when proposed"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {additionalWork.map((work) => (
            <div key={work._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{work.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(work.status)}`}>
                      {work.status}
                    </span>
                    <span className="text-lg font-bold text-[#0D333F]">
                      £{work.price.toFixed(2)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 whitespace-pre-wrap">{work.description}</p>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Created by: {work.creator?.profile?.firstName} {work.creator?.profile?.lastName}</div>
                    <div>Created: {new Date(work._creationTime).toLocaleDateString()}</div>
                    {work.approvedAt && (
                      <div>
                        {work.status === "approved" ? "Approved" : "Declined"}: {new Date(work.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {work.clientNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">Client Notes:</div>
                      <div className="text-sm text-gray-600">{work.clientNotes}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {work.fileUrl && (
                    <a
                      href={work.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-[#0D333F] text-white text-sm rounded hover:bg-[#0D333F]/90 transition-colors text-center"
                    >
                      View Document
                    </a>
                  )}
                  
                  {work.status === "pending" && !isAdmin && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleApproval(work._id, "approved")}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors w-full"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt("Optional notes for declining:");
                          handleApproval(work._id, "declined", notes || undefined);
                        }}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors w-full"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
