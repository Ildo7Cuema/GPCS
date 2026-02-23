/**
 * Compresses an image file using the Canvas API.
 * Resizes images larger than 1920x1080 while maintaining aspect ratio.
 * Compresses to JPEG with 0.8 quality.
 */
export async function compressImage(file: File): Promise<File> {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file
    }

    // Don't compress SVGs or GIFs to preserve vector/animation properties
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file
    }

    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)

            let width = img.width
            let height = img.height
            const MAX_WIDTH = 1920
            const MAX_HEIGHT = 1080

            // Resize if dimensions exceed max
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                if (width / height > MAX_WIDTH / MAX_HEIGHT) {
                    height = Math.round((height * MAX_WIDTH) / width)
                    width = MAX_WIDTH
                } else {
                    width = Math.round((width * MAX_HEIGHT) / height)
                    height = MAX_HEIGHT
                }
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Could not get canvas context'))
                return
            }

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, width, height)

            // Convert to blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Compression failed'))
                        return
                    }

                    // Create new file with original name (but ensure jpg extension if converted)
                    // We stick to original type if supported, or jpeg/png
                    const newFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now(),
                    })

                    resolve(newFile)
                },
                file.type,
                0.8 // Quality
            )
        }

        img.onerror = (err) => {
            URL.revokeObjectURL(url)
            reject(err)
        }

        img.src = url
    })
}
