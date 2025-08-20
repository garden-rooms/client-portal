import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

interface NotesTabProps {
  projectId: string;
  isAdmin: boolean;
}

export function NotesTab({ projectId, isAdmin }: NotesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const notes = useQuery(api.notes.getProjectNotes, { projectId: projectId as any });
  const addNote = useMutation(api.notes.addNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);

  const handleAddNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = formData.get("content") as string;
    const isVisible = formData.get("isVisible") === "on";
    const isPinned = formData.get("isPinned") === "on";

    if (!content.trim()) {
      toast.error("Please enter note content");
      return;
    }

    try {
      await addNote({
        projectId: projectId as any,
        content: content.trim(),
        isVisible,
        isPinned,
      });

      toast.success("Note added successfully!");
      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Add note error:", error);
      toast.error("Failed to add note");
    }
  };

  const handleUpdateNote = async (noteId: string, updates: any) => {
    try {
      await updateNote({
        noteId: noteId as any,
        ...updates,
      });
      toast.success("Note updated successfully!");
      setEditingNote(null);
    } catch (error) {
      console.error("Update note error:", error);
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    try {
      await deleteNote({ noteId: noteId as any });
      toast.success("Note deleted successfully!");
    } catch (error) {
      console.error("Delete note error:", error);
      toast.error("Failed to delete note");
    }
  };

  if (notes === undefined) {
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
          Project Notes
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#0D333F] text-white px-4 py-2 rounded-lg hover:bg-[#0D333F]/90 transition-colors"
          >
            {showAddForm ? "Cancel" : "Add Note"}
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {showAddForm && isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Note</h3>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Note Content *
              </label>
              <textarea
                name="content"
                id="content"
                rows={4}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                placeholder="Enter your note here..."
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
                  name="isPinned"
                  className="rounded border-gray-300 text-[#0D333F] focus:ring-[#0D333F]"
                />
                <span className="ml-2 text-sm text-gray-700">Pin to top</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0D333F] text-white rounded-lg hover:bg-[#0D333F]/90 transition-colors"
              >
                Add Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">No notes added yet</div>
          <p className="text-gray-400">
            {isAdmin ? "Add your first note to get started" : "Notes will appear here once added"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned notes first */}
          {notes.filter(note => note.isPinned).map((note) => (
            <div key={note._id} className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-600 font-medium text-sm">📌 Pinned</span>
                    {isAdmin && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        note.isVisible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {note.isVisible ? "Visible" : "Hidden"}
                      </span>
                    )}
                  </div>
                  
                  {editingNote === note._id ? (
                    <div className="space-y-3">
                      <textarea
                        defaultValue={note.content}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditingNote(null);
                          }
                        }}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                            handleUpdateNote(note._id, { content: textarea.value });
                          }}
                          className="px-3 py-1 bg-[#0D333F] text-white text-sm rounded hover:bg-[#0D333F]/90 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-900 whitespace-pre-wrap">{note.content}</div>
                  )}
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <div>By: {note.author?.profile?.firstName} {note.author?.profile?.lastName}</div>
                    <div>Added: {new Date(note._creationTime).toLocaleDateString()}</div>
                  </div>
                </div>

                {isAdmin && editingNote !== note._id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingNote(note._id)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleUpdateNote(note._id, { isPinned: false })}
                      className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                    >
                      Unpin
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Regular notes */}
          {notes.filter(note => !note.isPinned).map((note) => (
            <div key={note._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {isAdmin && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        note.isVisible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {note.isVisible ? "Visible" : "Hidden"}
                      </span>
                    )}
                  </div>
                  
                  {editingNote === note._id ? (
                    <div className="space-y-3">
                      <textarea
                        defaultValue={note.content}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0D333F] focus:border-transparent"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditingNote(null);
                          }
                        }}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                            handleUpdateNote(note._id, { content: textarea.value });
                          }}
                          className="px-3 py-1 bg-[#0D333F] text-white text-sm rounded hover:bg-[#0D333F]/90 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-900 whitespace-pre-wrap">{note.content}</div>
                  )}
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <div>By: {note.author?.profile?.firstName} {note.author?.profile?.lastName}</div>
                    <div>Added: {new Date(note._creationTime).toLocaleDateString()}</div>
                  </div>
                </div>

                {isAdmin && editingNote !== note._id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingNote(note._id)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleUpdateNote(note._id, { isPinned: true })}
                      className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                    >
                      Pin
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note._id)}
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
