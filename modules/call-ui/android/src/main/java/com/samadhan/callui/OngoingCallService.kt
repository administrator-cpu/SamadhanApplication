package com.samadhan.callui

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Foreground service for the duration of a connected call so Android keeps the mic and audio running
 * when the app is backgrounded or the screen locks (Android 14+ requires a typed foreground service).
 */
class OngoingCallService : Service() {
  companion object {
    const val CHANNEL_ID = "samadhan_ongoing_calls"
    private const val NOTIFICATION_ID = 0x5A11
    private const val EXTRA_CALLER = "com.samadhan.callui.CALLER"
    const val BROADCAST_HANGUP = "com.samadhan.callui.HANGUP"

    fun start(context: Context, callId: String, callerName: String) {
      val intent = Intent(context, OngoingCallService::class.java)
        .putExtra(CallNotifications.EXTRA_CALL_ID, callId)
        .putExtra(EXTRA_CALLER, callerName)
      try {
        ContextCompat.startForegroundService(context, intent)
      } catch (_: Exception) {
        // Background start not allowed (should not happen: calls connect with the app visible).
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, OngoingCallService::class.java))
    }

    private fun ensureChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val nm = context.getSystemService(NotificationManager::class.java) ?: return
      if (nm.getNotificationChannel(CHANNEL_ID) != null) return
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Ongoing calls", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shown while you are on a call"
          setSound(null, null)
          enableVibration(false)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
      )
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val callId = intent?.getStringExtra(CallNotifications.EXTRA_CALL_ID)
    if (callId == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    val caller = intent?.getStringExtra(EXTRA_CALLER) ?: "Call"
    val notification = buildNotification(callId, caller)
    if (!startInForeground(notification)) stopSelf()
    return START_NOT_STICKY
  }

  private fun startInForeground(notification: Notification): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification)
      return true
    }
    val types = mutableListOf(
      ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
      ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
    )
    if (Build.VERSION.SDK_INT < 34) types.add(ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL)
    for (type in types) {
      try {
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
        return true
      } catch (_: Exception) {
        // Missing runtime prerequisite for this type: try the next one.
      }
    }
    return false
  }

  @SuppressLint("LaunchActivityFromNotification")
  private fun buildNotification(callId: String, caller: String): Notification {
    ensureChannel(this)
    val open = PendingIntent.getActivity(
      this,
      NOTIFICATION_ID,
      (packageManager.getLaunchIntentForPackage(packageName) ?: Intent()).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val hangUp = PendingIntent.getBroadcast(
      this,
      NOTIFICATION_ID + 1,
      Intent(this, CallActionReceiver::class.java).apply {
        action = BROADCAST_HANGUP
        putExtra(CallNotifications.EXTRA_CALL_ID, callId)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val person = Person.Builder().setName(caller).setImportant(true).build()
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(CallNotifications.smallIcon(this))
      .setContentTitle(caller)
      .setContentText("Ongoing voice call")
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setOngoing(true)
      .setUsesChronometer(true)
      .setWhen(System.currentTimeMillis())
      .setContentIntent(open)
      .setStyle(NotificationCompat.CallStyle.forOngoingCall(person, hangUp))
      .addPerson(person)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  override fun onDestroy() {
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}
