/**
 * Telegram Redirect for Surge
 *
 * 将 t.me / telegram.me 链接重定向到指定 Telegram 客户端。
 *
 * Surge 模块参数示例：
 * argument=CLIENT=Swiftgram
 *
 * 支持：
 * - Telegram
 * - Nagram
 * - Swiftgram
 * - Turrit
 * - iMe
 * - Nicegram
 * - Lingogram
 */

const CLIENT_SCHEMES = {
  Telegram: "tg",
  Nagram: "tg",
  Swiftgram: "sg",
  Turrit: "turrit",
  iMe: "ime",
  Nicegram: "ng",
  Lingogram: "lingo"
};

function log(message) {
  console.log(`[Telegram Redirect] ${message}`);
}

function getClient() {
  const argument = typeof $argument === "string"
    ? $argument
    : "CLIENT=Swiftgram";

  const match = argument.match(/(?:^|&)CLIENT=([^&]+)/);

  if (!match) {
    return "Swiftgram";
  }

  try {
    return decodeURIComponent(match[1]).trim();
  } catch (_) {
    return match[1].trim();
  }
}

function safeDecode(value) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function getQueryParameter(query, key) {
  if (!query) return "";

  const items = query.split("&");

  for (const item of items) {
    const index = item.indexOf("=");

    let itemKey;
    let itemValue;

    if (index === -1) {
      itemKey = item;
      itemValue = "";
    } else {
      itemKey = item.slice(0, index);
      itemValue = item.slice(index + 1);
    }

    if (safeDecode(itemKey) === key) {
      return safeDecode(itemValue.replace(/\+/g, "%20"));
    }
  }

  return "";
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDeepLink(scheme, rawPath, query) {
  const path = rawPath.replace(/^\/+|\/+$/g, "");
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  /**
   * https://t.me/+xxxxxxxx
   */
  if (parts[0].startsWith("+")) {
    const invite = parts[0].slice(1);

    if (!invite) {
      return "";
    }

    return `${scheme}://join?invite=${encodeURIComponent(invite)}`;
  }

  /**
   * https://t.me/joinchat/xxxxxxxx
   */
  if (
    parts[0].toLowerCase() === "joinchat" &&
    parts[1]
  ) {
    return `${scheme}://join?invite=${encodeURIComponent(parts[1])}`;
  }

  /**
   * https://t.me/addstickers/StickerSet
   */
  if (
    parts[0].toLowerCase() === "addstickers" &&
    parts[1]
  ) {
    return `${scheme}://addstickers?set=${encodeURIComponent(parts[1])}`;
  }

  /**
   * https://t.me/share/url?url=...&text=...
   */
  if (
    parts[0].toLowerCase() === "share" &&
    parts[1] &&
    parts[1].toLowerCase() === "url"
  ) {
    const url = getQueryParameter(query, "url");
    const text = getQueryParameter(query, "text");

    const params = [];

    if (url) {
      params.push(`url=${encodeURIComponent(url)}`);
    }

    if (text) {
      params.push(`text=${encodeURIComponent(text)}`);
    }

    return `${scheme}://msg_url${
      params.length
        ? "?" + params.join("&")
        : ""
    }`;
  }

  /**
   * https://t.me/s/channel/123
   *
   * 调用本函数前已经去掉 s/
   */

  /**
   * https://t.me/channel/123
   */
  if (
    parts.length >= 2 &&
    /^\d+$/.test(parts[1])
  ) {
    return (
      `${scheme}://resolve?domain=${encodeURIComponent(parts[0])}` +
      `&post=${encodeURIComponent(parts[1])}`
    );
  }

  /**
   * https://t.me/username
   */
  return `${scheme}://resolve?domain=${encodeURIComponent(parts[0])}`;
}

function buildResponseHTML(client, deepLink) {
  const htmlLink = escapeHTML(deepLink);
  const jsLink = JSON.stringify(deepLink);
  const clientName = escapeHTML(client);

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,maximum-scale=1"
>

<title>打开 ${clientName}</title>

<style>
html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Text",
    "Helvetica Neue",
    Arial,
    sans-serif;
  background: #ffffff;
  color: #111111;
}

.container {
  box-sizing: border-box;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 56px 24px;
  text-align: center;
}

.title {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 600;
}

.description {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.5;
  color: #666666;
}

.button {
  display: inline-block;
  box-sizing: border-box;
  min-width: 180px;
  padding: 14px 24px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 17px;
  font-weight: 500;
  background: #168de2;
  color: #ffffff;
}

.tip {
  margin-top: 24px;
  font-size: 13px;
  line-height: 1.5;
  color: #999999;
}
</style>
</head>

<body>

<div class="container">

  <h1 class="title">
    正在打开 ${clientName}
  </h1>

  <p class="description">
    如果没有自动跳转，请点击下方按钮。
  </p>

  <a
    id="open-app"
    class="button"
    href="${htmlLink}"
  >
    打开 ${clientName}
  </a>

  <p class="tip">
    Chrome 等浏览器可能会阻止网页自动唤起第三方 App，
    此时点击按钮即可。
  </p>

</div>

<script>
(function () {
  var target = ${jsLink};

  function openApp() {
    try {
      window.location.href = target;
    } catch (e) {}
  }

  /**
   * 页面加载后尝试自动打开。
   *
   * Safari 通常可以自动唤起。
   * Chrome 如果阻止自动唤起，
   * 用户仍然可以点击上面的按钮。
   */
  setTimeout(openApp, 50);

  /**
   * 再尝试一次，避免首次触发被浏览器忽略。
   */
  setTimeout(openApp, 500);

  /**
   * 点击按钮一定走用户手势触发。
   */
  var button = document.getElementById("open-app");

  if (button) {
    button.addEventListener("click", function () {
      setTimeout(openApp, 0);
    });
  }
})();
</script>

</body>
</html>`;
}

function finishWithoutModification() {
  $done({});
}

function main() {
  const client = getClient();

  log(`CLIENT=${client}`);

  /**
   * 选择官方 Telegram 时不拦截。
   *
   * 原始 t.me Universal Link 可直接交给系统处理。
   */
  if (client === "Telegram") {
    log("Telegram selected, bypass redirect.");
    finishWithoutModification();
    return;
  }

  const scheme = CLIENT_SCHEMES[client];

  if (!scheme) {
    log(`Unknown client: ${client}, fallback to Swiftgram.`);
  }

  const actualScheme = scheme || "sg";

  const requestURL =
    $request &&
    typeof $request.url === "string"
      ? $request.url
      : "";

  if (!requestURL) {
    log("No request URL.");
    finishWithoutModification();
    return;
  }

  const match = requestURL.match(
    /^https?:\/\/(?:t\.me|telegram\.me)\/(.+)$/i
  );

  if (!match) {
    log(`URL not matched: ${requestURL}`);
    finishWithoutModification();
    return;
  }

  let tail = match[1];

  /**
   * 移除 #fragment
   */
  const hashIndex = tail.indexOf("#");

  if (hashIndex >= 0) {
    tail = tail.slice(0, hashIndex);
  }

  /**
   * https://t.me/s/channel/123
   */
  if (/^s\//i.test(tail)) {
    tail = tail.slice(2);
  }

  const queryIndex = tail.indexOf("?");

  const path =
    queryIndex >= 0
      ? tail.slice(0, queryIndex)
      : tail;

  const query =
    queryIndex >= 0
      ? tail.slice(queryIndex + 1)
      : "";

  const deepLink = buildDeepLink(
    actualScheme,
    path,
    query
  );

  if (!deepLink) {
    log(`Unable to build deep link: ${requestURL}`);
    finishWithoutModification();
    return;
  }

  log(`${requestURL} -> ${deepLink}`);

  const body = buildResponseHTML(
    client,
    deepLink
  );

  $done({
    response: {
      status: 200,

      headers: {
        "Content-Type":
          "text/html; charset=utf-8",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        "Pragma":
          "no-cache",

        "Expires":
          "0"
      },

      body: body
    }
  });
}

try {
  main();
} catch (error) {
  log(
    `Error: ${
      error && error.stack
        ? error.stack
        : error
    }`
  );

  finishWithoutModification();
}
