export interface UploadOptions {
    maxFileSize?: number
    allowedTypes?: string[]
    removeBackground?: boolean
}

export interface UploadResult {
    success: boolean
    url: string
    path: string
    filename: string
}