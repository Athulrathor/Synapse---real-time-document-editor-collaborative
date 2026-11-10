import { create } from "zustand";

export interface MockDocument {
  id: string;
  title: string;
  content: string;
}

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

interface DocumentDraft {
  documentId: string;
  title: string;
  content: string;
}

interface DocumentUIState {
  // Editor UI state
  editingDocumentId: string | null;
  documentDraft: DocumentDraft | null;
  saveStatus: SaveStatus;

  // Mock document state
  document: MockDocument;
  savedTitle: string;
  savedContent: string;

  // UI actions
  setEditingDocument: (documentId: string | null) => void;
  setDocumentDraft: (draft: DocumentDraft | null) => void;
  setSaveStatus: (status: SaveStatus) => void;

  // Mock document actions
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  saveMockDocument: () => void;
  resetMockDocument: (documentId: string) => void;
}

const createMockDocument = (id: string): MockDocument => ({
  id,
  title: "Original Mock Document",
  content: "This is mock content. Try editing it.",
});

export const useDocumentEditorStore = create<DocumentUIState>((set, get) => ({
  editingDocumentId: null,
  documentDraft: null,
  saveStatus: "saved",

  document: createMockDocument("mock-document-001"),
  savedTitle: "Original Mock Document",
  savedContent: "This is mock content. Try editing it.",

  setEditingDocument: (documentId) =>
    set({ editingDocumentId: documentId }),

  setDocumentDraft: (draft) =>
    set({ documentDraft: draft }),

  setSaveStatus: (status) =>
    set({ saveStatus: status }),

  setTitle: (title) => {
    const { document, savedTitle, savedContent } = get();

    set({
      document: { ...document, title },
      documentDraft: {
        documentId: document.id,
        title,
        content: get().document.content,
      },
      saveStatus:
        title === savedTitle &&
        get().document.content === savedContent
          ? "saved"
          : "unsaved",
    });
  },

  setContent: (content) => {
    const { document, savedTitle, savedContent } = get();

    set({
      document: { ...document, content },
      documentDraft: {
        documentId: document.id,
        title: document.title,
        content,
      },
      saveStatus:
        document.title === savedTitle && content === savedContent
          ? "saved"
          : "unsaved",
    });
  },

  saveMockDocument: () => {
    const { document } = get();

    const savedDocument = {
      ...document,
      title: document.title.trim() || "Untitled document",
    };

    set({
      document: savedDocument,
      savedTitle: savedDocument.title,
      savedContent: savedDocument.content,
      documentDraft: {
        documentId: savedDocument.id,
        title: savedDocument.title,
        content: savedDocument.content,
      },
      editingDocumentId: null,
      saveStatus: "saved",
    });

    console.log("[ZUSTAND] Mock document saved:", savedDocument);
  },

  resetMockDocument: (documentId) => {
    const document = createMockDocument(documentId);

    set({
      document,
      savedTitle: document.title,
      savedContent: document.content,
      documentDraft: {
        documentId,
        title: document.title,
        content: document.content,
      },
      editingDocumentId: null,
      saveStatus: "saved",
    });

    console.log("[ZUSTAND] Mock document reset:", document);
  },
}));
