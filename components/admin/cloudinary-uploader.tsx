"use client"

import { useState, useRef } from "react"
import { UploadCloud, Image as ImageIcon, X, Loader2, Link as LinkIcon } from "lucide-react"
import { ADMIN_CSRF_HEADER, getAdminCsrfToken } from "@/lib/security/csrf-client"

interface CloudinaryUploaderProps {
    value?: string | null
    onChange: (url: string) => void
    folder?: string
    label?: string
    description?: string
}

export function CloudinaryUploader({
    value,
    onChange,
    folder = "mumnhun/posts",
    label = "Upload Image",
    description = "PNG, JPG, WebP up to 5MB"
}: CloudinaryUploaderProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [urlInput, setUrlInput] = useState("")
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError("Hanya file gambar yang diperbolehkan")
            return
        }

        setIsUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("folder", folder)

            const csrfToken = await getAdminCsrfToken()

            const res = await fetch("/api/admin/upload", {
                method: "POST",
                headers: {
                    [ADMIN_CSRF_HEADER]: csrfToken,
                },
                body: formData,
            })

            const data = await res.json()

            if (data.success) {
                onChange(data.data.url)
                setShowUrlInput(false)
            } else {
                setError(data.error || "Gagal mengunggah gambar")
            }
        } catch (err: any) {
            setError("Terjadi kesalahan jaringan.")
        } finally {
            setIsUploading(false)
        }
    }

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0])
        }
    }

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0])
        }
    }

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const onDragLeave = () => {
        setIsDragging(false)
    }

    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-[#0F0A09] mb-1">{label}</label>}
            {description && <p className="text-xs text-[#8C7A6B] mb-3">{description}</p>}

            {value ? (
                <div className="relative group rounded-xl overflow-hidden border border-[#D4BCAA]/30 bg-[#FAF9F7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt="Preview"
                        className="w-full h-auto max-h-[240px] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Hapus Gambar
                        </button>
                    </div>
                </div>
            ) : showUrlInput ? (
                <div className="flex gap-2">
                    <input
                        type="url"
                        placeholder="https://..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 bg-white border border-[#D4BCAA]/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#466A68]/20 focus:border-[#466A68] outline-none transition-all placeholder:text-[#8C7A6B]/40"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (urlInput) onChange(urlInput)
                            setShowUrlInput(false)
                        }}
                        className="px-4 py-2 bg-[#466A68] text-white rounded-lg text-sm font-medium hover:bg-[#3a5856] transition-colors"
                    >
                        Pilih
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowUrlInput(false)}
                        className="px-3 py-2 text-[#8C7A6B] hover:text-[#0F0A09] transition-colors bg-white border border-[#D4BCAA]/40 rounded-lg"
                    >
                        Batal
                    </button>
                </div>
            ) : (
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                            ? "border-[#466A68] bg-[#466A68]/5"
                            : "border-[#D4BCAA]/40 hover:border-[#D4BCAA] hover:bg-white"
                        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={onFileChange}
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-[#466A68] animate-spin" />
                            <span className="text-sm font-medium text-[#466A68]">Mengunggah...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-white border border-[#D4BCAA]/20 rounded-xl flex items-center justify-center shadow-sm">
                                <UploadCloud className="w-6 h-6 text-[#466A68]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#0F0A09]">
                                    Klik atau drag & drop file ke sini
                                </p>
                                <p className="text-xs text-[#8C7A6B] mt-1">
                                    Maksimal ukuran file 5MB
                                </p>
                            </div>
                        </div>
                    )}

                    {!isUploading && (
                        <div className="absolute top-3 right-3">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowUrlInput(true)
                                }}
                                className="p-1.5 text-[#8C7A6B] hover:text-[#466A68] hover:bg-[#466A68]/5 rounded-lg transition-colors border border-transparent hover:border-[#466A68]/10"
                                title="Gunakan URL"
                            >
                                <LinkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>
            )}
        </div>
    )
}
