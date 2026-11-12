package com.togetherly.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.togetherly.app.R

class PhotoMemoriesWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_photo_memories)

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("togetherly://photos"))
            val pendingIntent = PendingIntent.getActivity(
                context, 2, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_photo_root, pendingIntent)
            views.setOnClickPendingIntent(R.id.btn_quick_camera, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}

