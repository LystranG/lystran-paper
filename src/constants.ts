import type { Props } from "astro";
import type { GiscusProps } from "@giscus/react";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconJuejin from "@/assets/icons/IconJuejin.svg";
import IconQQ from "@/assets/icons/IconJuejin.svg";
import IconWechat from "@/assets/icons/IconJuejin.svg";
import IconWeibo from "@/assets/icons/IconJuejin.svg";
import IconWhatsapp from "@/assets/icons/IconJuejin.svg";
import { SITE } from "@/config";

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
}

export const SOCIALS: Social[] = [
  {
    name: "GitHub",
    href: "https://github.com/LystranG",
    linkTitle: `${SITE.author} on GitHub`,
    icon: IconGitHub,
  },
  {
    name: "Juejin",
    href: "https://juejin.cn/user/2052152412356427",
    linkTitle: `${SITE.author} on Juejin`,
    icon: IconJuejin,
  },
  {
    name: "Mail",
    href: "mailto:me@lystran.com",
    linkTitle: `Send an email to ${SITE.author}`,
    icon: IconMail,
  },
] as const;

export const SHARE_LINKS: Social[] = [
  {
    name: "QQ",
    href: "https://connect.qq.com/widget/shareqq/index.html?url=",
    linkTitle: `分享到 QQ`,
    icon: IconQQ,
  },
  {
    name: "WeChat",
    href: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=",
    linkTitle: `分享到 微信`,
    icon: IconWechat,
  },
  {
    name: "Weibo",
    href: "https://service.weibo.com/share/share.php?url=",
    linkTitle: `分享到 微博`,
    icon: IconWeibo,
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/?text=",
    linkTitle: `Share this post on WhatsApp`,
    icon: IconWhatsapp,
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: `Share this post via email`,
    icon: IconMail,
  },
] as const;

export const GISCUS: GiscusProps = {
  repo: "LystranG/lystran-paper",
  repoId: "R_kgDOQ9Vxjg",
  category: "Announcements",
  categoryId: "DIC_kwDOQ9Vxjs4C1O99",
  mapping: "pathname",
  reactionsEnabled: "1",
  emitMetadata: "0",
  inputPosition: "top",
  lang: "zh-CN",
  loading: "lazy",
  strict: "1",
};
