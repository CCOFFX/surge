/**
 * Telegram Redirect for Surge
 *
 * 支持：
 * - t.me
 * - telegram.me
 * - NodeSeek jump?to=t.me
 *
 * 默认客户端：
 * argument=CLIENT=Swiftgram
 */

const CLIENTS = [
  {
    name: "Telegram",
    scheme: "tg"
  },
  {
    name: "Nagram",
    scheme: "tg"
  },
  {
    name: "Swiftgram",
    scheme: "sg"
  },
  {
    name: "Turrit",
    scheme: "turrit"
  },
  {
    name: "iMe",
    scheme: "ime"
  },
  {
    name: "Nicegram",
    scheme: "ng"
  },
  {
    name: "Lingogram",
    scheme: "lingo"
  }
];

function log(message) {
  console.log(`[Telegram Redirect] ${message}`);
}

function safeDecode(value) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function getDefaultClient() {
  const argument =
    typeof $argument === "string"
      ? $argument
      : "CLIENT=Swiftgram";

  const match = argument.match(
    /(?:^|&)CLIENT=([^&]+)/
  );

  if (!match) {
    return "Swiftgram";
  }

  return safeDecode(match[1]).trim();
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
      return safeDecode(
        itemValue.replace(/\+/g, "%20")
      );
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

/**
 * 解析 NodeSeek 跳转页。
 *
 * 示例：
 * https://www.nodeseek.com/jump?to=https%3A%2F%2Ft.me%2Fbbqaqemby
 */
function unwrapURL(url) {
  if (
    /^https?:\/\/(?:www\.)?nodeseek\.com\/jump(?:\?|$)/i.test(
      url
    )
  ) {
    const queryIndex = url.indexOf("?");

    if (queryIndex < 0) {
      return url;
    }

    const query = url.slice(queryIndex + 1);
    const target = getQueryParameter(
      query,
      "to"
    );

    if (
      /^https?:\/\/(?:t\.me|telegram\.me)\//i.test(
        target
      )
    ) {
      log(`NodeSeek unwrap: ${url} -> ${target}`);
      return target;
    }
  }

  return url;
}

/**
 * Telegram HTTPS 链接 -> 自定义 Scheme。
 */
function buildDeepLink(
  scheme,
  rawPath,
  query
) {
  const path = rawPath.replace(
    /^\/+|\/+$/g,
    ""
  );

  const parts = path
    .split("/")
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  /**
   * https://t.me/+xxxx
   */
  if (parts[0].startsWith("+")) {
    const invite =
      parts[0].slice(1);

    if (!invite) {
      return "";
    }

    return (
      `${scheme}://join?invite=` +
      encodeURIComponent(invite)
    );
  }

  /**
   * https://t.me/joinchat/xxxx
   */
  if (
    parts[0].toLowerCase() ===
      "joinchat" &&
    parts[1]
  ) {
    return (
      `${scheme}://join?invite=` +
      encodeURIComponent(parts[1])
    );
  }

  /**
   * https://t.me/addstickers/xxxx
   */
  if (
    parts[0].toLowerCase() ===
      "addstickers" &&
    parts[1]
  ) {
    return (
      `${scheme}://addstickers?set=` +
      encodeURIComponent(parts[1])
    );
  }

  /**
   * https://t.me/share/url?url=...&text=...
   */
  if (
    parts[0].toLowerCase() ===
      "share" &&
    parts[1] &&
    parts[1].toLowerCase() ===
      "url"
  ) {
    const url = getQueryParameter(
      query,
      "url"
    );

    const text = getQueryParameter(
      query,
      "text"
    );

    const params = [];

    if (url) {
      params.push(
        `url=${encodeURIComponent(url)}`
      );
    }

    if (text) {
      params.push(
        `text=${encodeURIComponent(text)}`
      );
    }

    return (
      `${scheme}://msg_url` +
      (
        params.length
          ? "?" + params.join("&")
          : ""
      )
    );
  }

  /**
   * https://t.me/channel/123
   */
  if (
    parts.length >= 2 &&
    /^\d+$/.test(parts[1])
  ) {
    return (
      `${scheme}://resolve?domain=` +
      encodeURIComponent(parts[0]) +
      `&post=` +
      encodeURIComponent(parts[1])
    );
  }

  /**
   * https://t.me/username
   */
  return (
    `${scheme}://resolve?domain=` +
    encodeURIComponent(parts[0])
  );
}

/**
 * 解析 t.me URL。
 */
function parseTelegramURL(url) {
  const match = url.match(
    /^https?:\/\/(?:t\.me|telegram\.me)\/(.+)$/i
  );

  if (!match) {
    return null;
  }

  let tail = match[1];

  /**
   * 去掉 fragment
   */
  const hashIndex =
    tail.indexOf("#");

  if (hashIndex >= 0) {
    tail = tail.slice(
      0,
      hashIndex
    );
  }

  /**
   * https://t.me/s/channel/123
   */
  if (/^s\//i.test(tail)) {
    tail = tail.slice(2);
  }

  const queryIndex =
    tail.indexOf("?");

  const path =
    queryIndex >= 0
      ? tail.slice(
          0,
          queryIndex
        )
      : tail;

  const query =
    queryIndex >= 0
      ? tail.slice(
          queryIndex + 1
        )
      : "";

  return {
    path,
    query
  };
}

/**
 * 根据客户端生成目标 Scheme URL。
 */
function createClientLink(
  client,
  telegramInfo
) {
  return buildDeepLink(
    client.scheme,
    telegramInfo.path,
    telegramInfo.query
  );
}

/**
 * 构造选择页面。
 */
function buildHTML(
  defaultClientName,
  telegramInfo
) {
  let defaultClient =
    CLIENTS.find(
      item =>
        item.name ===
        defaultClientName
    );

  if (!defaultClient) {
    defaultClient =
      CLIENTS.find(
        item =>
          item.name ===
          "Swiftgram"
      );
  }

  const defaultLink =
    createClientLink(
      defaultClient,
      telegramInfo
    );

  const buttons =
    CLIENTS.map(client => {
      const link =
        createClientLink(
          client,
          telegramInfo
        );

      const active =
        client.name ===
        defaultClient.name;

      return `
<a
  class="client-button ${
    active
      ? "default"
      : ""
  }"
  href="${escapeHTML(link)}"
>
  <span class="client-name">
    ${escapeHTML(client.name)}
  </span>

  ${
    active
      ? `<span class="tag">默认</span>`
      : ""
  }
</a>`;
    }).join("");

  const jsDefaultLink =
    JSON.stringify(
      defaultLink
    );

  return `<!doctype html>

<html lang="zh-CN">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="
    width=device-width,
    initial-scale=1,
    maximum-scale=1,
    viewport-fit=cover
  "
>

<title>
选择 Telegram 客户端
</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Text",
    "Helvetica Neue",
    Arial,
    sans-serif;

  background:
    #f5f5f7;

  color:
    #111111;
}

.container {
  width: 100%;
  max-width: 520px;

  margin:
    0 auto;

  padding:
    36px 20px
    calc(
      36px +
      env(
        safe-area-inset-bottom
      )
    );
}

.card {
  background:
    rgba(
      255,
      255,
      255,
      0.96
    );

  border-radius:
    22px;

  padding:
    26px 20px;

  box-shadow:
    0 8px 30px
    rgba(
      0,
      0,
      0,
      0.06
    );
}

.title {
  margin:
    0;

  text-align:
    center;

  font-size:
    23px;

  font-weight:
    650;
}

.subtitle {
  margin:
    10px 0 24px;

  text-align:
    center;

  font-size:
    14px;

  line-height:
    1.5;

  color:
    #777777;
}

.client-list {
  display:
    flex;

  flex-direction:
    column;

  gap:
    10px;
}

.client-button {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  width:
    100%;

  min-height:
    52px;

  padding:
    0 16px;

  border-radius:
    14px;

  background:
    #f2f2f7;

  color:
    #111111;

  text-decoration:
    none;

  font-size:
    16px;

  font-weight:
    500;

  -webkit-tap-highlight-color:
    transparent;
}

.client-button:active {
  transform:
    scale(0.985);

  opacity:
    0.8;
}

.client-button.default {
  background:
    #168de2;

  color:
    #ffffff;
}

.client-name {
  overflow:
    hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}

.tag {
  flex-shrink:
    0;

  margin-left:
    12px;

  padding:
    4px 8px;

  border-radius:
    999px;

  font-size:
    11px;

  background:
    rgba(
      255,
      255,
      255,
      0.20
    );

  color:
    inherit;
}

.footer {
  margin:
    20px 4px 0;

  text-align:
    center;

  font-size:
    12px;

  line-height:
    1.6;

  color:
    #999999;
}

</style>

</head>

<body>

<div class="container">

  <div class="card">

    <h1 class="title">
      选择 Telegram 客户端
    </h1>

    <p class="subtitle">
      默认尝试打开
      ${escapeHTML(
        defaultClient.name
      )}。
      如果没有自动跳转，
      可以选择下面任意客户端。
    </p>

    <div class="client-list">
      ${buttons}
    </div>

  </div>

  <div class="footer">
    Telegram Redirect · Surge
  </div>

</div>

<script>

(function () {

  var target =
    ${jsDefaultLink};

  /**
   * 尝试自动打开默认客户端。
   *
   * Safari 通常会允许。
   * Chrome 可能要求用户手势，
   * 此时保留选择页面。
   */

  setTimeout(
    function () {
      try {
        window.location.href =
          target;
      } catch (_) {}
    },
    80
  );

})();

</script>

</body>

</html>`;
}

function finishWithoutModification() {
  $done({});
}

function main() {
  const defaultClient =
    getDefaultClient();

  let requestURL =
    (
      $request &&
      typeof $request.url ===
        "string"
    )
      ? $request.url
      : "";

  if (!requestURL) {
    log(
      "No request URL."
    );

    finishWithoutModification();

    return;
  }

  log(
    `Original URL: ${requestURL}`
  );

  /**
   * NodeSeek 等包装 URL 解包。
   */
  requestURL =
    unwrapURL(requestURL);

  const telegramInfo =
    parseTelegramURL(
      requestURL
    );

  if (!telegramInfo) {
    log(
      `Not Telegram URL: ${requestURL}`
    );

    finishWithoutModification();

    return;
  }

  log(
    `Default client: ${defaultClient}`
  );

  const body =
    buildHTML(
      defaultClient,
      telegramInfo
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

      body
    }
  });
}

try {
  main();
} catch (error) {
  log(
    `Error: ${
      error &&
      error.stack
        ? error.stack
        : error
    }`
  );

  finishWithoutModification();
}
