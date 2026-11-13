package com.samadhan.callui

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

class CallUiModule : Module() {
  companion object {
    private var instance: WeakReference<CallUiModule>? = null

    fun emitFromNative(action: String, callId: String) {
      instance?.get()?.emitAction(action, callId)
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context unavailable")

  private fun emitAction(action: String, callId: String) {
    sendEvent("onAction", mapOf("action" to action, "callId" to callId))
  }

  private fun readCallExtras(intent: Intent?): Pair<String, String>? {
    val callId = intent?.getStringExtra(CallNotifications.EXTRA_CALL_ID) ?: return null
    val action = intent.getStringExtra(CallNotifications.EXTRA_ACTION) ?: return null
    intent.removeExtra(CallNotifications.EXTRA_CALL_ID)
    intent.removeExtra(CallNotifications.EXTRA_ACTION)
    return action to callId
  }

  private fun setLockScreen(activity: Activity?, visible: Boolean) {
    activity ?: return
    activity.runOnUiThread {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(visible)
        activity.setTurnScreenOn(visible)
      } else {
        @Suppress("DEPRECATION")
        val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        if (visible) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
      }
    }
  }

  private fun handleCallIntent(intent: Intent?): Map<String, String>? {
    val (action, callId) = readCallExtras(intent) ?: return null
    CallNotifications.dismiss(context, callId)
    setLockScreen(appContext.currentActivity, true)
    return mapOf("action" to action, "callId" to callId)
  }

  override fun definition() = ModuleDefinition {
    Name("CallUi")

    Events("onAction")

    OnCreate {
      instance = WeakReference(this@CallUiModule)
      appContext.reactContext?.let { CallNotifications.ensureChannel(it) }
    }

    OnDestroy {
      if (instance?.get() === this@CallUiModule) instance = null
    }

    OnActivityEntersForeground {
      val activity = appContext.currentActivity
      if (activity?.intent?.hasExtra(CallNotifications.EXTRA_CALL_ID) == true) setLockScreen(activity, true)
    }

    OnNewIntent { intent ->
      handleCallIntent(intent)?.let { emitAction(it.getValue("action"), it.getValue("callId")) }
    }

    Function("consumeLaunchAction") {
      handleCallIntent(appContext.currentActivity?.intent)
    }

    Function("showIncomingCall") { callId: String, callerName: String, subtitle: String?, declineUrl: String?, declineToken: String?, timeoutMs: Double ->
      CallNotifications.show(
        context,
        IncomingCall(callId, callerName, subtitle, declineUrl, declineToken, timeoutMs.toLong().coerceIn(5_000L, 120_000L))
      )
    }

    Function("dismissIncomingCall") { callId: String ->
      CallNotifications.dismiss(context, callId)
    }

    Function("dismissAllIncomingCalls") {
      CallNotifications.dismissAll(context)
    }

    Function("setShowWhenLocked") { visible: Boolean ->
      setLockScreen(appContext.currentActivity, visible)
    }

    Function("canUseFullScreenIntent") {
      CallNotifications.canUseFullScreenIntent(context)
    }

    Function("openFullScreenIntentSettings") {
      val intent = if (Build.VERSION.SDK_INT >= 34) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
      } else {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }
}
