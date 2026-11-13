package com.samadhan.callui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class CallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != CallNotifications.BROADCAST_DECLINE) return
    val callId = intent.getStringExtra(CallNotifications.EXTRA_CALL_ID) ?: return
    CallNotifications.dismiss(context, callId)
    CallUiModule.emitFromNative(CallNotifications.ACTION_DECLINE, callId)

    val url = intent.getStringExtra(CallNotifications.EXTRA_DECLINE_URL)
    val token = intent.getStringExtra(CallNotifications.EXTRA_DECLINE_TOKEN)
    if (url.isNullOrBlank() || token.isNullOrBlank()) return

    val pending = goAsync()
    Thread {
      try {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          connectTimeout = 8000
          readTimeout = 8000
          doOutput = true
          setRequestProperty("Content-Type", "application/json")
        }
        val body = JSONObject().put("callId", callId).put("token", token).toString()
        conn.outputStream.use { it.write(body.toByteArray()) }
        conn.responseCode
        conn.disconnect()
      } catch (_: Exception) {
      } finally {
        pending.finish()
      }
    }.start()
  }
}
