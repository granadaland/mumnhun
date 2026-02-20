"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3,
    Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter,
    AlignRight, Undo, Redo, Minus,
} from "lucide-react"

type RichTextEditorProps = {
    content: string
    onChange: (html: string) => void
    placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder = "Tulis konten di sini..." }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: "text-[#466A68] underline" },
            }),
            Image.configure({
                HTMLAttributes: { class: "rounded-lg max-w-full" },
            }),
            Placeholder.configure({ placeholder }),
            Underline,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: "prose prose-invert prose-sm max-w-none min-h-[300px] px-5 py-4 focus:outline-none text-[#0F0A09]/90 leading-relaxed",
            },
        },
    })

    if (!editor) return null

    const addLink = () => {
        const url = prompt("Masukan URL:")
        if (url) {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
        }
    }

    const addImage = () => {
        const url = prompt("Masukan URL gambar (Cloudinary):")
        if (url) {
            editor.chain().focus().setImage({ src: url }).run()
        }
    }

    const ToolbarButton = ({
        onClick,
        active,
        children,
        title,
    }: {
        onClick: () => void
        active?: boolean
        children: React.ReactNode
        title: string
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded transition-colors ${active
                ? "bg-[#466A68]/20 text-[#466A68]"
                : "text-[#8C7A6B]/40 hover:text-[#8C7A6B]/70 hover:bg-[#D4BCAA]/5"
                }`}
        >
            {children}
        </button>
    )

    return (
        <div className="bg-white border border-[#D4BCAA]/20 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[#D4BCAA]/20 bg-white/50">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                    <UnderlineIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
                    <Strikethrough className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-[#D4BCAA]/10 mx-1" />

                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
                    <Heading1 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
                    <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
                    <Heading3 className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-[#D4BCAA]/10 mx-1" />

                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
                    <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
                    <Code className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
                    <Minus className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-[#D4BCAA]/10 mx-1" />

                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
                    <AlignLeft className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
                    <AlignCenter className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
                    <AlignRight className="h-4 w-4" />
                </ToolbarButton>

                <div className="w-px h-5 bg-[#D4BCAA]/10 mx-1" />

                <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Add Link">
                    <LinkIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={addImage} title="Add Image">
                    <ImageIcon className="h-4 w-4" />
                </ToolbarButton>

                <div className="flex-1" />

                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
                    <Undo className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
                    <Redo className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    )
}
