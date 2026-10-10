# dsh-plan-switch

常驻 Plan 模式开关：在对话输入栏把官方的 Plan 圆片换成一颗常驻按钮，
默认显示未开启，点击走 `/plan` 命令通道切换。

只有浏览器半（`lib/client.js`）；`lib/index.js` 是空 `apply`，只为让 bundle patch
插入的那一行有宿主侧条目可挂载。

## 为什么需要显式 priority

`conversation.input.plan` 是 **single** 槽位：同一 priority 上只允许一个注册者，
第二个注册者会**抛错**，而不是「后者顶掉前者」：

```
single slot "conversation.input.plan" already has a registration at priority 0
  — register at a different priority to shadow it (lowest renders)
```

官方 `@deepseek-ai/dsh-client-ui-plan` 用默认 priority 0 注册该座位。第三方插件
若也用默认值，就会与它撞在同一格；而**谁先激活由 inject 数量决定**（Cordis 按依赖
满足度激活，不是按 bundle 顺序）—— 本插件只有 3 个依赖，会先注册，于是**官方插件**
的注册抛错 → 该 entry 变成 `failed` → 桌面端判定 `web boot: 1 entry did not activate`
→ **客户端直接打不开**。

所以本插件用 `[-1, -2, -3, -5, -8]` 的 priority 阶梯做「影子替换」：最低 priority 渲染，
官方条目仍留在台账里照常激活（它其它的座位：plan 卡片、plan-review、侧边栏预览全部保留）。
阶梯让「未来也有人占 -1」不再致命；全占满时自己放弃，最坏只是按钮不出现。
任何失败都就地吞掉 —— `apply` 抛错才是真正致命的。

## 安装

```sh
# GitHub
dsh plugin --profile <profile> add github:SHUNJIANBAO/dsh-plan-switch

# 本地开发 / 离线
dsh plugin --profile <profile> add /abs/path/to/dsh-plan-switch
```

官方桌面客户端：侧栏 **插件 → 添加插件**，粘包名、`github:` 地址或本地绝对路径。
装完重启 profile。

## 验收

```sh
node test/offline-regression.mjs   # 28 条断言：槽位 priority 阶梯 + 命令通道 + 按钮状态机
```

装好后确认：

1. 输入栏出现常驻「计划」按钮（不再是官方圆片），未开启时为普通样式。
2. 点击 → 变高亮胶囊，Plan 模式真的开启（官方 plan 卡片照常工作）。
3. 再点 → 关闭。
4. 命令排队期间按钮禁用（防止「退出排队中再点反而进入」）。

## 回滚

```sh
dsh plugin --profile <profile> remove dsh-plan-switch
```

或手工：从 profile 的 `package.json` 里删掉 `dependencies` 与 `dsh.profile.bundles` 两处的
`dsh-plan-switch`，删掉 `node_modules/dsh-plan-switch`，重启。官方圆片会自动回到原位。

## 结构

```
dsh-plan-switch/
├── package.json          # dsh.bundle.patch + dsh.client + exports["./client"]
├── cordis.patch.yml      # bundle patch：插入一行
├── lib/
│   ├── index.js          # 宿主半：空 apply
│   └── client.js         # 浏览器半：计划按钮（影子替换 + /plan 命令通道）
└── test/                 # 离线回归
```

零 npm 运行时依赖，不声明 `@deepseek-ai/*` peerDependencies。

## 许可

MIT。见 [LICENSE](LICENSE)。
