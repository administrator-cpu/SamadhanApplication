package com.samadhan.callui

import android.content.Context

/** Values native code needs when JS is not running (killed app, lock-screen decline). */
object CallPrefs {
  private const val FILE = "samadhan_call_ui"
  private const val KEY_DEVICE_ID = "device_id"
  private const val KEY_DECLINE_URL = "decline_url"

  @Volatile
  var activeCallId: String? = null

  private fun prefs(context: Context) = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  fun save(context: Context, deviceId: String?, declineUrl: String?) {
    val editor = prefs(context).edit()
    if (!deviceId.isNullOrBlank()) editor.putString(KEY_DEVICE_ID, deviceId)
    if (!declineUrl.isNullOrBlank()) editor.putString(KEY_DECLINE_URL, declineUrl)
    editor.apply()
  }

  fun deviceId(context: Context): String? = prefs(context).getString(KEY_DEVICE_ID, null)

  fun declineUrl(context: Context): String? = prefs(context).getString(KEY_DECLINE_URL, null)

  /** Busy with another call in the app: a new invite must not ring over it. */
  fun isBusyWith(callId: String): Boolean = activeCallId.let { it != null && it != callId }
}
