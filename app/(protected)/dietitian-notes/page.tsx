'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { UserRole, DietitianNote } from '@/lib/types';

function getNoteDraftKey(userId: string) {
  return `note-draft-${userId}`;
}

function getEditDraftKey(userId: string, noteId: string) {
  return `note-edit-draft-${userId}-${noteId}`;
}

function getReplyDraftKey(userId: string, noteId: string) {
  return `note-reply-draft-${userId}-${noteId}`;
}

function loadNoteDraft(userId: string | undefined) {
  if (!userId) return null;
  try {
    const saved = localStorage.getItem(getNoteDraftKey(userId));
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export default function DietitianNotesPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [notes, setNotes] = useState<DietitianNote[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('client');
  const [profiles, setProfiles] = useState<Map<string, { full_name: string; role: UserRole }>>(new Map());
  const [loading, setLoading] = useState(true);

  // New note form — restore draft via lazy initializers
  const noteDraft = loadNoteDraft(user?.id);
  const [showNoteForm, setShowNoteForm] = useState(() => !!(noteDraft?.title || noteDraft?.content));
  const [noteTitle, setNoteTitle] = useState(() => noteDraft?.title || '');
  const [noteContent, setNoteContent] = useState(() => noteDraft?.content || '');
  const [saving, setSaving] = useState(false);

  // Edit note
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Reply
  const [replyingToNoteId, setReplyingToNoteId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Save new-note draft on changes
  useEffect(() => {
    if (!user?.id) return;
    if (!showNoteForm || (!noteTitle && !noteContent)) {
      localStorage.removeItem(getNoteDraftKey(user.id));
      return;
    }
    localStorage.setItem(getNoteDraftKey(user.id), JSON.stringify({ title: noteTitle, content: noteContent }));
  }, [user?.id, showNoteForm, noteTitle, noteContent]);

  // Save edit draft on changes
  useEffect(() => {
    if (!user?.id || !editingNoteId) return;
    if (!editTitle && !editContent) return;
    localStorage.setItem(getEditDraftKey(user.id, editingNoteId), JSON.stringify({ title: editTitle, content: editContent }));
  }, [user?.id, editingNoteId, editTitle, editContent]);

  // Save reply draft on changes
  useEffect(() => {
    if (!user?.id || !replyingToNoteId) return;
    if (!replyContent) return;
    localStorage.setItem(getReplyDraftKey(user.id, replyingToNoteId), JSON.stringify({ content: replyContent }));
  }, [user?.id, replyingToNoteId, replyContent]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUserRole(), fetchProfiles(), fetchNotes()]);
    setLoading(false);
  };

  const fetchUserRole = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user!.id)
      .single();
    if (data) setUserRole(data.role);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, role');
    if (data) {
      const map = new Map<string, { full_name: string; role: UserRole }>();
      data.forEach((p) => map.set(p.user_id, { full_name: p.full_name, role: p.role }));
      setProfiles(map);
    }
  };

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('dietitian_notes')
      .select('*, note_replies(*)')
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const getAuthorName = (authorId: string) => profiles.get(authorId)?.full_name || 'Unknown';
  const getAuthorRole = (authorId: string) => profiles.get(authorId)?.role || 'client';

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('dietitian_notes').insert({
      author_id: user!.id,
      title: noteTitle.trim(),
      content: noteContent.trim(),
    });
    if (!error) {
      if (user?.id) localStorage.removeItem(getNoteDraftKey(user.id));
      setNoteTitle('');
      setNoteContent('');
      setShowNoteForm(false);
      await fetchNotes();
    }
    setSaving(false);
  };

  const handleUpdateNote = async () => {
    if (!editingNoteId || !editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('dietitian_notes')
      .update({ title: editTitle.trim(), content: editContent.trim() })
      .eq('id', editingNoteId);
    if (!error) {
      if (user?.id) localStorage.removeItem(getEditDraftKey(user.id, editingNoteId));
      setEditingNoteId(null);
      await fetchNotes();
    }
    setSaving(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note and all its replies?')) return;
    const { error } = await supabase.from('dietitian_notes').delete().eq('id', noteId);
    if (!error) await fetchNotes();
  };

  const handleCreateReply = async (noteId: string) => {
    if (!replyContent.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('note_replies').insert({
      note_id: noteId,
      author_id: user!.id,
      content: replyContent.trim(),
    });
    if (!error) {
      if (user?.id) localStorage.removeItem(getReplyDraftKey(user.id, noteId));
      setReplyContent('');
      setReplyingToNoteId(null);
      await fetchNotes();
    }
    setSaving(false);
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return;
    const { error } = await supabase.from('note_replies').delete().eq('id', replyId);
    if (!error) await fetchNotes();
  };

  const startEditing = (noteId: string, title: string, content: string) => {
    setEditingNoteId(noteId);
    // Restore edit draft if exists
    if (user?.id) {
      try {
        const saved = localStorage.getItem(getEditDraftKey(user.id, noteId));
        if (saved) {
          const draft = JSON.parse(saved);
          setEditTitle(draft.title || title);
          setEditContent(draft.content || content);
          return;
        }
      } catch {}
    }
    setEditTitle(title);
    setEditContent(content);
  };

  const cancelEditing = () => {
    if (user?.id && editingNoteId) {
      localStorage.removeItem(getEditDraftKey(user.id, editingNoteId));
    }
    setEditingNoteId(null);
  };

  const startReplying = (noteId: string) => {
    setReplyingToNoteId(noteId);
    // Restore reply draft if exists
    if (user?.id) {
      try {
        const saved = localStorage.getItem(getReplyDraftKey(user.id, noteId));
        if (saved) {
          const draft = JSON.parse(saved);
          setReplyContent(draft.content || '');
          return;
        }
      } catch {}
    }
    setReplyContent('');
  };

  const cancelReplying = () => {
    if (user?.id && replyingToNoteId) {
      localStorage.removeItem(getReplyDraftKey(user.id, replyingToNoteId));
    }
    setReplyingToNoteId(null);
    setReplyContent('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Dietitian Notes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {userRole === 'dietitian'
            ? 'Leave notes and feedback for your client'
            : 'Notes and feedback from Emily'}
        </p>
      </div>

      {/* New Note - Dietitian only */}
      {userRole === 'dietitian' && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          {showNoteForm ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Note title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <textarea
                placeholder="Write your note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNote}
                  disabled={saving || !noteTitle.trim() || !noteContent.trim()}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Post Note'}
                </button>
                <button
                  onClick={() => {
                    if (user?.id) localStorage.removeItem(getNoteDraftKey(user.id));
                    setShowNoteForm(false);
                    setNoteTitle('');
                    setNoteContent('');
                  }}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNoteForm(true)}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              New Note
            </button>
          )}
        </div>
      )}

      {/* Notes Feed */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-center text-zinc-500 py-8">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
              {/* Note Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">{getAuthorName(note.author_id)}</span>
                    <span className="rounded-full bg-pink-100 text-pink-700 px-2 py-0.5 text-xs font-medium">
                      Dietitian
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{formatDate(note.created_at)}</p>
                </div>
                {userRole === 'dietitian' && note.author_id === user?.id && editingNoteId !== note.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(note.id, note.title, note.content)}
                      className="text-sm text-zinc-500 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Note Content or Edit Form */}
              {editingNoteId === note.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateNote}
                      disabled={saving || !editTitle.trim() || !editContent.trim()}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-zinc-900">{note.title}</h3>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{note.content}</p>
                </>
              )}

              {/* Replies */}
              {note.note_replies && note.note_replies.length > 0 && (
                <div className="border-t border-zinc-100 pt-4 space-y-3">
                  {[...note.note_replies]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((reply) => (
                      <div key={reply.id} className="ml-4 rounded-lg bg-zinc-50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-900">
                              {getAuthorName(reply.author_id)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                getAuthorRole(reply.author_id) === 'dietitian'
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-zinc-200 text-zinc-700'
                              }`}
                            >
                              {getAuthorRole(reply.author_id) === 'dietitian' ? 'Dietitian' : 'Client'}
                            </span>
                            <span className="text-xs text-zinc-500">{formatDate(reply.created_at)}</span>
                          </div>
                          {reply.author_id === user?.id && (
                            <button
                              onClick={() => handleDeleteReply(reply.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                </div>
              )}

              {/* Reply Form */}
              {replyingToNoteId === note.id ? (
                <div className="space-y-3 border-t border-zinc-100 pt-4">
                  <textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreateReply(note.id)}
                      disabled={saving || !replyContent.trim()}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Sending...' : 'Reply'}
                    </button>
                    <button
                      onClick={cancelReplying}
                      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startReplying(note.id)}
                  className="text-sm font-medium text-pink-600 hover:text-pink-700"
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
