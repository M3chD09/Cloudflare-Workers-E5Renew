# Cloudflare-Workers-E5Renew

[![Deploy](https://github.com/M3chD09/Cloudflare-Workers-E5Renew/actions/workflows/deploy.yml/badge.svg)](https://github.com/M3chD09/Cloudflare-Workers-E5Renew/actions/workflows/deploy.yml)

[中文文档](README_zh.md)

## Description
Use [Cloudflare Workers](https://workers.cloudflare.com/) to renew your [E5](https://developer.microsoft.com/microsoft-365/dev-program) subscription by calling the Microsoft Graph API randomly. Not guaranteed the renewal will be successful.


## Deploying
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/M3chD09/Cloudflare-Workers-E5Renew) (Not sure if this button works.)

### Cloudflare Workers
1. Create a new [Workers KV namespace](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces).
2. Create a new [Cloudflare Workers service](https://dash.cloudflare.com/?to=/:account/workers) and click on the "Quick edit" button.  
3. Copy the contents of the [index.js](src/index.js) file into the code field and click "Save and Deploy".
4. Back to workers page and go to the "Settings" tab. In the "Environment Variables" section, add the following environment variables:
    * `CRON_PATH`: The path to trigger the cron job manually. For example: `/cron`. Leave it blank if you don't want to trigger the cron job manually.
    * `TGBOT_TOKEN`: The token of the Telegram bot for sending notifications. Get it from the [BotFather](https://t.me/botfather). Or leave it blank if you don't want to be notified.
    * `TGBOT_CHAT_ID`: The user ID that the notifications will be sent to. Get it from the [userinfobot](https://t.me/userinfobot) bot. Or leave it blank if you don't want to be notified.
    * `MS_CLIENT_ID`: The client id of the Microsoft application. Get it in the [step](#microsoft-azure-ad) below.
    * `MS_CLIENT_SECRET`: The client secret of the Microsoft application. Get it in the [step](#microsoft-azure-ad) below.
    * `MS_REDIRECT_URI`: The redirect uri of the Microsoft application. It should be in the format of `https://welcome.developers.workers.dev/callback`, where `welcome` is the name of worker service and `developers` is the name your subdomain.
5. In the "KV Namespace Bindings" section, add the following bindings:
    * `Variable name`: `Token`
    * `KV Namespace`: The KV namespace created in step 1.
6. Go to "Triggers" tab and click on the "Add Cron Trigger" button in the "Cron Triggers" section. Choose whatever frequency you want and click "Add Trigger".

### Microsoft Azure AD
1. Go to the [Azure portal](https://portal.azure.com) and select "Azure Active Directory" from the menu.
2. Select "App registrations" and click the "New registration" button from the top menu.
3. Enter the name whatever you want for your app. For the type of supported account types, select `Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)`.
4. For the "Redirect URI" field, select `Web`, and in the "URL" field, enter the following URL: `https://welcome.developers.workers.dev/callback` where `welcome` is the name of worker service and `developers` is the name your subdomain.
5. Click the "Register" button.
6. From the "Certificates and secrets" menu, click "Client secret" tab and click the "New client secret" button. Enter the description and select the expiration time. Click the "Add" button. The client secret will be shown in the "Value" field. Copy the client secret and paste it into the `MS_CLIENT_SECRET` environment variable of the workers service.
7. From the "Overview" tab, copy the "Application (client) ID" field and paste it into the `MS_CLIENT_ID` environment variable of the workers service.

### Authorize
Access the Cloudflare Workers via the default route like `https://welcome.developers.workers.dev/`. Click the "Authorize" button and you will be redirected to the Microsoft login page. Just click the "Accept" button and you will be redirected back to the Cloudflare Workers page. If everything is OK, "Successfully logged in" will be shown. Enjoy!
