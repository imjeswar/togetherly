package com.togetherly.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.togetherly.app.R
import com.togetherly.app.widgets.WidgetDataManager
import java.io.File
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class TogetherlyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ID = "togetherly_moments"
        const val CHANNEL_NAME = "Togetherly Moments"
        const val PREFS_NAME = "togetherly_widget_prefs"
        private const val DEFAULT_API_BASE = "https://togetherly-api.onrender.com"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Instant intimate doodles and photo moments from your partner."
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    /**
     * Called whenever a new FCM token is generated or refreshed.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_push_token", token).apply()

        // If user is already paired, register the refreshed token with the backend immediately
        val authToken = prefs.getString("auth_token", null)
        val deviceId = prefs.getString("device_id", null)
        val apiUrl = prefs.getString("api_base_url", DEFAULT_API_BASE) ?: DEFAULT_API_BASE

        if (!authToken.isNullOrEmpty() && !deviceId.isNullOrEmpty()) {
            Thread {
                try {
                    registerPushTokenToBackend(apiUrl, authToken, token)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }.start()
        }
    }

    /**
     * Processes high-priority FCM data messages even when Togetherly is completely closed.
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data
        if (data.isEmpty()) return

        val type = data["type"] ?: return
        val eventId = data["eventId"]
        val senderNickname = data["senderNickname"] ?: "Your Partner"

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val authToken = prefs.getString("auth_token", null)
        val apiUrl = prefs.getString("api_base_url", DEFAULT_API_BASE) ?: DEFAULT_API_BASE

        when (type) {
            "NEW_DRAWING" -> {
                handleIncomingDrawing(data, eventId, senderNickname, apiUrl, authToken)
            }
            "NEW_PHOTO" -> {
                handleIncomingPhoto(data, eventId, senderNickname, apiUrl, authToken)
            }
            "DELIVERY_ACK" -> {
                // Sender acknowledgment received
                val status = data["status"] ?: "DELIVERED"
                prefs.edit().putString("latest_delivery_status", status).apply()
            }
        }
    }

    private fun handleIncomingDrawing(
        data: Map<String, String>,
        eventId: String?,
        senderNickname: String,
        apiUrl: String,
        authToken: String?
    ) {
        val drawingId = data["drawingId"] ?: "draw_${System.currentTimeMillis()}"
        val title = data["title"] ?: "Sweet Doodle"
        var canvasData = data["canvasData"]

        // If canvasData was too large for 4KB FCM payload, fetch from backend via GET /api/drawing/:id
        if (canvasData.isNullOrEmpty() && !authToken.isNullOrEmpty()) {
            canvasData = fetchDrawingCanvasData(apiUrl, authToken, drawingId)
        }

        if (!canvasData.isNullOrEmpty()) {
            // 1. Immediately render vector bitmap & update Quick Sketch widget
            WidgetDataManager.saveDrawing(applicationContext, title, canvasData)

            // 2. Persist to local SQLite so when the user opens Togetherly, it is already loaded
            saveDrawingToLocalSqlite(drawingId, title, canvasData, data["previewUrl"])

            // 3. Post System Heads-Up Notification
            showDrawingNotification(senderNickname, title)

            // 4. Send Delivery Acknowledgment back to sender (state -> DELIVERED)
            if (!eventId.isNullOrEmpty() && !authToken.isNullOrEmpty()) {
                sendDeliveryAck(apiUrl, authToken, eventId)
            }
        }
    }

    private fun handleIncomingPhoto(
        data: Map<String, String>,
        eventId: String?,
        senderNickname: String,
        apiUrl: String,
        authToken: String?
    ) {
        val photoId = data["photoId"] ?: "photo_${System.currentTimeMillis()}"
        val photoUrl = data["photoUrl"]
        val caption = data["caption"] ?: "Our Latest Moment"

        if (!photoUrl.isNullOrEmpty()) {
            // 1. Download photo, scale to 500x500 & update Our Latest Moment widget
            WidgetDataManager.savePhoto(applicationContext, photoUrl, caption)

            // 2. Persist to local SQLite
            savePhotoToLocalSqlite(photoId, photoUrl, caption)

            // 3. Post Notification
            showPhotoNotification(senderNickname, caption)

            // 4. Send Delivery Acknowledgment
            if (!eventId.isNullOrEmpty() && !authToken.isNullOrEmpty()) {
                sendDeliveryAck(apiUrl, authToken, eventId)
            }
        }
    }

    private fun showDrawingNotification(senderNickname: String, title: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("togetherly://canvas/quick")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            101,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("A sweet doodle from $senderNickname ✨")
            .setContentText("Tap to open and view the drawing")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(101, notification)
    }

    private fun showPhotoNotification(senderNickname: String, caption: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("togetherly://photos")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            102,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("A live moment from $senderNickname 📷")
            .setContentText(caption.ifEmpty { "Sent a new photo moment" })
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(102, notification)
    }

    private fun saveDrawingToLocalSqlite(drawingId: String, title: String, canvasData: String, previewUrl: String?) {
        try {
            val dbFile = File(filesDir, "SQLite/togetherly.db")
            if (dbFile.exists()) {
                val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
                val values = ContentValues().apply {
                    put("id", drawingId)
                    put("title", title)
                    put("canvasData", canvasData)
                    put("previewUrl", previewUrl ?: "")
                    put("isLocalDraft", 0)
                    put("updatedAt", System.currentTimeMillis())
                }
                db.insertWithOnConflict("cached_drawings", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                db.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun savePhotoToLocalSqlite(photoId: String, photoUrl: String, caption: String?) {
        try {
            val dbFile = File(filesDir, "SQLite/togetherly.db")
            if (dbFile.exists()) {
                val db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
                val values = ContentValues().apply {
                    put("id", photoId)
                    put("photoUrl", photoUrl)
                    put("prompt", caption ?: "")
                    put("updatedAt", System.currentTimeMillis())
                }
                db.insertWithOnConflict("cached_photos", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                db.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun fetchDrawingCanvasData(apiUrl: String, token: String, drawingId: String): String? {
        try {
            val cleanBase = apiUrl.removeSuffix("/").removeSuffix("/api")
            val url = URL("$cleanBase/api/drawing/$drawingId")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.connectTimeout = 8000
            conn.readTimeout = 10000

            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(responseText)
                if (json.has("drawing")) {
                    val drawingObj = json.getJSONObject("drawing")
                    return if (drawingObj.has("canvasData")) drawingObj.getString("canvasData") else null
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }

    private fun sendDeliveryAck(apiUrl: String, token: String, eventId: String) {
        Thread {
            try {
                val cleanBase = apiUrl.removeSuffix("/").removeSuffix("/api")
                val url = URL("$cleanBase/api/delivery/ack")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.doOutput = true
                conn.connectTimeout = 8000
                conn.readTimeout = 10000

                val payload = JSONObject().apply {
                    put("eventIds", org.json.JSONArray().put(eventId))
                }

                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                conn.responseCode // execute
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    private fun registerPushTokenToBackend(apiUrl: String, token: String, pushToken: String) {
        try {
            val cleanBase = apiUrl.removeSuffix("/").removeSuffix("/api")
            val url = URL("$cleanBase/api/space/push-token")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.doOutput = true
            conn.connectTimeout = 8000
            conn.readTimeout = 10000

            val payload = JSONObject().apply {
                put("pushToken", pushToken)
                put("platform", "android")
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            conn.responseCode
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

