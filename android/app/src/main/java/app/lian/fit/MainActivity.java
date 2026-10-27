package app.lian.fit;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RestOverlayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
