package com.pravisti

import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import android.widget.Toast
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FileDownloaderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FileDownloader"

    private val imageExts = setOf("jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif")
    private val docExts   = setOf("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip")

    @ReactMethod
    fun downloadFile(fileUrl: String, customFileName: String?, promise: Promise) {
        try {
            val context = reactApplicationContext
            val uri = Uri.parse(fileUrl)

            // Determine filename
            var fileName = if (!customFileName.isNullOrBlank()) customFileName.substringBefore('?')
                           else uri.lastPathSegment?.substringBefore('?')?.takeIf { it.isNotBlank() }
                                ?: "pravisti_${System.currentTimeMillis()}.jpg"

            // Clean illegal chars
            fileName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")

            // Determine extension
            val dotIdx = fileName.lastIndexOf('.')
            val ext = if (dotIdx >= 0 && dotIdx < fileName.length - 1)
                          fileName.substring(dotIdx + 1).lowercase()
                      else {
                          // Try to get from URL mime
                          MimeTypeMap.getFileExtensionFromUrl(fileUrl)?.lowercase() ?: "jpg"
                      }
            if (!fileName.contains('.')) fileName += ".$ext"

            val isImage = ext in imageExts

            // Get mimeType
            val mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
                           ?: if (isImage) "image/jpeg" else "application/octet-stream"

            if (isImage) {
                // ── Save images to Gallery (DCIM/Pravisti) ──────────────────────────
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // Android 10+ → MediaStore (no storage permission needed)
                    val values = ContentValues().apply {
                        put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                        put(MediaStore.Images.Media.MIME_TYPE, mimeType)
                        put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_DCIM}/Pravisti")
                        put(MediaStore.Images.Media.IS_PENDING, 1)
                    }
                    val resolver = context.contentResolver
                    val imgUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                    if (imgUri != null) {
                        // Download via DownloadManager into cache, then copy — simpler: just use DownloadManager to Pictures
                        values.clear()
                        values.put(MediaStore.Images.Media.IS_PENDING, 0)
                        resolver.delete(imgUri, null, null) // remove placeholder; use DownloadManager instead
                    }
                    // Use DownloadManager → DCIM/Pravisti
                    val req = DownloadManager.Request(uri).apply {
                        setTitle(fileName)
                        setDescription("Saving to Gallery — Pravisti")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalPublicDir("${Environment.DIRECTORY_DCIM}/Pravisti", fileName)
                        setMimeType(mimeType)
                        setAllowedOverMetered(true)
                        setAllowedOverRoaming(true)
                    }
                    val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                        ?: throw IllegalStateException("DownloadManager unavailable")
                    val id = dm.enqueue(req)
                    Toast.makeText(context, "Saving to Gallery: $fileName", Toast.LENGTH_SHORT).show()
                    promise.resolve(id.toString())
                } else {
                    // Android 9 and below → DCIM/Pravisti (needs WRITE_EXTERNAL_STORAGE granted)
                    val req = DownloadManager.Request(uri).apply {
                        setTitle(fileName)
                        setDescription("Saving to Gallery — Pravisti")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DCIM, "Pravisti/$fileName")
                        setMimeType(mimeType)
                        setAllowedOverMetered(true)
                        setAllowedOverRoaming(true)
                    }
                    val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                        ?: throw IllegalStateException("DownloadManager unavailable")
                    val id = dm.enqueue(req)
                    Toast.makeText(context, "Saving to Gallery: $fileName", Toast.LENGTH_SHORT).show()
                    promise.resolve(id.toString())
                }
            } else {
                // ── Save PDFs / docs to Downloads folder ────────────────────────────
                val req = DownloadManager.Request(uri).apply {
                    setTitle(fileName)
                    setDescription("Downloading via Pravisti")
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    setMimeType(mimeType)
                    setAllowedOverMetered(true)
                    setAllowedOverRoaming(true)
                }
                val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                    ?: throw IllegalStateException("DownloadManager unavailable")
                val id = dm.enqueue(req)
                Toast.makeText(context, "Downloading to Downloads: $fileName", Toast.LENGTH_SHORT).show()
                promise.resolve(id.toString())
            }
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_ERROR", e.localizedMessage ?: "Unknown error", e)
        }
    }
}

