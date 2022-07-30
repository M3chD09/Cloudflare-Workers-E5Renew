# Cloudflare-Workers-E5Renew

## 描述
使用 [Cloudflare Workers](https://workers.cloudflare.com/) 随机调用 Microsoft Graph API 续期 [E5](https://developer.microsoft.com/microsoft-365/dev-program) 订阅。不保证续期成功。

## 部署
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/M3chD09/Cloudflare-Workers-E5Renew) (不确定这个按钮是否可用。)

### Cloudflare Workers
1. 创建一个新的 [Workers KV 命名空间](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces)。
2. 创建一个新的 [Cloudflare Workers 服务](https://dash.cloudflare.com/?to=/:account/workers) 并点击 "快速编辑" 按钮。
3. 将 [index.js](src/index.js) 文件的内容复制到代码字段中并点击 "保存并部署"。
4. 返回 "设置" 选项卡，在 "环境变量" 中，添加以下环境变量：
    * `CRON_PATH`：手动触发定时任务的路径，例如 `/cron`。如果不需要手动触发定时任务，可以不设置。
    * `TGBOT_TOKEN`：用于发送通知的 Telegram 机器人 Token。可以通过 [BotFather](https://t.me/BotFather) 创建。如果不需要接收通知，可以不设置。
    * `TGBOT_CHAT_ID`：通知接收者的 Telegram 聊天 ID。可以通过 [userinfobot](https://t.me/userinfobot) 获取。如果不需要接收通知，可以不设置。
    * `MS_CLIENT_ID`：微软应用的 Client ID。可以在下面的[步骤](#microsoft-azure-ad)中获取。
    * `MS_CLIENT_SECRET`：微软应用的 Client Secret。可以在下面的[步骤](#microsoft-azure-ad)中获取。
    * `MS_REDIRECT_URI`：微软应用的 Redirect URI。应该形如 `https://welcome.developers.workers.dev/callback`，其中 `welcome` 是你的 Workers 服务的名称，`developers` 是你的子域名称。
5. 在 "KV 命名空间绑定" 中，添加如下内容：
    * `变量名称`： `Token`
    * `KV 命名空间`：步骤 1 中创建的 KV 命名空间。
6. 选择 "触发器" 选项卡，在 "Cron 触发器" 中，点击 "添加 Cron 触发器" 按钮，选择你需要的频率，然后点击 "添加触发器" 按钮。

### Microsoft Azure AD
1. 登录 [Azure Portal](https://portal.azure.com/) 并从菜单中选择 "Azure Active Directory"。
2. 选择 "应用注册"，然后点击 "新注册" 按钮。
3. 名称中填入任意名称。受支持的帐户类型选择 `任何组织目录(任何 Azure AD 目录 - 多租户)中的帐户和个人 Microsoft 帐户(例如，Skype、Xbox)`。
4. 重定向 URI 中，平台选择 `Web` ，地址填入 `https://welcome.developers.workers.dev/callback`，其中 `welcome` 是你的 Workers 服务的名称，`developers` 是你的子域名称。
5. 点击 "注册" 按钮。
6. 在 "证书和密码" 选项卡中，点击 "新客户端密码" 按钮，填入任意说明并选择截止期限。点击 "添加" 按钮。密码会显示在 "值" 中。复制生成的密码，将其用于workers服务中的 `MS_CLIENT_SECRET` 环境变量。
7. 在 "概述" 选项卡中，复制 "应用程序 (客户端) ID"，将其用于workers服务中的 `MS_CLIENT_ID` 环境变量。

### 授权
访问形如 `https://welcome.developers.workers.dev/login` 的 Cloudflare Workers 默认路由登录。点击 "Authorize" 按钮，然后你会被重定向到微软登录页面。点击 "同意" 按钮，然后你会被重定向到 Cloudflare Workers 页面。如果一切正常，你会看到 "Successfully logged in" 的提示。尽情享受吧！
