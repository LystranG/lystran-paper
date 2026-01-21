export const SITE = {
  website: "https://www.lystran.site/", // replace this with your deployed domain
  author: "Lystran",
  profile: "https://github.com/LystranG/",
  desc: "于 0 与 1 的逻辑丛林中，铺开一张素净的纸，记录代码背后的温度与光亮。",
  title: "Lystran Paper",
  ogImage: "avatar.png",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "提出修改",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
