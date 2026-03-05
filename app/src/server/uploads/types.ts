export interface UploadOptions {
    maxFileSize?: number
    allowedTypes?: string[]
    removeBackground?: boolean
    subdir?: string
}

export interface UploadResult {
    success: boolean
    url: string
    path: string
    filename: string
}