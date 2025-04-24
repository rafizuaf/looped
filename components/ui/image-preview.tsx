import Image from "next/image"
import { useImagePreview } from "@/hooks/use-image-preview"

interface ImagePreviewProps {
  file: File | null
  existingUrl?: string | null
  className?: string
}

export function ImagePreview({ file, existingUrl, className }: ImagePreviewProps) {
  const preview = useImagePreview(file)
  const imageUrl = preview || existingUrl

  if (!imageUrl) return null

  return (
    <div className={`relative aspect-square rounded-lg overflow-hidden ${className}`}>
      <Image
        src={imageUrl}
        alt="Preview"
        fill
        className="object-cover"
      />
    </div>
  )
}