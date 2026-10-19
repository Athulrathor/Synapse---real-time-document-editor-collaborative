type DocumentSnapshotInput = {
  title: string;
  content: unknown;
};

export function createDocumentSnapshot(
  document: DocumentSnapshotInput,
): Buffer {
  const snapshot = {
    title: document.title,
    content: document.content,
  };

  return Buffer.from(JSON.stringify(snapshot), 'utf8');
}

export function parseDocumentSnapshot(snapshot: Uint8Array): {
  title: string;
  content: unknown;
} {
  return JSON.parse(Buffer.from(snapshot).toString('utf8'));
}
