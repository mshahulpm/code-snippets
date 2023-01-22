## Generate thumbnail from src 

```javascript

export async function generateThumbnail(imageSrc: string): Promise<string> {

    return new Promise((resolve, reject) => {

        const img = document.createElement('img')

        img.onload = (e) => {
            try {
                const base64Data = imageElementToBase64(img)
                resolve(base64Data)
            } catch (error) {
                resolve('')
            } finally {
            }
        }
        img.src = imageSrc
    })
}


export function imageElementToBase64(
    imageEl: HTMLImageElement,
) {

    const thumbHeight = 100
    const thumbWidth = (imageEl.width / imageEl.height) * 100

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");


    canvas.width = thumbWidth
    canvas.height = thumbHeight

    ctx?.drawImage(imageEl, 0, 0, canvas.width, canvas.height)
    const thumbBase64 = canvas.toDataURL()

    return thumbBase64
}

```

