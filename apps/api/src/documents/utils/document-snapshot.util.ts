import { Prisma } from "@prisma/client";

type DocumentSnapshotInput = {
  title: string;
  content: unknown;
};

export function createDocumentSnapshot(arg0: {
  title: string;
  content: {
    text: {
      text: string;
      richText: Record<string, unknown>;
    };
  };
}): Prisma.InputJsonValue {
  return {
    title: arg0.title,
    content: arg0.content,
  } as unknown as Prisma.InputJsonValue;
}


export function parseDocumentSnapshot(snapshot: Uint8Array): {
  title: string;
  content: unknown;
} {
  return JSON.parse(Buffer.from(snapshot).toString('utf8'));
}
