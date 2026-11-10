import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import type { RemoteCursorUpdate } from "@/hooks/use-document-presence";

interface RemoteCursorStorage {
  cursors: RemoteCursorUpdate[];
}

declare module "@tiptap/core" {
  interface Storage {
    remoteCursor: RemoteCursorStorage;
  }

  interface Commands<ReturnType> {
    remoteCursor: {
      setRemoteCursors: (cursors: RemoteCursorUpdate[]) => ReturnType;
    };
  }
}

export const remoteCursorPluginKey = new PluginKey("remoteCursors");

export const RemoteCursor = Extension.create<
  Record<string, never>,
  RemoteCursorStorage
>({
  name: "remoteCursor",

  addOptions() {
    return {};
  },

  addStorage() {
    return {
      cursors: [],
    };
  },

  addCommands() {
    return {
      setRemoteCursors:
        (cursors: RemoteCursorUpdate[]) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.remoteCursor.cursors = cursors;

          if (dispatch) {
            dispatch(tr.setMeta(remoteCursorPluginKey, { cursors }));
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: remoteCursorPluginKey,

        state: {
          init: (_, state) => buildDecorations(state.doc, this.storage.cursors),

          apply: (transaction, decorations, _oldState, newState) => {
            const meta = transaction.getMeta(remoteCursorPluginKey);

            if (meta?.cursors) {
              this.storage.cursors = meta.cursors;

              return buildDecorations(newState.doc, meta.cursors);
            }

            if (!transaction.docChanged) {
              return decorations.map(transaction.mapping, newState.doc);
            }

            return buildDecorations(newState.doc, this.storage.cursors);
          },
        },

        props: {
          decorations(state) {
            return remoteCursorPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});

function buildDecorations(
  doc: import("@tiptap/pm/model").Node,
  cursors: RemoteCursorUpdate[],
): DecorationSet {
  const decorations: Decoration[] = [];

  for (const cursor of cursors) {
    const position = Math.max(0, Math.min(cursor.position, doc.content.size));

    const selectionEnd = Math.max(
      0,
      Math.min(cursor.selectionEnd, doc.content.size),
    );

    const color = getCursorColor(cursor.userId);

    // Show a colored caret and collaborator label.
    decorations.push(
  Decoration.widget(
    position,
    () => {
      const wrapper = document.createElement("span");

      wrapper.className = "remote-cursor";
      wrapper.style.setProperty("--remote-cursor-color", color);
      wrapper.contentEditable = "false";
      wrapper.setAttribute("data-user-id", cursor.userId);

      const caret = document.createElement("span");
      caret.className = "remote-cursor__caret";

      const label = document.createElement("span");
      label.className = "remote-cursor__label";
      label.textContent = cursor.name ?? "Collaborator";

      wrapper.append(caret, label);

      return wrapper;
    },
    {
      key: `cursor-${cursor.userId}-${position}`,
      side: 1,
      ignoreSelection: true,
      stopEvent: () => true,
    },
  ),
);
    // Highlight the collaborator's selected text.
    if (position !== selectionEnd) {
      const from = Math.min(position, selectionEnd);
      const to = Math.max(position, selectionEnd);

      decorations.push(
        Decoration.inline(
          from,
          to,
          {
            style: `background-color: ${color}35`,
            class: "remote-cursor__selection",
          },
          {
            inclusiveStart: false,
            inclusiveEnd: false,
          },
        ),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

function getCursorColor(userId: string): string {
  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }

  const colors = [
    "#F87171",
    "#60A5FA",
    "#34D399",
    "#FBBF24",
    "#A78BFA",
    "#FB7185",
    "#22D3EE",
  ];

  return colors[Math.abs(hash) % colors.length];
}
