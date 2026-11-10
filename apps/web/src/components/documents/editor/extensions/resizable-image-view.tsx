"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  GripVertical,
} from "lucide-react";
import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

type ImageAlignment = "left" | "center" | "right";

export function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);

  const alignment: ImageAlignment =
    node.attrs.alignment === "left" || node.attrs.alignment === "right"
      ? node.attrs.alignment
      : "center";

  const setAlignment = (value: ImageAlignment) => {
    updateAttributes({ alignment: value });
  };

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const image = imageRef.current;
    if (!image) return;

    const startX = event.clientX;
    const startWidth = image.getBoundingClientRect().width;
    const bounds = image.getBoundingClientRect();

    const aspectRatio =
      image.naturalWidth > 0 && image.naturalHeight > 0
        ? image.naturalWidth / image.naturalHeight
        : bounds.width / Math.max(bounds.height, 1);

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.max(
        50,
        Math.min(1200, startWidth + moveEvent.clientX - startX),
      );

      image.style.width = `${nextWidth}px`;
      image.style.height = "auto";
    };

    const handleUp = (upEvent: PointerEvent) => {
      const nextWidth = Math.max(
        50,
        Math.min(1200, startWidth + upEvent.clientX - startX),
      );

      updateAttributes({ width: Math.round(nextWidth) });
      setResizing(false);

      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };

    const handleCancel = () => {
      image.style.width =
        typeof node.attrs.width === "number"
          ? `${node.attrs.width}px`
          : "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      setResizing(false);
    };

    setResizing(true);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  };

  return (
    <NodeViewWrapper
      className="my-3 w-full"
      data-alignment={alignment}
      style={{ textAlign: alignment }}
    >
      {selected && (
        <div
          contentEditable={false}
          className="mb-2 inline-flex items-center gap-1 rounded-md border bg-background p-1 shadow-sm"
        >
          <button
            type="button"
            title="Align left"
            aria-label="Align image left"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setAlignment("left")}
            className={`rounded p-1.5 hover:bg-muted ${
              alignment === "left" ? "bg-muted" : ""
            }`}
          >
            <AlignLeft className="size-4" />
          </button>

          <button
            type="button"
            title="Align center"
            aria-label="Align image center"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setAlignment("center")}
            className={`rounded p-1.5 hover:bg-muted ${
              alignment === "center" ? "bg-muted" : ""
            }`}
          >
            <AlignCenter className="size-4" />
          </button>

          <button
            type="button"
            title="Align right"
            aria-label="Align image right"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setAlignment("right")}
            className={`rounded p-1.5 hover:bg-muted ${
              alignment === "right" ? "bg-muted" : ""
            }`}
          >
            <AlignRight className="size-4" />
          </button>
        </div>
      )}

      <div className="relative block w-full">
        <span
          className="relative inline-block max-w-full"
          contentEditable={false}
        >
          {selected && (
            <span
              data-drag-handle
              contentEditable={false}
              title="Drag image to another position"
              className="absolute -left-7 top-1/2 z-10 flex size-6 -translate-y-1/2 cursor-grab items-center justify-center rounded border bg-background text-muted-foreground active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </span>
          )}

          <img
            ref={imageRef}
            src={node.attrs.src}
            alt={node.attrs.alt ?? ""}
            draggable={false}
            className="block h-auto max-w-full"
            style={{
              width:
                typeof node.attrs.width === "number"
                  ? `${node.attrs.width}px`
                  : undefined,
            }}
          />

          {selected && (
            <button
              type="button"
              aria-label="Resize image"
              title="Drag to resize"
              onPointerDown={startResize}
              className={`absolute -bottom-2 -right-2 z-10 size-4 cursor-nwse-resize rounded-sm border-2 border-background bg-primary ${
                resizing ? "scale-110" : ""
              }`}
            />
          )}
        </span>
      </div>
    </NodeViewWrapper>
  );
}