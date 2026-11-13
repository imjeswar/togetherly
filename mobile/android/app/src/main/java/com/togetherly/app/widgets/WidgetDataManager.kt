package com.togetherly.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.net.Uri
import android.util.Base64
import android.view.View
import android.widget.RemoteViews
import com.togetherly.app.R
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

object WidgetDataManager {

    const val PREFS_NAME = "togetherly_widget_prefs"
    private const val DRAWING_FILENAME = "widget_latest_drawing.png"
    private const val PHOTO_FILENAME = "widget_latest_photo.png"

    // 1. SAVE DRAWING AND RENDER BITMAP
    fun saveDrawing(context: Context, title: String?, strokesJson: String?) {
        if (strokesJson.isNullOrEmpty()) return

        try {
            val bitmap = Bitmap.createBitmap(480, 480, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.drawColor(Color.parseColor("#14101A"))

            val jsonArray = JSONArray(strokesJson)
            for (i in 0 until jsonArray.length()) {
                val strokeObj = jsonArray.getJSONObject(i)
                val pathStr = strokeObj.optString("path", "")
                val colorStr = strokeObj.optString("color", "#E8A0A8")
                val width = strokeObj.optDouble("width", 4.0).toFloat()

                if (pathStr.isNotEmpty()) {
                    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        style = Paint.Style.STROKE
                        strokeCap = Paint.Cap.ROUND
                        strokeJoin = Paint.Join.ROUND
                        strokeWidth = width * 1.2f
                        color = try {
                            Color.parseColor(colorStr)
                        } catch (e: Exception) {
                            Color.parseColor("#E8A0A8")
                        }
                    }

                    val path = parseSvgPathToAndroidPath(pathStr)
                    canvas.drawPath(path, paint)
                }
            }

            // Save rendered PNG bitmap
            val file = File(context.filesDir, DRAWING_FILENAME)
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            }

            // Save metadata to SharedPreferences
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString("latest_drawing_title", title ?: "Our Doodle")
                .putBoolean("has_drawing", true)
                .putLong("drawing_updated_at", System.currentTimeMillis())
                .apply()

            updateQuickDrawingWidgets(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // 2. SAVE PHOTO BITMAP
    fun savePhoto(context: Context, localPathOrBase64: String?, caption: String?) {
        if (localPathOrBase64.isNullOrEmpty()) return

        try {
            // Handle remote HTTP / HTTPS URLs (e.g. from Render or CDN)
            if (localPathOrBase64.startsWith("http://") || localPathOrBase64.startsWith("https://")) {
                Thread {
                    try {
                        val url = java.net.URL(localPathOrBase64)
                        val conn = url.openConnection() as java.net.HttpURLConnection
                        conn.connectTimeout = 10000
                        conn.readTimeout = 15000
                        conn.instanceFollowRedirects = true
                        conn.doInput = true
                        conn.connect()
                        if (conn.responseCode == java.net.HttpURLConnection.HTTP_OK) {
                            conn.inputStream.use { input ->
                                val downloadedBitmap = BitmapFactory.decodeStream(input)
                                if (downloadedBitmap != null) {
                                    processAndStorePhotoBitmap(context, downloadedBitmap, caption)
                                }
                            }
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }.start()
                return
            }

            var srcBitmap: Bitmap? = null

            if (localPathOrBase64.startsWith("data:image")) {
                val base64Data = localPathOrBase64.substringAfter(",")
                val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                srcBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            } else {
                val cleanPath = localPathOrBase64.removePrefix("file://")
                val file = File(cleanPath)
                if (file.exists()) {
                    srcBitmap = BitmapFactory.decodeFile(file.absolutePath)
                }
            }

            if (srcBitmap != null) {
                processAndStorePhotoBitmap(context, srcBitmap, caption)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun processAndStorePhotoBitmap(context: Context, srcBitmap: Bitmap, caption: String?) {
        try {
            // Resize to max 500x500 to prevent RemoteViews binder transaction memory overflow
            val maxDim = 500
            val width = srcBitmap.width
            val height = srcBitmap.height
            val scale = Math.min(maxDim.toFloat() / width, maxDim.toFloat() / height)
            val targetW = Math.max(1, (width * scale).toInt())
            val targetH = Math.max(1, (height * scale).toInt())

            val scaledBitmap = Bitmap.createScaledBitmap(srcBitmap, targetW, targetH, true)

            val outFile = File(context.filesDir, PHOTO_FILENAME)
            FileOutputStream(outFile).use { out ->
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
            }

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString("latest_photo_caption", caption ?: "Our Latest Moment")
                .putBoolean("has_photo", true)
                .putLong("photo_updated_at", System.currentTimeMillis())
                .apply()

            updatePhotoWidgets(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // 3. SAVE PARTNER STATUS & METADATA
    fun savePartnerStatus(context: Context, partnerName: String?, isOnline: Boolean, daysTogether: Int) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString("partner_nickname", partnerName ?: "My Love")
                .putBoolean("is_partner_online", isOnline)
                .putInt("days_together", Math.max(1, daysTogether))
                .apply()

            updateSpaceWidgets(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // UPDATE QUICK DRAWING WIDGETS
    fun updateQuickDrawingWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
        val componentName = ComponentName(context, QuickDrawingWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hasDrawing = prefs.getBoolean("has_drawing", false)
        val title = prefs.getString("latest_drawing_title", "Our Latest Doodle") ?: "Our Latest Doodle"
        val drawingFile = File(context.filesDir, DRAWING_FILENAME)

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_drawing)

            if (hasDrawing && drawingFile.exists()) {
                val bitmap = BitmapFactory.decodeFile(drawingFile.absolutePath)
                if (bitmap != null) {
                    views.setImageViewBitmap(R.id.iv_drawing_bitmap, bitmap)
                    views.setViewVisibility(R.id.iv_drawing_bitmap, View.VISIBLE)
                    views.setViewVisibility(R.id.layout_drawing_placeholder, View.GONE)
                } else {
                    views.setViewVisibility(R.id.iv_drawing_bitmap, View.GONE)
                    views.setViewVisibility(R.id.layout_drawing_placeholder, View.VISIBLE)
                }
            } else {
                views.setViewVisibility(R.id.iv_drawing_bitmap, View.GONE)
                views.setViewVisibility(R.id.layout_drawing_placeholder, View.VISIBLE)
            }

            views.setTextViewText(R.id.tv_drawing_title, title)

            // Click Intent opens Togetherly
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("togetherly://canvas/quick")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 1, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_drawing_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    // UPDATE PHOTO WIDGETS
    fun updatePhotoWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
        val componentName = ComponentName(context, PhotoMemoriesWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hasPhoto = prefs.getBoolean("has_photo", false)
        val caption = prefs.getString("latest_photo_caption", "Our Latest Moment") ?: "Our Latest Moment"
        val photoFile = File(context.filesDir, PHOTO_FILENAME)

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_photo_memories)

            if (hasPhoto && photoFile.exists()) {
                val bitmap = BitmapFactory.decodeFile(photoFile.absolutePath)
                if (bitmap != null) {
                    views.setImageViewBitmap(R.id.iv_memory_photo, bitmap)
                    views.setViewVisibility(R.id.iv_memory_photo, View.VISIBLE)
                    views.setViewVisibility(R.id.layout_photo_placeholder, View.GONE)
                } else {
                    views.setViewVisibility(R.id.iv_memory_photo, View.GONE)
                    views.setViewVisibility(R.id.layout_photo_placeholder, View.VISIBLE)
                }
            } else {
                views.setViewVisibility(R.id.iv_memory_photo, View.GONE)
                views.setViewVisibility(R.id.layout_photo_placeholder, View.VISIBLE)
            }

            views.setTextViewText(R.id.tv_photo_caption, caption)

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("togetherly://photos")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 2, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_photo_root, pendingIntent)
            views.setOnClickPendingIntent(R.id.btn_quick_camera, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    // UPDATE OUR LITTLE SPACE WIDGETS
    fun updateSpaceWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
        val componentName = ComponentName(context, OurLittleSpaceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val partnerName = prefs.getString("partner_nickname", "My Love") ?: "My Love"
        val isOnline = prefs.getBoolean("is_partner_online", false)
        val daysTogether = prefs.getInt("days_together", 1)

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_our_little_space)

            views.setTextViewText(R.id.tv_days_together, "Day $daysTogether")
            views.setTextViewText(R.id.tv_partner_name, partnerName)
            if (isOnline) {
                views.setTextViewText(R.id.tv_partner_status, "🟢 Online")
                views.setTextColor(R.id.tv_partner_status, Color.parseColor("#34D399"))
            } else {
                views.setTextViewText(R.id.tv_partner_status, "⚪ Offline")
                views.setTextColor(R.id.tv_partner_status, Color.parseColor("#9CA3AF"))
            }

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("togetherly://")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_space_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    // REFRESH ALL WIDGETS
    fun refreshAllWidgets(context: Context) {
        updateQuickDrawingWidgets(context)
        updatePhotoWidgets(context)
        updateSpaceWidgets(context)
    }

    // ROBUST SVG PATH PARSER
    private fun parseSvgPathToAndroidPath(pathStr: String): Path {
        val path = Path()
        try {
            // Tokenize SVG path string: commands M, L, C, Z and coordinates
            val regex = Regex("([MLCZmlcz])|([-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)")
            val tokens = regex.findAll(pathStr).map { it.value }.toList()

            var i = 0
            var currentCmd = 'M'

            while (i < tokens.size) {
                val token = tokens[i]
                if (token.length == 1 && token[0].isLetter()) {
                    currentCmd = token[0]
                    i++
                    continue
                }

                when (currentCmd) {
                    'M', 'm' -> {
                        if (i + 1 < tokens.size) {
                            val x = tokens[i].toFloat()
                            val y = tokens[i + 1].toFloat()
                            path.moveTo(x, y)
                            i += 2
                            currentCmd = 'L' // Implicit subsequent coordinates are lineTo
                        } else i++
                    }
                    'L', 'l' -> {
                        if (i + 1 < tokens.size) {
                            val x = tokens[i].toFloat()
                            val y = tokens[i + 1].toFloat()
                            path.lineTo(x, y)
                            i += 2
                        } else i++
                    }
                    'C', 'c' -> {
                        if (i + 5 < tokens.size) {
                            val x1 = tokens[i].toFloat()
                            val y1 = tokens[i + 1].toFloat()
                            val x2 = tokens[i + 2].toFloat()
                            val y2 = tokens[i + 3].toFloat()
                            val x = tokens[i + 4].toFloat()
                            val y = tokens[i + 5].toFloat()
                            path.cubicTo(x1, y1, x2, y2, x, y)
                            i += 6
                        } else i++
                    }
                    'Z', 'z' -> {
                        path.close()
                    }
                    else -> i++
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return path
    }
}

