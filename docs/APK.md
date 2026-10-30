# 把「练」装成 APK

三种方式，按「有没有电脑环境 / 要不要长期用」选。

| 方式 | 需要什么 | 耗时 | 适合 |
| --- | --- | --- | --- |
| **A. GitHub Actions** | 一个 GitHub 仓库（免费） | 约 5 分钟，一次配置 | 想要正式 APK、不想装 Android 工具 |
| **B. 本地 Android Studio** | JDK 21 + Android Studio（约 3 GB） | 首次 30 分钟 | 想改原生层、自己签名上架 |
| **C. PWABuilder（TWA）** | 已部署的 HTTPS 网站 | 5 分钟 | 只要一个能装的包，接受依赖线上地址 |

工程已内置 Capacitor（`android/` 目录 + `capacitor.config.ts`），A、B 两条路都能直接用。

---

## A. GitHub Actions 自动出 APK（推荐）

1. 把整个 `ironlog/` 推到 GitHub（public 或 private 都行）
2. 仓库 → **Actions** → 左侧 **Build Android APK** → **Run workflow**
3. 跑完在本次运行页面底部 **Artifacts** 下载 `lian-apk`，解压得到 `app-debug.apk`
4. 传到手机安装（需允许「安装未知来源应用」）

也可以打 tag 自动触发：

```bash
git tag v0.4.0 && git push origin v0.4.0
```

> debug 包用调试签名，能自用不能上架。上架 Google Play 需要自己的 keystore，见文末。

## B. 本地构建

前置：JDK 21、Android SDK（装 Android Studio 自带）。

```bash
npm install
npm run build          # 产出 dist/
npx cap sync android   # 把 dist 同步进 android/
npm run android:open   # 用 Android Studio 打开 android/
```

Android Studio 里：`Build → Build Bundle(s) / APK(s) → Build APK(s)`，
产物在 `android/app/build/outputs/apk/debug/app-debug.apk`。

没有 Android Studio 也可以纯命令行（需先设 `ANDROID_HOME`）：

```bash
cd android && ./gradlew assembleDebug
```

## C. PWABuilder（TWA，需要 HTTPS 站点）

1. 先把 `dist/` 部署到 Netlify / Vercel / GitHub Pages，拿到 `https://...`
2. 打开 https://www.pwabuilder.com ，输入该网址
3. Android → 下载包（PWABuilder 会生成 `assetlinks.json`，把它放到站点根目录 `/.well-known/assetlinks.json`，否则打开时会带地址栏）
4. 下载的压缩包里就是签名好的 `.apk` / `.aab`

TWA 本质是「用 Chrome 打开你的站点」，所以：首次启动需要网络，UI 会随部署自动更新；离线靠 Service Worker。

---

## 改包名 / 版本号

`android/app/build.gradle`：

```gradle
namespace "app.lian.fit"
defaultConfig {
    applicationId "app.lian.fit"
    versionCode 1
    versionName "0.4.0"
}
```

改完执行 `npm run build:android` 再构建。

## 上架用签名包

```bash
keytool -genkey -v -keystore lian.keystore -alias lian -keyalg RSA -keysize 2048 -validity 10000
```

在 `android/app/build.gradle` 里加 `signingConfigs`，或用 Android Studio 的
`Build → Generate Signed Bundle / APK`。

## 版本更新与签名（重要）

从 v0.9.4 起，所有包都用仓库里的固定密钥 `android/app/yudong.p12` 签名，
所以**以后新版直接覆盖安装即可，数据保留**，不需要卸载。

两个例外：

1. **老版本（v0.9.3 及更早）是 CI 临时生成的调试签名**，与固定签名不一致。从旧版升级到 v0.9.4+ 需要先卸载一次 —— 卸载会清空数据，所以升级前务必先导出 JSON。
2. 只要包名（`app.lian.fit`）不变，之后所有版本都能无缝覆盖升级。

> 签名密钥提交在仓库里，方便自助出包；这也意味着拿到仓库的人可以用同签名打包。
> 如果要上应用商店或想更安全，把这把密钥换成 GitHub Secrets 注入：

```bash
# 生成后保存好，切勿丢失（丢了就无法覆盖升级）
keytool -genkeypair -keystore yudong.p12 -alias yudong -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 yudong.p12 > yudong.b64   # 放进 Secrets: KEYSTORE_BASE64
```

## 常见问题

- **安装被拦截**：手机设置里允许该来源安装；小米/华为需关闭「纯净模式」。
- **白屏**：确认先 `npm run build` 再 `npx cap sync android`，否则 `assets/public` 是空的。
- **改了网页不生效**：每次都要重新 `npm run build:android`。
- **数据丢了**：APK 和浏览器是两个独立存储；换到 APK 前先在网页版导出 JSON，进 APK 后导入。
