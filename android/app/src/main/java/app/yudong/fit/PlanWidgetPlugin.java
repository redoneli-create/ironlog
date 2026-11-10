package app.yudong.fit;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlanWidget")
public class PlanWidgetPlugin extends Plugin {

    @PluginMethod
    public void setPlan(PluginCall call) {
        String title = call.getString("title", "今天练什么");
        String plan = call.getString("plan", "还没有安排");
        Context ctx = getContext();
        SharedPreferences sp = ctx.getSharedPreferences(PlanWidgetProvider.PREFS, Context.MODE_PRIVATE);
        sp.edit().putString("title", title).putString("plan", plan).apply();
        PlanWidgetProvider.refresh(ctx);
        call.resolve();
    }
}
