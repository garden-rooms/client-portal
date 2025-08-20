import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface PhotosTabProps {
  projectId: string;
  isAdmin: boolean;
}

export function PhotosTab({ projectId, isAdmin }: PhotosTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const photos = useQuery(api.photos.getProjectPhotos, { projectId: projectId as any });
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const uploadPhoto = useMutation(api.photos.uploadPhoto);
  const toggleVisibility = useMutation(api.photos.togglePhotoVisibility);
  const deletePhoto = useMutation(api.photos.deletePhoto);

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const caption = formData.get("caption") as string;
    const category = formData.get("category") as string;
    const isVisible = formData.get("isVisible") === "on";

    if (!file || !title.trim()) {
      toast.error("Please provide a file and title");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
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

      // Save photo record
      await uploadPhoto({
        projectId: projectId as any,
        title: title.trim(),
        caption: caption.trim() || undefined,
        fileId: storageId,
        fileName: file.name,
        category: category.trim() || undefined,
        isVisible,
      });

      toast.success("Photo uploaded successfully!");
      setShowUploadForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleVisibility = async (photoId: string, isVisible: boolean) => {
    try {
      await toggleVisibility({
        photoId: photoId as any,
        isVisible,
      });
      toast.success("Photo visibility updated!");
    } catch (error) {
      console.error("Visibility error:", error);
      toast.error("Failed to update visibility");
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    
    try {
      await deletePhoto({ photoId: photoId as any });
      toast.success("Photo deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete photo");
    }
  };

  if (photos === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Photos
        </h2>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-[#0D333F] text-white px-4 py-2 rounded-lg hover:bg-[#0D333F]/90 transition-colors"
        >
          {showUploadForm ? "Cancel" : "Upload Photo"}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Photo</h3>
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
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  id="category"
                  placeholder="e.g., Before, After, Progress"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                Caption
              </label>
              <textarea
                name="caption"
                id="caption"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Photo *
              </label>
              <input
                type="file"
                name="file"
                id="file"
                required
                accept="image/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isVisible"
                  className="rounded border-gray-300 text-[#0D333F] focus:ring-[#0D333F]"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-gray-700">Visible to client</span>
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

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No photos uploaded yet</div>
          <p className="text-gray-400">
            Photos will appear here once uploaded
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div key={photo._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {photo.fileUrl && (
                <img
                  src={photo.fileUrl}
                  alt={photo.title}
                  className="w-full h-48 object-cover"
                />
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{photo.title}</h3>
                  {isAdmin && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      photo.isVisible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {photo.isVisible ? "Visible" : "Hidden"}
                    </span>
                  )}
                </div>
                
                {photo.caption && (
                  <p className="text-gray-600 text-sm mb-3">{photo.caption}</p>
                )}
                
                {photo.category && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mb-3">
                    {photo.category}
                  </span>
                )}
                
                <div className="text-sm text-gray-500 space-y-1">
                  <div>By: {photo.uploader?.profile?.firstName} {photo.uploader?.profile?.lastName}</div>
                  <div>Uploaded: {new Date(photo._creationTime).toLocaleDateString()}</div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  {photo.fileUrl && (
                    <a
                      href={photo.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0D333F] hover:text-[#0D333F]/80 transition-colors text-sm font-medium"
                    >
                      View Full Size
                    </a>
                  )}
                  
                  <div className="flex space-x-2">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleToggleVisibility(photo._id, !photo.isVisible)}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                        >
                          {photo.isVisible ? "Hide" : "Show"}
                        </button>
                        <button
                          onClick={() => handleDelete(photo._id)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
