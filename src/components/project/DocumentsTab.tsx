import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface DocumentsTabProps {
  projectId: string;
  isAdmin: boolean;
}

export function DocumentsTab({ projectId, isAdmin }: DocumentsTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const documents = useQuery(api.documents.getProjectDocuments, { projectId: projectId as any });
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const uploadDocument = useMutation(api.documents.uploadDocument);
  const approveDocument = useMutation(api.documents.approveDocument);
  const toggleVisibility = useMutation(api.documents.toggleDocumentVisibility);

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const isVisible = formData.get("isVisible") === "on";
    const requiresApproval = formData.get("requiresApproval") === "on";

    if (!file || !title.trim()) {
      toast.error("Please provide a file and title");
      return;
    }

    setIsUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Save document record
      await uploadDocument({
        projectId: projectId as any,
        title: title.trim(),
        description: description.trim() || undefined,
        type: type as any,
        fileId: storageId,
        fileName: file.name,
        fileSize: file.size,
        isVisible,
        requiresApproval,
      });

      toast.success("Document uploaded successfully!");
      setShowUploadForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproval = async (documentId: string, status: "approved" | "declined", notes?: string) => {
    try {
      await approveDocument({
        documentId: documentId as any,
        status,
        notes,
      });
      toast.success(`Document ${status} successfully!`);
    } catch (error) {
      console.error("Approval error:", error);
      toast.error(`Failed to ${status} document`);
    }
  };

  const handleToggleVisibility = async (documentId: string, isVisible: boolean) => {
    try {
      await toggleVisibility({
        documentId: documentId as any,
        isVisible,
      });
      toast.success(`Document visibility updated!`);
    } catch (error) {
      console.error("Visibility error:", error);
      toast.error("Failed to update visibility");
    }
  };

  if (documents === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "quote": return "💰";
      case "invoice": return "🧾";
      case "contract": return "📋";
      default: return "📄";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "quote": return "bg-green-100 text-green-800";
      case "invoice": return "bg-blue-100 text-blue-800";
      case "contract": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getApprovalColor = (status?: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "declined": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "";
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Documents
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-[#0D333F] text-white px-4 py-2 rounded-lg hover:bg-[#0D333F]/90 transition-colors"
          >
            {showUploadForm ? "Cancel" : "Upload Document"}
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
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
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  name="type"
                  id="type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                >
                  <option value="quote">Quote</option>
                  <option value="invoice">Invoice</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
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

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                File *
              </label>
              <input
                type="file"
                name="file"
                id="file"
                required
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isVisible"
                  className="rounded border-gray-300 text-[#0D333F] focus:ring-[#0D333F]"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-gray-700">Visible to client</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requiresApproval"
                  className="rounded border-gray-300 text-[#0D333F] focus:ring-[#0D333F]"
                />
                <span className="ml-2 text-sm text-gray-700">Requires approval</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 bg-[#0D333F] text-white rounded-lg hover:bg-[#0D333F]/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No documents uploaded yet</div>
          <p className="text-gray-400">
            {isAdmin ? "Upload your first document to get started" : "Documents will appear here once uploaded"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <div key={document._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-2xl">{getTypeIcon(document.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(document.type)}`}>
                        {document.type}
                      </span>
                      {document.approvalStatus && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getApprovalColor(document.approvalStatus)}`}>
                          {document.approvalStatus}
                        </span>
                      )}
                      {isAdmin && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          document.isVisible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {document.isVisible ? "Visible" : "Hidden"}
                        </span>
                      )}
                    </div>
                    
                    {document.description && (
                      <p className="text-gray-600 mb-3">{document.description}</p>
                    )}
                    
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>Uploaded by: {document.uploader?.profile?.firstName} {document.uploader?.profile?.lastName}</div>
                      <div>Size: {(document.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                      <div>Uploaded: {new Date(document._creationTime).toLocaleDateString()}</div>
                      {document.approvedAt && (
                        <div>
                          {document.approvalStatus === "approved" ? "Approved" : "Declined"}: {new Date(document.approvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {document.approvalNotes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700">Notes:</div>
                        <div className="text-sm text-gray-600">{document.approvalNotes}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  {document.fileUrl && (
                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-[#0D333F] text-white text-sm rounded hover:bg-[#0D333F]/90 transition-colors text-center"
                    >
                      Download
                    </a>
                  )}
                  
                  {document.requiresApproval && document.approvalStatus === "pending" && !isAdmin && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleApproval(document._id, "approved")}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors w-full"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt("Optional notes for declining:");
                          handleApproval(document._id, "declined", notes || undefined);
                        }}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors w-full"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleToggleVisibility(document._id, !document.isVisible)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                    >
                      {document.isVisible ? "Hide" : "Show"}
                    </button>
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
