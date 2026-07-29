"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
  Loader2,
  Upload,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { uploadViaPresignedUrl } from "@/lib/s3/upload-client";

interface TipTapEditorProps {
  initialContent?: string;
  onUpdate: (html: string) => void;
}

export function TipTapEditor({ initialContent = "", onUpdate }: TipTapEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-accent underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full" },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[160px] px-4 py-3 focus:outline-none [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-text-secondary [&_ul]:text-text-secondary [&_ol]:text-text-secondary [&_a]:text-accent",
      },
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImageByUrl = () => {
    setShowImageMenu(false);
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file");
      return;
    }

    setImageError(null);
    setUploadingImage(true);
    try {
      const { cdnUrl } = await uploadViaPresignedUrl(file, "images/misc");
      editor.chain().focus().setImage({ src: cdnUrl }).run();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded text-text-muted hover:text-accent hover:bg-white/10 transition-colors",
        isActive && "text-accent bg-accent/10"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/3">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading"
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive("link")}
          title="Add Link"
        >
          <LinkIcon size={14} />
        </ToolbarButton>
        <div className="relative">
          <ToolbarButton
            onClick={() => !uploadingImage && setShowImageMenu((v) => !v)}
            isActive={showImageMenu}
            title="Add Image"
          >
            {uploadingImage ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
          </ToolbarButton>
          {showImageMenu && !uploadingImage && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowImageMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-lg border border-white/10 bg-midnight shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setShowImageMenu(false);
                    imageInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-accent hover:bg-white/5 transition-colors"
                >
                  <Upload size={13} />
                  Upload image
                </button>
                <button
                  type="button"
                  onClick={addImageByUrl}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:text-accent hover:bg-white/5 transition-colors"
                >
                  <LinkIcon size={13} />
                  Paste URL
                </button>
              </div>
            </>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          className="hidden"
        />

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo size={14} />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {imageError && (
        <p className="px-4 py-2 text-xs text-red-400 border-t border-white/10">
          {imageError}
        </p>
      )}
    </div>
  );
}
