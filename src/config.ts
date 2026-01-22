export const SITE = {
  website: "https://www.lystran.com/",
  author: "Lystran",
  profile: "https://github.com/LystranG/",
  desc: "Lystran 的个人博客与数字花园。专注于后端开发技术、运维技术、AI技术、NAS、与开源工具折腾。在这里记录代码逻辑，沉淀生活思考，探索技术与人文的边界。 Lystran's personal blog and digital garden. Focusing on Backend, DevOps, AI, NAS & Open Source.",
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
    url: "https://github.com/LystranG/lystran-paper/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
