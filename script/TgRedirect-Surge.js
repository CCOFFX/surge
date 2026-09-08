const SCHEME = {
  Telegram: "tg",
  Nagram: "tg",
  Swiftgram: "sg",
  Turrit: "turrit",
  iMe: "ime",
  Nicegram: "ng",
  Lingogram: "lingo"
};

function getClient() {
  const arg = $argument || "CLIENT=Swiftgram";
  const m = arg.match(/(?:^|&)CLIENT=([^&]+)/);
  return m ? decodeURIComponent(m[1]).trim() : "Swiftgram";
}

function getQuery(qs, key) {
  if (!qs) return "";

  const params = qs.split("&");

  for (const param of params) {
    const index = param.indexOf("=");
    const k = index >= 0 ? param.slice(0, index) : param;

    if (k === key) {
      const value = index >= 0 ? param.slice(index + 1) : "";
      try {
        return decodeURIComponent(value);
      } catch (_) {
        return value;
      }
    }
  }

  return "";
}

function buildDeepLink(scheme, path, qs) {
  const parts = path.split("/").filter(Boolean);

  if (!parts.length) {
    return "";
  }

  // https://t.me/+xxxx
  if (parts[0].startsWith("+")) {
    return `${scheme}://join?invite=${encodeURIComponent(
      parts[0].slice(1)
    )}`;
  }

  // https://t.me/joinchat/xxxx
  if (parts[0] === "joinchat" && parts[1]) {
    return `${scheme}://join?invite=${encodeURIComponent(
      parts[1]
    )}`;
  }

  // https://t.me/addstickers/xxxx
  if (parts[0] === "addstickers" && parts[1]) {
    return `${scheme}://addstickers?set=${encodeURIComponent(
      parts[1]
    )}`;
  }

  // https://t.me/share/url?url=xxx&text=xxx
  if (parts[0] === "share" && parts[1] === "url") {
    const url = getQuery(qs, "url");
    const text = getQuery(qs, "text");

    const params = [];

    if (url) {
      params.push(`url=${encodeURIComponent(url)}`);
    }

    if (text) {
      params.push(`text=${encodeURIComponent(text)}`);
    }

    return `${scheme}://msg_url${
      params.length ? "?" + params.join("&") : ""
    }`;
  }

  // https://t.me/channel/123
  if (
    parts.length >= 2 &&
    /^\d+$/.test(parts[1])
  ) {
    return (
      `${scheme}://resolve?domain=` +
      `${encodeURIComponent(parts[0])}` +
      `&post=${encodeURIComponent(parts[1])}`
    );
  }

  // https://t.me/username
  return (
    `${scheme}://resolve?domain=` +
    encodeURIComponent(parts[0])
  );
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const client = getClient();

//
// 官方 Telegram 不做处理
//
if (client === "Telegram") {
  $done({});
} else {
  const match = $request.url.match(
    /^https?:\/\/(?:t\.me|telegram\.me)\/(.+)$/i
  );

  if (!match) {
    $done({});
  } else {
    const scheme = SCHEME[client] || "tg";

    let tail = match[1];

    //
    // https://t.me/s/channel/123
    //
    if (tail.startsWith("s/")) {
      tail = tail.slice(2);
    }

    const queryIndex = tail.indexOf("?");

    const path =
      queryIndex < 0
        ? tail
        : tail.slice(0, queryIndex);

    const query =
      queryIndex < 0
        ? ""
        : tail.slice(queryIndex + 1);

    const deepLink = buildDeepLink(
      scheme,
      path,
      query
    );

    if (!deepLink) {
      $done({});
    } else {
      console.log(
        `[Telegram Redirect] ${client}: ` +
        `${$request.url} -> ${deepLink}`
      );

      const htmlLink = escapeHTML(deepLink);
      const jsLink = JSON.stringify(deepLink);

      //
      // 不使用 HTTP 302。
      //
      // iOS Safari / Chrome 对
      // HTTP 302 -> custom URL scheme
      // 的处理并不稳定。
      //
      // 返回 HTML 后由浏览器主动唤起客户端。
      //
      const body = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>
<title>Telegram Redirect</title>

<meta
  http-equiv="refresh"
  content="0;url=${htmlLink}"
>
</head>

<body>

<script>
(function () {
  var target = ${jsLink};

  location.replace(target);

  setTimeout(function () {
    location.href = target;
  }, 200);
})();
</script>

<p>
  正在打开 ${client}…
</p>

<p>
  <a href="${htmlLink}">
    如果没有自动跳转，点击这里打开 ${client}
  </a>
</p>

</body>
</html>`;

      $done({
        response: {
          status: 200,

          headers: {
            "Content-Type":
              "text/html; charset=utf-8",

            "Cache-Control":
              "no-store, no-cache, must-revalidate",

            "Pragma":
              "no-cache"
          },

          body: body
        }
      });
    }
  }
}
