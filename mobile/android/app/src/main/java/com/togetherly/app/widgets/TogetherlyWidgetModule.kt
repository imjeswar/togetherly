package com.togetherly.app.widgets

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class TogetherlyWidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TogetherlyWidgetModule"

    @ReactMethod
    fun updateDrawing(title: String, strokesJson: String, promise: Promise) {
        try {
            WidgetDataManager.saveDrawing(reactContext, title, strokesJson)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DRAWING_ERROR", e.message)
        }
    }

    @ReactMethod
    fun updatePhoto(localPathOrBase64: String, caption: String, promise: Promise) {
        try {
            WidgetDataManager.savePhoto(reactContext, localPathOrBase64, caption)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PHOTO_ERROR", e.message)
        }
    }

    @ReactMethod
    fun updatePartnerStatus(partnerName: String, isOnline: Boolean, daysTogether: Int, promise: Promise) {
        try {
            WidgetDataManager.savePartnerStatus(reactContext, partnerName, isOnline, daysTogether)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun refreshAllWidgets(promise: Promise) {
        try {
            WidgetDataManager.refreshAllWidgets(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REFRESH_ERROR", e.message)
        }
    }
}
