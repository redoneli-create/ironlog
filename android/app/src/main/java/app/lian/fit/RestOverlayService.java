package app.lian.fit;

import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.annotation.Nullable;

public class RestOverlayService extends Service {

    private WindowManager windowManager;
    private TextView view;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private long endAt = 0L;
    private String label = "休息";

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (view == null) return;
            long left = endAt - System.currentTimeMillis();
            if (left > 0) {
                long total = (left + 999) / 1000;
                view.setText(String.format("%02d:%02d  %s", total / 60, total % 60, label));
                view.setAlpha(1f);
            } else if (left > -20000) {
                view.setText("休息结束 · " + label);
                view.setAlpha(0.9f);
            } else {
                stopSelf();
                return;
            }
            handler.postDelayed(this, 250);
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            endAt = intent.getLongExtra("endAt", System.currentTimeMillis());
            String l = intent.getStringExtra("label");
            if (l != null) label = l;
        }
        if (view == null) setup();
        handler.removeCallbacksAndMessages(null);
        handler.post(tick);
        return START_NOT_STICKY;
    }

    private void setup() {
        view = new TextView(this);
        view.setTextColor(Color.WHITE);
        view.setTextSize(17f);
        view.setPadding(46, 24, 46, 24);

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#E60B0F14"));
        bg.setCornerRadius(70f);
        bg.setStroke(3, Color.parseColor("#FF5A1F"));
        view.setBackground(bg);

        int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = 120;

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        try {
            windowManager.addView(view, params);
        } catch (Exception e) {
            view = null;
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (view != null && windowManager != null) {
            try {
                windowManager.removeView(view);
            } catch (Exception ignored) {
            }
            view = null;
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
