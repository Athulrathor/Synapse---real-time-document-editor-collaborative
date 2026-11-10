"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Pilcrow,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Redo2,
  Undo2,
  ListTodo,
  Quote,
  Minus,
  MoreHorizontal,
  Plus,
  Unlink,
  Link2,
  ImagePlus,
  TableIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useEditorState } from "@tiptap/react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenu,
} from "../../ui/dropdown-menu";
import { Separator } from "../../ui/separator";

interface DocumentToolbarProps {
  editor: Editor | null;
}

export function DocumentToolbar({ editor }: DocumentToolbarProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canUndo: editor?.can().undo() ?? false,
      canRedo: editor?.can().redo() ?? false,
    }),
  });

  const [fontSize, setFontSize] = useState<string>("12");

  if (!editor) return null;

  const applyFontSize = (value: string) => {
    const size = Number(value);

    if (!Number.isFinite(size) || size < 8 || size > 96) {
      return;
    }

    editor?.chain().focus().setFontSize(`${size}pt`).run();
    setFontSize(String(size));
  };

  const changeFontSize = (amount: number) => {
    const currentSize = Number(fontSize) || 12;
    const nextSize = Math.min(96, Math.max(8, currentSize + amount));

    applyFontSize(String(nextSize));
  };

  return (
    <div className="flex w-full min-w-0 items-center gap-1 border-b border-border bg-background p-2 text-foreground">
      {/* Undo, Redo */}

      {/* <Separator orientation="vertical" className="mx-1 h-6" /> */}

      <div className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-border px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label="Decrease font size"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => changeFontSize(-1)}
        >
          <Minus className="size-3.5" />
        </Button>

        <Input
          aria-label="Font size in points"
          type="number"
          min={8}
          max={96}
          value={fontSize}
          className="h-7 w-10 border-0 bg-transparent px-0 text-center text-xs shadow-none focus-visible:ring-1"
          onChange={(event) => setFontSize(event.target.value)}
          onBlur={() => applyFontSize(fontSize)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyFontSize(fontSize);
              event.currentTarget.blur();
            }
          }}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label="Increase font size"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => changeFontSize(1)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Select
        defaultValue="Arial"
        onValueChange={(fontFamily) => {
          editor.chain().focus().setFontFamily(fontFamily).run();
        }}
      >
        <SelectTrigger
          className="h-8 w-[110px] border-border bg-background text-xs"
          aria-label="Font family"
        >
          <SelectValue placeholder="Font" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Georgia">Georgia</SelectItem>
          <SelectItem value="Verdana">Verdana</SelectItem>
          <SelectItem value="Tahoma">Tahoma</SelectItem>
          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
          <SelectItem value="Courier New">Courier New</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Popover open={imageOpen} onOpenChange={setImageOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Insert image"
            title="Insert image"
          >
            <ImagePlus className="size-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();

              const url = imageUrl.trim();

              if (!url) return;

              try {
                const parsedUrl = new URL(url);

                if (
                  parsedUrl.protocol !== "https:" &&
                  parsedUrl.protocol !== "http:"
                ) {
                  return;
                }

                editor
                  .chain()
                  .focus()
                  .setImage({
                    src: parsedUrl.toString(),
                    alt: "Document image",
                  })
                  .run();

                setImageUrl("");
                setImageOpen(false);
              } catch {
                // Keep the popover open when the URL is invalid.
              }
            }}
          >
            <div className="space-y-1">
              <label
                htmlFor="document-image-url"
                className="text-sm font-medium"
              >
                Image URL
              </label>

              <Input
                id="document-image-url"
                type="url"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                required
              />
            </div>

            <Button type="submit" size="sm" className="w-full">
              Insert image
            </Button>
          </form>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Popover
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);

          if (open && editor) {
            setLinkUrl(editor.getAttributes("link").href ?? "");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="icon"
            className="size-8 shrink-0"
            aria-label="Insert or edit link"
            title="Insert or edit link"
          >
            <Link2 className="size-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();

              const url = linkUrl.trim();

              if (!url) return;

              const safeUrl = /^https?:\/\//i.test(url)
                ? url
                : `https://${url}`;

              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: safeUrl })
                .run();

              setLinkOpen(false);
            }}
          >
            <div className="space-y-1">
              <label
                htmlFor="document-link-url"
                className="text-sm font-medium"
              >
                Link URL
              </label>

              <Input
                id="document-link-url"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              {editor.isActive("link") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setLinkOpen(false);
                  }}
                >
                  <Unlink className="mr-2 size-4" />
                  Remove link
                </Button>
              )}

              <Button type="submit" size="sm" className="ml-auto">
                Apply link
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Insert table"
            aria-label="Insert table"
            disabled={!editor || !editor.isEditable}
          >
            <TableIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => {
              editor
                ?.chain()
                .focus()
                .insertTable({
                  rows: 3,
                  cols: 3,
                  withHeaderRow: true,
                })
                .run();
            }}
          >
            Insert 3 × 3 table
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              editor
                ?.chain()
                .focus()
                .insertTable({
                  rows: 4,
                  cols: 4,
                  withHeaderRow: true,
                })
                .run();
            }}
          >
            Insert 4 × 4 table
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              editor
                ?.chain()
                .focus()
                .insertTable({
                  rows: 5,
                  cols: 5,
                  withHeaderRow: true,
                })
                .run();
            }}
          >
            Insert 5 × 5 table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bold, Italic, Underline */}

      <div className="ml-auto shrink-0">
        {/* More dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="More formatting options"
              title="More formatting options"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 max-h-[min(70vh,400px)] overflow-y-auto"
          >
            <DropdownMenuLabel>Text styles</DropdownMenuLabel>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setParagraph().run()}
            >
              <Pilcrow className="mr-2 size-4" />
              Paragraph
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              <Heading1 className="mr-2 size-4" />
              Heading 1
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 className="mr-2 size-4" />
              Heading 2
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Lists</DropdownMenuLabel>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="mr-2 size-4" />
              Bulleted list
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="mr-2 size-4" />
              Numbered list
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleTaskList().run()}
            >
              <ListTodo className="mr-2 size-4" />
              Checklist
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Alignment</DropdownMenuLabel>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="mr-2 size-4" />
              Align left
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
            >
              <AlignCenter className="mr-2 size-4" />
              Align center
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().setTextAlign("right").run()
              }
            >
              <AlignRight className="mr-2 size-4" />
              Align right
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
            >
              <AlignJustify className="mr-2 size-4" />
              Justify
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Other formatting</DropdownMenuLabel>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="mr-2 size-4" />
              Strikethrough
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="mr-2 size-4" />
              Highlight
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="mr-2 size-4" />
              Blockquote
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="mr-2 size-4" />
              Horizontal divider
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

//   <Button
//     type="button"
//     size="icon"
//     variant="ghost"
//     aria-label="Undo"
//     disabled={!editorState?.canUndo}
//     onMouseDown={(event) => event.preventDefault()}
//     onClick={() => editor.chain().focus().undo().run()}
//   >
//     <Undo2 className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant="ghost"
//     aria-label="Redo"
//     disabled={!editorState?.canRedo}
//     onMouseDown={(event) => event.preventDefault()}
//     onClick={() => editor.chain().focus().redo().run()}
//   >
//     <Redo2 className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />
//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("bold") ? "secondary" : "ghost"}
//     aria-label="Bold"
//     title="Bold"
//     onClick={() => editor.chain().focus().toggleBold().run()}
//   >
//     {" "}
//     <Bold className="size-4" />{" "}
//   </Button>
//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("italic") ? "secondary" : "ghost"}
//     aria-label="Italic"
//     title="Italic"
//     onClick={() => editor.chain().focus().toggleItalic().run()}
//   >
//     <Italic className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

//   <Button
//     type="button"
//     size="icon"
//     variant={
//       editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"
//     }
//     aria-label="Heading 1"
//     title="Heading 1"
//     onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
//   >
//     <Heading1 className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={
//       editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
//     }
//     aria-label="Heading 2"
//     title="Heading 2"
//     onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
//   >
//     <Heading2 className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("paragraph") ? "secondary" : "ghost"}
//     aria-label="Paragraph"
//     title="Paragraph"
//     onClick={() => editor.chain().focus().setParagraph().run()}
//   >
//     <Pilcrow className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
//     aria-label="Bullet list"
//     title="Bullet list"
//     onClick={() => editor.chain().focus().toggleBulletList().run()}
//   >
//     <List className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
//     aria-label="Numbered list"
//     title="Numbered list"
//     onClick={() => editor.chain().focus().toggleOrderedList().run()}
//   >
//     <ListOrdered className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("underline") ? "secondary" : "ghost"}
//     aria-label="Underline"
//     title="Underline"
//     onClick={() => editor.chain().focus().toggleUnderline().run()}
//   >
//     <UnderlineIcon className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("strike") ? "secondary" : "ghost"}
//     aria-label="Strikethrough"
//     title="Strikethrough"
//     onClick={() => editor.chain().focus().toggleStrike().run()}
//   >
//     <Strikethrough className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("highlight") ? "secondary" : "ghost"}
//     aria-label="Highlight"
//     title="Highlight"
//     onMouseDown={(event) => event.preventDefault()}
//     onClick={() => {
//       const isDark = document.documentElement.classList.contains("dark");

//       editor
//         .chain()
//         .focus()
//         .toggleHighlight({
//           color: isDark ? "#ffff00" : "#ffff00",
//         })
//         .run();
//     }}
//   >
//     <Highlighter className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

//   <Button
//     type="button"
//     size="icon"
//     variant={
//       editor.getAttributes("paragraph").textAlign === "left" ||
//       editor.getAttributes("heading").textAlign === "left"
//         ? "secondary"
//         : "ghost"
//     }
//     onMouseDown={(event) => event.preventDefault()}
//     aria-label="Align left"
//     title="Align left"
//     onClick={() => editor.chain().focus().setTextAlign("left").run()}
//   >
//     <AlignLeft className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={
//       editor.getAttributes("paragraph").textAlign === "center" ||
//       editor.getAttributes("heading").textAlign === "center"
//         ? "secondary"
//         : "ghost"
//     }
//     aria-label="Align center"
//     title="Align center"
//     onMouseDown={(event) => event.preventDefault()}
//     onClick={() => {
//       editor.chain().focus().setTextAlign("center").run();
//     }}
//   >
//     <AlignCenter className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={
//       editor.getAttributes("paragraph").textAlign === "right" ||
//       editor.getAttributes("heading").textAlign === "right"
//         ? "secondary"
//         : "ghost"
//     }
//     onMouseDown={(event) => event.preventDefault()}
//     aria-label="Align right"
//     title="Align right"
//     onClick={() => editor.chain().focus().setTextAlign("right").run()}
//   >
//     <AlignRight className="size-4" />
//   </Button>

//   <Button
//     type="button"
//     size="icon"
//     variant={
//       editor.getAttributes("paragraph").textAlign === "justify" ||
//       editor.getAttributes("heading").textAlign === "justify"
//         ? "secondary"
//         : "ghost"
//     }
//     onMouseDown={(event) => event.preventDefault()}
//     aria-label="Justify text"
//     title="Justify text"
//     onClick={() => editor.chain().focus().setTextAlign("justify").run()}
//   >
//     <AlignJustify className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("taskList") ? "secondary" : "ghost"}
//     aria-label="Checklist"
//     title="Checklist"
//     onMouseDown={(event) => event.preventDefault()}
//     onClick={() => editor.chain().focus().toggleTaskList().run()}
//   >
//     <ListTodo className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

//   <Button
//     type="button"
//     size="icon"
//     variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
//     aria-label="Blockquote"
//     title="Blockquote"
//     onMouseDown={(event) => event.preventDefault()}
//     // onClick={() => {
//     //   console.log("Quote button clicked");
//     //   console.log("Can toggle:", editor.can().toggleBlockquote());

//     //   editor.chain().focus().toggleBlockquote().run();
//     // }}
//     onClick={() => {
//       const { from, to } = editor.state.selection;

//       console.log("Before:", editor.getJSON());

//       editor.chain().focus().toggleBlockquote().run();

//       console.log("After:", editor.getJSON());
//       console.log("Is blockquote active:", editor.isActive("blockquote"));
//     }}
//   >
//     <Quote className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

//   <Button
//     type="button"
//     size="icon"
//     variant="ghost"
//     aria-label="Insert horizontal divider"
//     title="Horizontal divider"
//     onMouseDown={(event) => event.preventDefault()}
//     onClick={() => editor.chain().focus().setHorizontalRule().run()}
//   >
//     <Minus className="size-4" />
//   </Button>

//   <Separator orientation="vertical" className="mx-1 h-6" />

// </div>
