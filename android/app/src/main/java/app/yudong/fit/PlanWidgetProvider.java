package app.yudong.fit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

public class PlanWidgetProvider extends AppWidgetProvider {

    public static final String PREFS = "yudong_widget";

    private static RemoteViews buildViews(Context ctx) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String title = sp.getString("title", "今天练什么");
        String plan = sp.getString("plan", "还没有安排，点开挑一个计划");

        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_plan);
        rv.setTextViewText(R.id.widget_title, title);
        rv.setTextViewText(R.id.widget_plan, plan);

        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, intent, flags);
        rv.setOnClickPendingIntent(R.id.widget_root, pi);
        return rv;
    }

    public static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        ComponentName cn = new ComponentName(ctx, PlanWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(cn);
        if (ids == null || ids.length == 0) return;
        RemoteViews rv = buildViews(ctx);
        for (int id : ids) {
            mgr.updateAppWidget(id, rv);
        }
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        RemoteViews rv = buildViews(ctx);
        for (int id : ids) {
            mgr.updateAppWidget(id, rv);
        }
    }
}
