const MS_SCOPE = "offline_access User.Read Files.Read.All Mail.Read MailboxSettings.Read";
const MS_GRAPH_ROOT = "https://graph.microsoft.com";
const MS_GRAPH_VER = "1.0";
const MS_GRAPH_API_LIST = [
  `${MS_GRAPH_ROOT}/v${MS_GRAPH_VER}/me`,
  `${MS_GRAPH_ROOT}/v${MS_GRAPH_VER}/me/drive`,
  `${MS_GRAPH_ROOT}/v${MS_GRAPH_VER}/me/drive/root`,
  `${MS_GRAPH_ROOT}/v${MS_GRAPH_VER}/me/drive/root/children`,
  `${MS_GRAPH_ROOT}/v${MS_GRAPH_VER}/me/mailFolders`,
  `${MS_GRAPH_ROOT}/v${MS_GRAPH_VER}/me/mailFolders/inbox`,
  `${MS_GRAPH_ROOT}/v${MS_GRAPH_VER}/me/messages`,
];

addEventListener("fetch", (event) => {
  event.respondWith(
    handleRequest(event.request).catch(
      (err) => new Response(err.stack, { status: 500 })
    )
  );
});

addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event));
});

async function handleRequest(request) {
  if (typeof MS_CLIENT_ID === "undefined"
    || typeof MS_CLIENT_SECRET === "undefined"
    || typeof MS_REDIRECT_URI === "undefined") {
    return createHTMLResponse(`<div class="alert alert-danger" role="alert">
      Missing MS_CLIENT_ID, MS_CLIENT_SECRET or MS_REDIRECT_URI
    </div>`, 500);
  }

  const { pathname } = new URL(request.url);

  if (typeof CRON_PATH !== "undefined" && pathname.startsWith(CRON_PATH)) {
    await sendMessage("Scheduled start");
    for (let i = 0; i < MS_GRAPH_API_LIST.length; i++) {
      await fetchMSApi(MS_GRAPH_API_LIST[i]);
      await sleep(randomInt(1000, 5000));
    }
    await sendMessage("Scheduled finish");
  }

  if (await Token.get("refresh_token") !== null) {
    return fetch("https://welcome.developers.workers.dev");
  }

  if (pathname.startsWith("/login")) {
    return handleLogin(request);
  }

  if (pathname.startsWith("/callback")) {
    return handleCallback(request);
  }

  return createHTMLResponse(`<a class="w-50 btn btn-lg btn-primary btn-block" href="/login" role="button">Authorize</a>`);
}

async function handleScheduled(event) {
  await sendMessage("Scheduled start");
  const count = randomInt(2, 10);
  for (let i = 0; i < count; i++) {
    await randomFetchMSApi();
    await sleep(randomInt(1000, 5000));
  }
  await sendMessage("Scheduled finish");
}

async function sendMessage(message) {
  if (typeof TGBOT_TOKEN === "undefined" || typeof TGBOT_CHAT_ID === "undefined") {
    console.log(message);
    return;
  }

  const response = await retryFetch(`https://api.telegram.org/bot${TGBOT_TOKEN}/sendMessage`, {
    method: "post",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: TGBOT_CHAT_ID,
      text: message
    })
  });
  if (response.status !== 200) {
    console.error(await response.text());
  }
}

async function handleLogin(request) {
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.append("client_id", MS_CLIENT_ID);
  url.searchParams.append("redirect_uri", MS_REDIRECT_URI);
  url.searchParams.append("scope", MS_SCOPE);
  url.searchParams.append("response_type", "code");
  return Response.redirect(url.href);
}

async function handleCallback(request) {
  const response = await retryFetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      "client_id": MS_CLIENT_ID,
      "client_secret": MS_CLIENT_SECRET,
      "redirect_uri": MS_REDIRECT_URI,
      "scope": MS_SCOPE,
      "code": new URL(request.url).searchParams.get("code"),
      "grant_type": "authorization_code"
    }),
  });


  try {
    const responseJson = await response.json();
    if (response.status !== 200) {
      return createHTMLResponse(`<div class="alert alert-danger" role="alert">
        <p>Error occurred: ${responseJson["error"]}</p>
        <p>${responseJson["error_description"]}</p>
        <p>See: ${responseJson["error_uri"]}</p>
      </div>`, response.status);
    }

    let userInfo
    await Promise.all([
      Token.put("access_token", responseJson["access_token"], { expirationTtl: responseJson["expires_in"] }),
      Token.put("refresh_token", responseJson["refresh_token"]),
      getUserInfo(responseJson["access_token"]).then((resp) => {
        userInfo = resp;
      }),
    ]);
    return createHTMLResponse(`<div class="alert alert-success" role="alert">
      Successfully logged in as ${userInfo["displayName"]} (${userInfo["mail"]})
    </div>`);
  } catch (e) {
    return createHTMLResponse(`<div class="alert alert-danger" role="alert">
      ${e.message}
    </div>`, 500);
  }
}

async function getAccessToken() {
  const accessToken = await Token.get("access_token");
  if (accessToken !== null) {
    return accessToken;
  }

  const refreshToken = await Token.get("refresh_token");
  if (refreshToken === null) {
    return null;
  }

  const response = await retryFetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      "client_id": MS_CLIENT_ID,
      "client_secret": MS_CLIENT_SECRET,
      "redirect_uri": MS_REDIRECT_URI,
      "scope": MS_SCOPE,
      "grant_type": "refresh_token",
      "refresh_token": refreshToken
    }),
  });
  if (response.status !== 200) {
    console.error("Error refreshing access token:", await response.text());
    return null;
  }

  const responseJson = await response.json();
  await Promise.all([
    Token.put("access_token", responseJson["access_token"], { expirationTtl: responseJson["expires_in"] }),
    Token.put("refresh_token", responseJson["refresh_token"]),
  ]);
  return responseJson["access_token"];
}

async function getUserInfo(accessToken) {
  const response = await retryFetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      "Authorization": "Bearer " + accessToken
    }
  });
  if (response.status !== 200) {
    return null;
  }
  return await response.json();
}

async function randomFetchMSApi() {
  const index = randomInt(0, MS_GRAPH_API_LIST.length);
  return await fetchMSApi(MS_GRAPH_API_LIST[index]);
}

async function fetchMSApi(url) {
  const accessToken = await getAccessToken();
  if (accessToken === null) {
    sendMessage("Not login");
    return;
  }

  try {
    const response = await retryFetch(url, {
      method: "get",
      headers: {
        "Authorization": "Bearer " + accessToken
      }
    });
    if (response.status === 401) {
      Token.delete("access_token");
    }
    sendMessage(url + ": " + response.statusText);
  }
  catch (e) {
    sendMessage(url + ": " + e.message);
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retry(fn, times = 3, delay = 1000) {
  return async (...args) => {
    for (let i = 0; i < times; i++) {
      try {
        return await fn(...args);
      } catch (e) {
        console.error(`Retry: #${i} ${e.message}`);
        await sleep(delay);
      }
    }
    console.error("Failed to execute");
  }
}

function retryFetch(url, options) {
  return retry(fetch)(url, options);
}

function createHTMLResponse(slot, status = 200) {
  return new Response(`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
      <title>Microsoft Graph Login</title>
      <style>
        html,
        body {
          height: 100%
        }
        body {
          display: flex;
          align-items: center;
          background-color: #f5f5f5;
        }
      </style>
    </head>
    <body>
      <div class="container w-70">
        <div class="text-center">
          <h5 class="mb-4">Microsoft Graph Login</h5>
          ${slot}
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p"
        crossorigin="anonymous"></script>
    </html>`, {
    status: status,
    headers: {
      "Content-Type": "text/html"
    }
  });
}
