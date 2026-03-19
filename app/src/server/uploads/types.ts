interface UploadFileOptions {
    removeBackground?: boolean
    privateUserId?: string
    compress?: boolean
    normalize?: boolean
    compressBounds?: {
        width?: number
        height?: number
    }
}
