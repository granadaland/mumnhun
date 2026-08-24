"use client"

import { useEffect, useState } from "react"
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import { TableKit } from "@tiptap/extension-table"
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Quote, Code, Link as LinkIcon,
    Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
    Undo, Redo, Minus, RemoveFormatting, Code2, Eye, Wand2,
    Table as TableIcon, Columns3, Rows3, Trash2, Heading,
} from "lucide-react"
import { ImageSourcePicker, type PickedImage } from "@/components/admin/image-source-picker"
import "./wysiwyg-content.css"

function escapeAttribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function escapeText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function ToolbarButton({
    onClick,
    active,
    disabled,
    children,
    title,
}: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            aria-pressed={active}
            className={`p-1.5 rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${active
                ? "bg-[#466A68]/20 text-[#466A68]"
                : "text-[#8C7A6B]/70 hover:text-[#0F0A09] hover:bg-[#D4BCAA]/15"
                }`}
        >
            {children}
        </button>
    )
}

function ToolbarDivider() {
    return <div className="w-px h-5 bg-[#D4BCAA]/40 mx-1" />
}

const BLOCK_FORMATS = [
    { value: "paragraph", label: "Paragraf" },
    { value: "h2", label: "Heading 2" },
    { value: "h3", label: "Heading 3" },
    { value: "h4", label: "Heading 4" },
    { value: "blockquote", label: "Kutipan" },
    { value: "codeBlock", label: "Blok Kode" },
] as const

type BlockFormat = (typeof BLOCK_FORMATS)[number]["value"]

function readActiveBlockFormat(editor: Editor): BlockFormat {
    if (editor.isActive("heading", { level: 2 })) return "h2"
    if (editor.isActive("heading", { level: 3 })) return "h3"
    if (editor.isActive("heading", { level: 4 })) return "h4"
    if (editor.isActive("codeBlock")) return "codeBlock"
    if (editor.isActive("blockquote")) return "blockquote"
    return "paragraph"
}

function applyBlockFormat(editor: Editor, format: BlockFormat): void {
    const chain = editor.chain().focus()

    // Leave an existing wrapper before switching, otherwise the new block type nests
    // inside the old one instead of replacing it.
    if (editor.isActive("blockquote") && format !== "blockquote") chain.lift("blockquote")
    if (editor.isActive("codeBlock") && format !== "codeBlock") chain.setParagraph()

    switch (format) {
        case "paragraph":
            chain.setParagraph().run()
            return
        case "h2":
            chain.setHeading({ level: 2 }).run()
            return
        case "h3":
            chain.setHeading({ level: 3 }).run()
            return
        case "h4":
            chain.setHeading({ level: 4 }).run()
            return
        case "blockquote":
            chain.setParagraph().toggleBlockquote().run()
            return
        case "codeBlock":
            chain.toggleCodeBlock().run()
            return
    }
}

type RichTextEditorProps = {
    content: string
    onChange: (html: string) => void
    placeholder?: string
    /** Article context passed to the image picker so AI prompts stay on-topic. */
    articleTitle?: string
    articleKeyword?: string
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = "Tulis konten di sini...",
    articleTitle,
    articleKeyword,
}: RichTextEditorProps) {
    const [showImagePicker, setShowImagePicker] = useState(false)
    const [mode, setMode] = useState<"visual" | "html">("visual")
    // null while the visual editor owns the content; a string only while the HTML tab is
    // open. Derived this way so no effect has to mirror `content` into local state.
    const [htmlDraft, setHtmlDraft] = useState<string | null>(null)
    const [activeSubheading, setActiveSubheading] = useState<string | null>(null)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            // Link and Underline ship inside StarterKit v3. Registering them again as
            // standalone extensions duplicates the schema entry, which makes TipTap drop
            // the duplicate and silently break the related commands.
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                link: {
                    openOnClick: false,
                    autolink: true,
                    HTMLAttributes: { rel: "noopener noreferrer", class: "text-[#466A68] underline" },
                },
            }),
            Image.configure({
                HTMLAttributes: { class: "rounded-lg max-w-full" },
            }),
            Placeholder.configure({ placeholder }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            // Tables: AI-generated articles use them for comparisons and price lists, and
            // TableKit bundles table/row/cell/header so the schema accepts pasted <table>
            // markup instead of flattening it into paragraphs.
            TableKit.configure({
                table: { resizable: true, allowTableNodeSelection: true },
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                // Block-level styling lives in globals.css (.wysiwyg-content). Tailwind's
                // preflight strips heading sizes and list markers, and @tailwindcss/typography
                // is not installed, so `prose` classes have no effect here.
                class: "wysiwyg-content min-h-[420px] px-5 py-4 focus:outline-none",
            },
        },
    })

    /**
     * Toolbar state.
     *
     * TipTap v3 does not re-render the React component on every transaction
     * (`shouldRerenderOnTransaction` defaults to false), so reading `editor.isActive(...)`
     * during render produces stale values and the toolbar never lights up. useEditorState
     * subscribes to the transactions and re-renders only when this slice changes.
     */
    const toolbar = useEditorState({
        editor,
        selector: ({ editor: instance }) => {
            if (!instance) return null

            return {
                blockFormat: readActiveBlockFormat(instance),
                bold: instance.isActive("bold"),
                italic: instance.isActive("italic"),
                underline: instance.isActive("underline"),
                strike: instance.isActive("strike"),
                code: instance.isActive("code"),
                bulletList: instance.isActive("bulletList"),
                orderedList: instance.isActive("orderedList"),
                blockquote: instance.isActive("blockquote"),
                link: instance.isActive("link"),
                alignLeft: instance.isActive({ textAlign: "left" }),
                alignCenter: instance.isActive({ textAlign: "center" }),
                alignRight: instance.isActive({ textAlign: "right" }),
                canUndo: instance.can().undo(),
                canRedo: instance.can().redo(),
                inTable: instance.isActive("table"),
                wordCount: (() => {
                    const text = instance.getText().trim()
                    return text ? text.split(/\s+/).length : 0
                })(),
            }
        },
    })

    // Adopt content replaced from outside the editor (AI assistant applying an outline or a
    // full article, or the post loading on the edit route). Without this the editor keeps
    // showing its initial value and the applied text is discarded on the next keystroke.
    useEffect(() => {
        if (!editor) return
        if (content === editor.getHTML()) return

        editor.commands.setContent(content || "", { emitUpdate: false })
    }, [content, editor])

    if (!editor || !toolbar) return null

    const addLink = () => {
        const previous = editor.getAttributes("link").href as string | undefined
        const url = window.prompt("Masukkan URL:", previous || "https://")

        if (url === null) return

        const trimmed = url.trim()
        if (!trimmed) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
            return
        }

        // Reject non-http(s) schemes so a javascript: URL can never be stored.
        if (!/^https?:\/\//i.test(trimmed)) {
            window.alert("URL harus dimulai dengan http:// atau https://")
            return
        }

        editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run()
    }

    /** Inserts the picked image as a figure so the caption is part of the article HTML. */
    const insertPickedImage = (image: PickedImage) => {
        const altAttribute = image.alt ? ` alt="${escapeAttribute(image.alt)}"` : ' alt=""'
        const figure = image.caption
            ? `<figure><img src="${escapeAttribute(image.url)}"${altAttribute} loading="lazy" /><figcaption>${escapeText(image.caption)}</figcaption></figure>`
            : `<img src="${escapeAttribute(image.url)}"${altAttribute} loading="lazy" />`

        editor.chain().focus().insertContent(figure).run()
    }

    const switchToVisual = () => {
        if (mode === "visual") return

        // Hand the edited HTML back to TipTap, which normalizes it against the schema.
        editor.commands.setContent(htmlDraft ?? "", { emitUpdate: false })
        onChange(editor.getHTML())
        setHtmlDraft(null)
        setMode("visual")
    }

    const switchToHtml = () => {
        if (mode === "html") return

        setHtmlDraft(editor.getHTML())
        setMode("html")
    }

    const handleContextAwareAiImage = () => {
        let lastHeading = ""
        const endPos = editor.state.selection.$from.pos
        editor.state.doc.nodesBetween(0, endPos, (node) => {
            if (node.type.name === "heading") {
                lastHeading = node.textContent
            }
        })
        
        setActiveSubheading(lastHeading || null)
        setShowImagePicker(true)
    }

    const imageContextText = activeSubheading 
        ? `Bagian yang sedang dibahas (Subheading): "${activeSubheading}". Konteks keseluruhan artikel: ${editor.getText().slice(0, 2000)}`
        : editor.getText().slice(0, 3000)

    const insertTable = () => {
        editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
    }

    return (
        // No `overflow-hidden` here: it would turn this wrapper into a scroll container and
        // `position: sticky` on the toolbar would never activate. Corners are rounded on the
        // first/last children instead.
        <div className="bg-white border border-[#D4BCAA]/30 rounded-xl shadow-sm">
            {/*
              * Sticky chrome: tabs + toolbar stay reachable while the article grows past the
              * viewport. `top-16` clears the 4rem admin top bar (see app/admin/layout.tsx).
              */}
            <div className="sticky top-16 z-20 rounded-t-xl border-b border-[#D4BCAA]/30 bg-[#FAF9F7]">
                {/* Visual / HTML tabs, mirroring the classic editor */}
                <div className="flex items-center gap-1 px-3 pt-2">
                    <button
                        type="button"
                        onClick={switchToVisual}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md border border-b-0 transition-colors ${mode === "visual"
                            ? "bg-white border-[#D4BCAA]/40 text-[#0F0A09]"
                            : "bg-transparent border-transparent text-[#8C7A6B] hover:text-[#0F0A09]"
                            }`}
                    >
                        <Eye className="h-3.5 w-3.5" />
                        Visual
                    </button>
                    <button
                        type="button"
                        onClick={switchToHtml}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md border border-b-0 transition-colors ${mode === "html"
                            ? "bg-white border-[#D4BCAA]/40 text-[#0F0A09]"
                            : "bg-transparent border-transparent text-[#8C7A6B] hover:text-[#0F0A09]"
                            }`}
                    >
                        <Code2 className="h-3.5 w-3.5" />
                        HTML
                    </button>
                </div>

                {mode === "visual" && (
                    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-t border-[#D4BCAA]/30">
                        <select
                            value={toolbar.blockFormat}
                            onChange={(event) => applyBlockFormat(editor, event.target.value as BlockFormat)}
                            title="Format paragraf"
                            aria-label="Format paragraf"
                            className="h-8 mr-1 px-2 bg-white border border-[#D4BCAA]/40 rounded text-xs text-[#0F0A09] outline-none focus:ring-2 focus:ring-[#466A68]/30"
                        >
                            {BLOCK_FORMATS.map((format) => (
                                <option key={format.value} value={format.value}>
                                    {format.label}
                                </option>
                            ))}
                        </select>

                        <ToolbarDivider />

                        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={toolbar.bold} title="Bold (Ctrl+B)">
                            <Bold className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={toolbar.italic} title="Italic (Ctrl+I)">
                            <Italic className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={toolbar.underline} title="Underline (Ctrl+U)">
                            <UnderlineIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={toolbar.strike} title="Strikethrough">
                            <Strikethrough className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={toolbar.code} title="Kode Inline">
                            <Code className="h-4 w-4" />
                        </ToolbarButton>

                        <ToolbarDivider />

                        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={toolbar.bulletList} title="Daftar Bullet">
                            <List className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={toolbar.orderedList} title="Daftar Bernomor">
                            <ListOrdered className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={toolbar.blockquote} title="Kutipan">
                            <Quote className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Garis Horizontal">
                            <Minus className="h-4 w-4" />
                        </ToolbarButton>

                        <ToolbarDivider />

                        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={toolbar.alignLeft} title="Rata Kiri">
                            <AlignLeft className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={toolbar.alignCenter} title="Rata Tengah">
                            <AlignCenter className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={toolbar.alignRight} title="Rata Kanan">
                            <AlignRight className="h-4 w-4" />
                        </ToolbarButton>

                        <ToolbarDivider />

                        <ToolbarButton onClick={addLink} active={toolbar.link} title="Tambah / Edit Link">
                            <LinkIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => { setActiveSubheading(null); setShowImagePicker(true); }} title="Tambah Gambar">
                            <ImageIcon className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={handleContextAwareAiImage} title="Generate AI Image (Sesuai Konteks Subheading)">
                            <Wand2 className="h-4 w-4 text-[#466A68]" />
                        </ToolbarButton>

                        <ToolbarDivider />

                        {/* Tables. Row/column controls only appear inside a table so the
                          * toolbar does not fill up with permanently disabled buttons. */}
                        <ToolbarButton onClick={insertTable} active={toolbar.inTable} title="Sisipkan Tabel 3x3">
                            <TableIcon className="h-4 w-4" />
                        </ToolbarButton>
                        {toolbar.inTable && (
                            <>
                                <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Tambah Kolom">
                                    <Columns3 className="h-4 w-4" />
                                </ToolbarButton>
                                <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Tambah Baris">
                                    <Rows3 className="h-4 w-4" />
                                </ToolbarButton>
                                <ToolbarButton onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Toggle Baris Header">
                                    <Heading className="h-4 w-4" />
                                </ToolbarButton>
                                <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Hapus Kolom">
                                    <Columns3 className="h-4 w-4 text-red-500" />
                                </ToolbarButton>
                                <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Hapus Baris">
                                    <Rows3 className="h-4 w-4 text-red-500" />
                                </ToolbarButton>
                                <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Hapus Tabel">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </ToolbarButton>
                            </>
                        )}

                        <ToolbarDivider />

                        <ToolbarButton
                            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                            title="Hapus Format"
                        >
                            <RemoveFormatting className="h-4 w-4" />
                        </ToolbarButton>

                        <div className="flex-1" />

                        <ToolbarButton
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!toolbar.canUndo}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!toolbar.canRedo}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo className="h-4 w-4" />
                        </ToolbarButton>
                    </div>
                )}
            </div>

            {mode === "visual" ? (
                <>
                    <EditorContent editor={editor} />

                    <div className="flex items-center justify-between px-4 py-2 rounded-b-xl border-t border-[#D4BCAA]/30 bg-[#FAF9F7] text-[11px] text-[#8C7A6B]/70">
                        <span>{toolbar.wordCount} kata</span>
                        <span>Ctrl+B tebal · Ctrl+I miring · Ctrl+U garis bawah</span>
                    </div>
                </>
            ) : (
                <div className="p-3">
                    <textarea
                        value={htmlDraft ?? ""}
                        onChange={(event) => setHtmlDraft(event.target.value)}
                        spellCheck={false}
                        aria-label="Sumber HTML artikel"
                        className="w-full min-h-[420px] font-mono text-xs leading-relaxed text-[#0F0A09] bg-white border border-[#D4BCAA]/30 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#466A68]/30 resize-y"
                    />
                    <p className="mt-2 text-[11px] text-[#8C7A6B]/70">
                        Kembali ke tab <strong>Visual</strong> untuk menerapkan perubahan HTML. Tag yang tidak
                        didukung editor akan dirapikan otomatis.
                    </p>
                </div>
            )}

            <ImageSourcePicker
                isOpen={showImagePicker}
                onClose={() => {
                    setShowImagePicker(false)
                    setActiveSubheading(null)
                }}
                onSelect={insertPickedImage}
                articleTitle={articleTitle}
                articleKeyword={articleKeyword}
                articleContext={imageContextText}
                purpose="inline"
                title="Tambah Gambar ke Artikel"
            />
        </div>
    )
}
