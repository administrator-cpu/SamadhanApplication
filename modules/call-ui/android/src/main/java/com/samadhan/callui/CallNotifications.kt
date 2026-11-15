package com.samadhan.callui

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person

data class IncomingCall(
  val callId: String,
  val callerName: String,
  val subtitle: String?,
  val declineUrl: String?,
  val declineToken: String?,
  val timeoutMs: Long,
)

object CallNotifications {
  const val CHANNEL_ID = "samadhan_incoming_calls"
  const val TAG = "samadhan_call"
  const val EXTRA_CALL_ID = "com.samadhan.callui.CALL_ID"
  const val EXTRA_ACTION = "com.samadhan.callui.ACTION"
  const val EXTRA_DECLINE_URL = "com.samadhan.callui.DECLINE_URL"
  const val EXTRA_DECLINE_TOKEN = "com.samadhan.callui.DECLINE_TOKEN"
  const val ACTION_ANSWER = "answer"
  const val ACTION_SHOW = "show"
  const val ACTION_DECLINE = "decline"
  const val BROADCAST_DECLINE = "com.samadhan.callui.DECLINE"

  private fun notificationId(callId: String) = callId.hashCode() and 0x0FFFFFFF

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Incoming calls", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Rings when someone calls you"
      setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 1000, 800, 1000, 800, 1000)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setBypassDnd(false)
    }
    nm.createNotificationChannel(channel)
  }

  fun canUseFullScreenIntent(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < 34) return true
    val nm = context.getSystemService(NotificationManager::class.java) ?: return false
    return nm.canUseFullScreenIntent()
  }

  fun smallIcon(context: Context): Int {
    val res = context.resources
    val custom = res.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (custom != 0) custom else context.applicationInfo.icon
  }

  private fun activityIntent(context: Context, callId: String, action: String, requestCode: Int): PendingIntent {
    val intent = (context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra(EXTRA_CALL_ID, callId)
      putExtra(EXTRA_ACTION, action)
    }
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  @SuppressLint("MissingPermission")
  fun show(context: Context, call: IncomingCall) {
    if (CallPrefs.isBusyWith(call.callId)) return
    ensureChannel(context)
    val id = notificationId(call.callId)

    val answer = activityIntent(context, call.callId, ACTION_ANSWER, id * 4 + 1)
    val fullScreen = activityIntent(context, call.callId, ACTION_SHOW, id * 4 + 2)
    val decline = PendingIntent.getBroadcast(
      context,
      id * 4 + 3,
      Intent(context, CallActionReceiver::class.java).apply {
        action = BROADCAST_DECLINE
        putExtra(EXTRA_CALL_ID, call.callId)
        putExtra(EXTRA_DECLINE_URL, call.declineUrl ?: CallPrefs.declineUrl(context))
        putExtra(EXTRA_DECLINE_TOKEN, call.declineToken)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val caller = Person.Builder().setName(call.callerName).setImportant(true).build()
    val text = call.subtitle ?: "Incoming voice call"
    val fsiAllowed = canUseFullScreenIntent(context)

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(call.callerName)
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setOnlyAlertOnce(true)
      .setContentIntent(fullScreen)
      .setTimeoutAfter(call.timeoutMs)
      .addPerson(caller)

    if (fsiAllowed) {
      builder
        .setFullScreenIntent(fullScreen, true)
        .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, decline, answer))
    } else {
      builder
        .addAction(0, "Decline", decline)
        .addAction(0, "Answer", answer)
    }

    val notification = builder.build().apply { flags = flags or Notification.FLAG_INSISTENT }
    try {
      NotificationManagerCompat.from(context).notify(TAG, id, notification)
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS not granted
    }
  }

  fun dismiss(context: Context, callId: String) {
    NotificationManagerCompat.from(context).cancel(TAG, notificationId(callId))
  }

  fun dismissAll(context: Context) {
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    nm.activeNotifications.filter { it.tag == TAG }.forEach { nm.cancel(TAG, it.id) }
  }
}
