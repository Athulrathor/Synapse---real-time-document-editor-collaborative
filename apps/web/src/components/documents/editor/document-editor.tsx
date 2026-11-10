"use client";

import { useEffect } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import FontFamily from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Collaboration from "@tiptap/extension-collaboration";

import type * as Y from "yjs";

import { ResizableImage } from "@/components/documents/editor/extensions/resize-image";
import { RemoteCursor } from "@/components/documents/editor/extensions/remote-cursor";
import type { RemoteCursorUpdate } from "@/hooks/use-document-presence";

interface DocumentEditorProps {
  content:
    | {
        text: string;
        richText: JSONContent;
      }
    | Record<string, unknown>
    | null;
  onChange: (content: { text: string; richText: JSONContent }) => void;
  onEditorReady?: (editor: Editor | null) => void;
  ydoc: Y.Doc;
  collaborative?: boolean;
  remoteCursors?: RemoteCursorUpdate[];
}

function parseEditorContent(
  content: Record<string, unknown> | null,
): JSONContent {
  if (!content) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const nestedContent =
    content.text &&
    typeof content.text === "object" &&
    !Array.isArray(content.text)
      ? (content.text as Record<string, unknown>)
      : null;

  const richText = content.richText ?? nestedContent?.richText;

  if (richText && typeof richText === "object") {
    return richText as JSONContent;
  }

  const text =
    typeof content.text === "string"
      ? content.text
      : typeof nestedContent?.text === "string"
        ? nestedContent.text
        : "";

  if (text.length > 0) {
    return {
      type: "doc",
      content: text.split("\n").map((line) => ({
        type: "paragraph",
        ...(line
          ? {
              content: [
                {
                  type: "text",
                  text: line,
                },
              ],
            }
          : {}),
      })),
    };
  }

  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,

            parseHTML: (element) => {
              return element.style.fontSize || null;
            },

            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),

      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

export function DocumentEditor({
  content,
  onChange,
  onEditorReady,
  ydoc,
  collaborative = false,
  remoteCursors = [],
}: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: collaborative ? false : undefined,
        blockquote: {
          HTMLAttributes: {
            class: "document-blockquote",
          },
        },
        link: false,
        underline: false,
      }),

      ...(collaborative
        ? [
            Collaboration.configure({
              document: ydoc,
              field: "default",
            }),
          ]
        : []),

      RemoteCursor,

      Link.configure({
        openOnClick: false,
        autolink: true,
      }),

      ResizableImage.configure({
        inline: false,
        allowBase64: false,
      }),

      Underline,
      TextStyle,
      FontFamily,
      Color,

      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "document-highlight",
        },
      }),

      FontSize,

      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),

      TaskList,

      TaskItem.configure({
        nested: true,
      }),

      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "document-table",
        },
      }),

      TableRow,
      TableHeader,
      TableCell,
    ],

    content: collaborative ? undefined : parseEditorContent(content),

    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      if (collaborative) return;

      onChange({
        text: editor.getText(),
        richText: editor.getJSON(),
      });
    },

    editorProps: {
      attributes: {
        class:
          "min-h-[245mm] w-full outline-none text-[12pt] leading-7 text-foreground",
        "aria-label": "Document editor",
      },
    },
  });

  // test purpose
  // useEffect(() => {
  //   if (!collaborative) return;

  //   const fragment = ydoc.getXmlFragment("default");

  //   console.log("[Yjs Debug] Document state:", {
  //     documentId: ydoc.guid,
  //     fragmentLength: fragment.length,
  //     fragmentContent: fragment.toJSON(),
  //   });
  // }, [ydoc, collaborative, editor]);

  // Expose the editor instance to the parent.
  useEffect(() => {
    onEditorReady?.(editor);

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  // Sync content loaded asynchronously from the API.
  useEffect(() => {
    if (collaborative || !editor || editor.isDestroyed) {
      return;
    }

    const incomingContent = parseEditorContent(content);
    const currentContent = editor.getJSON();

    if (JSON.stringify(currentContent) !== JSON.stringify(incomingContent)) {
      editor.commands.setContent(incomingContent, {
        emitUpdate: false,
      });
    }
  }, [editor, content, collaborative]);

  // Update remote cursor decorations when presence changes.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !collaborative) {
      return;
    }

    // const commands = editor.commands as unknown as {
    //   setRemoteCursors: (cursors: RemoteCursorUpdate[]) => void;
    // };
    editor.commands.setRemoteCursors(remoteCursors);
  }, [editor, collaborative, remoteCursors]);

  return <EditorContent editor={editor} />;
}
