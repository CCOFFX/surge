const body = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>打开 ${client}</title>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 40px 24px;
  text-align: center;
}

a {
  display: inline-block;
  margin-top: 20px;
  padding: 14px 28px;
  background: #168de2;
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-size: 17px;
}
</style>

</head>

<body>

<h3>在 ${client} 中打开</h3>

<a id="open" href="${htmlLink}">
  打开 ${client}
</a>

<script>
(function () {
  var target = ${jsLink};

  // Safari 通常允许自动唤起
  if (
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS/i.test(navigator.userAgent)
  ) {
    setTimeout(function () {
      location.href = target;
    }, 50);
  }
})();
</script>

</body>
</html>`;
