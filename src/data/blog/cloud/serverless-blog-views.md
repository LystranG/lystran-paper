---
title: 理解Serverless：实现astro静态博客的阅读量统计
description: 本文记录了我如何利用 Vercel Serverless Functions 和 Redis (Vercel KV) 为 Astro 博客添加阅读量统计功能，免费且高性能，拓展性极强，便于你理解Serverless云计算的概念。
pubDatetime: 2026-01-23T20:55:09+08:00
slug: serverless-blog-views
featured: false
draft: false
tags:
  - serverless
  - cloud-computing
ogImage: https://img.lystran.com/2026/01/4424121a8182b440df08e0660e311425.png
share: true
category: cloud
---
    
## 目录  
  
  
本文带你理解各个公司都在使用的云计算模型：Serverless  
  
Serverless computing (无服务器运算)，又被称为**函数即服务** Function-as-a-Service，缩写为 FaaS。  
  
**Serverless** 以**平台即服务**（PaaS）为基础，Serverless提供一个架构：用户不需要配置、部署、管理后端服务，代码的运行时和各类基础设施都又云计算厂商提供，用户只需要专注于业务代码即可（你能想象直接浏览器输一个http地址就能调用你写的一个function？难道不是还要先配置运行环境，写main函数，然后还要引入http的各种依赖，从main函数中调用我的函数执行吗？），  
  
下面我通过我最近干的一个事来帮助你理解Serverless和云计算，以及最简单的落地方法：  
  
---  
  
做博客后，你很快会遇到一个现实问题：**我写的内容到底有没有被读到？**  
最常见的答案是接一个完整的统计平台（GA、Umami、Matomo…），但我对“全量埋点”有两个顾虑：  
  
1. **隐私与心智成本**：我不需要追踪用户画像，也不想引入复杂 Cookie / Consent 的流程。  
  
2. **系统复杂度**：只为一个“阅读量”引入一整套分析系统，有点过重。  
  
  但是还有像不蒜子这样的统计工具，我的全站访问量统计就使用的这个，但是这个以及很多工具都无法实现在文章列表（还没点进去）就能显示文章阅读量的功能，而为了这个功能引入一套后端系统 就太复杂了。  
  
  所以我选择了 **云函数** 这个功能，正好我的博客是托管在vercel上的，那就使用原生的**Vercel Storage**存储和**Vercel Serverless Funcitons**吧，而且都是免费的。  
  
## 云计算视角下的“最小可行系统”  
  
  
把问题放到 云计算/Serverless 的语境里，关键不是“选哪个框架”，而是识别三类能力：  
  
  
- **计算（Compute）**：承载读写逻辑，按请求计费，可弹性伸缩  
  
	-> Vercel Functions，不像后端服务那样需要配置整个完整运行时、环境，本质上就像是运行在云上的、可以直接  
	通过http调用的一个或若干个函数，开发者只需编写单个函数就能实现业务了  
  
- **存储（State）**：保存计数器，低延迟，天然支持原子自增  
  
	-> Vercel KV，本质是托管 Redis，目前vercel kv storage中只有Upstash Redis支持Vercel KV工具，不过同样免费，可以  
	一键将Redis和kv的相关配置注入到Vercel的project中，代码里调用kv工具甚至都无须去配置，即插即用  
  
- **安全与流量治理（Edge Security/Governance）**：防刷、限流、封禁  
  
	-> Vercel Firewall，把“防刷”从业务逻辑剥离出去，毕竟vercel functions也是有免费额度的，超出了额度就需要计费，这是成本方面的考量，对于其他考量见下文。  
  
这就是一个很典型的“云上组合拳”：**计算无状态 + 状态外置 + 治理前置**。  
  
  
## 读写分离 + 弱一致 + 成本优先  
  
    
我的实现里把阅读量拆成两条路径：  
  
  
1. **写路径（hit，自增）**：只对“当前文章页”触发，做**去重/限流/校验**  
  
2. **读路径（batch，批量读取）**：列表页/推荐卡片批量取值，使用 CDN 缓存减缓压力（对于这种对实时性要求不高的数据）  
  
    
可以把数据流理解为：  
    
  
```  
  
浏览器  
  
├─(POST /api/views/hit, Header: X-Slug)──> Vercel Functions ──> Redis INCR  
  
└─(POST /api/views/batch, {paths})──> CDN缓存─(miss)─> Vercel Functions ──> Redis GET  
  
```  
  
    
  
这里我刻意接受一个现实：**阅读量不是金融账本**。  
  
它允许短时间的不一致（CDN 缓存、并发写入等），换来更低的成本与更简单的系统。  
  
    
  
## 实现：Vercel Functions + Redis（KV）  
    
  
### 写接口：/api/views/hit（从请求头取 slug）  
    
  
写接口只做一件事：`INCR`。  
  
  
关键点：  
  
- 使用 `POST`：明确是非幂等写操作  
  
- slug 从请求头取：`X-Slug: /posts/xxx`  
  
- 更利于在 Vercel Firewall 层做规则匹配与限流（你可以按 header 做策略）  
  
```typescript  
  
import type { APIRoute } from "astro";  
import { kv } from "@vercel/kv";  
import { json, normalizePath, viewsKey } from "../utils/viewsApi";  
  
// SSR，使用vercel adapter实现为云函数  
export const prerender = false;  
  
    
  
/**  
* 文章阅读量自增接口  
*  
* 防刷策略：  
* - 客户端：localStorage n 小时去重  
* - 服务端：Vercel Firewall  
*/  
  
export const POST: APIRoute = async ({ request }) => {  
	const raw = request.headers.get("x-slug");  
	const slug = normalizePath(raw);  
	    
	  
	if (!slug || !slug.startsWith("/posts/") || slug.length > 2000) {  
		return json({ error: "Invalid post slug" }, 400);  
	}  
	  
	  
	const key = viewsKey(slug);  
	let next: number;  
	  
	try {  
		// 自动读取注入的redis环境变量，即插即用  
		next = await kv.incr(key);  
	} catch {  
		return json({ error: "KV not configured" }, 503);  
	}  
	  
	return json({ slug, views: next });  
  
};  
  
```  
  
### 读接口：/api/views/batch（批量读取 + CDN 读缓存）  
    
  
CDN 缓存：对读取结果返回 `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`  
  
    
这是一种非常“云上”的优化：把可缓存的读尽量前置到 CDN，让 Functions/Redis 更专注处理写入与缓存未命中。  
  
  
```typescript  
try {  
  
	const entries = await Promise.all(  
		unique.map(async path => {  
			const key = viewsKey(path);  
			const value = (await kv.get<unknown>(key)) ?? 0;  
			return [path, coerceViewsNumber(value)] as const;  
		})  
	);  
	  
	// CDN 读缓存  
	return json({ views: Object.fromEntries(entries) }, 200, [  
		['Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30']  
	]);  
  
} catch {  
	return json({ error: "KV not configured" }, 503);  
}  
```  
  
  
## 防刷与治理：为什么我把它交给 Firewall (非成本考量)  
  
  
阅读量统计最容易被忽略的部分是：**防刷不是业务逻辑**。  
  
  
如果把防刷写进代码里：  
  
- 维护黑名单、IP 限制、UA 识别  
- 自己实现滑动窗口/令牌桶  
- 日志与告警体系  
  
这些本质是“边界治理”，更适合放在更靠近边缘的位置（Firewall/CDN），这些请求也不应该直接请求到你的云函数业务里，这些请求属于脏数据，没有任何作用，只会增加你的Vercel免费套餐的额度使用量。  
  
我的做法；  
1. 对于阅读量这种不要求很高实时性的数据，使用 `Cache-Control: "public, s-maxage=60, stale-while-revalidate=30"` 请求头去让Vercel的CDN服务器缓存文章阅读量的查询，期限60s，这可以极大地减少到达云函数的请求，一方面用量变低了，另一方面用户体验更好了（云函数和redis都不是进行边缘计算的，只能部署在一个特定的区域，速度肯定是不及缓存的）  
  
2. 对于阅读量自增的接口，客户端使用localStorage暂存10分钟，防止重复添加阅读量，服务端使用 **Vercel Firewall** 防火墙配置限流规则，根据 **IP、User Agent、header:x-slug** 来作为限流的Key值，10分钟只允许请求一次（但感觉这属于邪修了吧😂，不过成本和安全性都不错，大大提高了防刷成本），其中 `X-Slug` 参数（表示文章）位于请求头，主要就是为了方便Firewall计算键值的。  
  
可以配置普通防火墙规则进一步增加安全性：校验 Referer 头，不过也是防君子不防小人了  
  
如果觉得Firewall的可定制度低、免费套餐给的额度少，还有一种方式： **Vercel Edge Middleware** ，这也算是一种云函数，但是是运行在边缘节点的，成本比 **Vercel Functions** 更低，这里面的逻辑触发在请求路由到Vercel Functions之前，在这里面实现限流比较方便的方式就是使用 `@upstash/ratelimit` ，不过用这个进行限流还是需要查询redis的，会消耗upstash的每日额度，所以我没有用该方案，优点是更加灵活，可以按照自己的意愿写更多限流规则。  
  
**总之：** 将防刷、去重、校验、乃至认证的这些事情交给边缘节点去做，这也是比较正统地利用了云计算的能力，没有污染业务代码，**业务代码更稳定、成本更可控、扩展更容易**。  
  
  
## Serverless 不仅如此  
  
为了让你们更能体会到 **Serverless** 的能力，我设计了下面几种简单的业务，实现这些业务甚至都不需要一个后端，只需要写一些函数，简单调用下数据库就能实现，还能得到CDN的加成。  
  
### 热门文章  
  
用 redis的 **Sorted Se**t（`ZINCRBY`）按时间窗口累计，例如：  
  
- `trending:2026-01-23` 以天为粒度  
  
- 再实现一个在读的时候按多个 key 合并  
  
  
然后首页/侧边栏就可以展示“今日热门/本周热门”。  
  
    
  
### 点赞/收藏/“拍手”  
    
  
把 `views` 换成 `likes`、`claps`，本质还是计数器。  
  
你甚至可以在同一套 API 里引入 `X-Action` 进行快速拓展。  
  
  
### 推荐系统  
  
当系统能够收集足够多的“阅读事件”，就可以产生推荐信号：  
  
- 文章热度  
- 同一时间段的共读  
- 标签热度变化  
  
---  
  
通过一些云函数，不搭建后端或者CMS系统，也能实现这么多功能，这也是 **Serverless（无服务）** 想要达成的事情  
  
## 结语：把“云原生”落到可运行的细节里  
  
很多人谈云计算会停留在概念层：弹性、按需、可伸缩。  
但当你真正动手做一个小功能时，你会发现云原生的关键是这些细节：  
  
- 把**状态**放到合适的地方（Redis/KV）  
- 把**治理**交给边缘（Firewall/CDN）  
- 让业务逻辑保持**最小**、**可替换**（Functions）  
- 在成本与一致性之间做清晰的权衡（缓存/批量/去重）  
  
  
这就是我在一个小小“阅读量”上得到的工程结论：  
  
**Serverless 不是“更少的服务器”，而是“更清晰的边界”。**