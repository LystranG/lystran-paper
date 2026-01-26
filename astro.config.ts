import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";
import { TOC_INFO } from "./src/config";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import mermaid from 'astro-mermaid';
import ensureAccessibleName from "./src/utils/rehype/ensureAccessibleName";
import convertHtmlImgToMarkdownImage from "./src/utils/remark/convertHtmlImgToMarkdownImage";
import rehypeUmamiOutboundLinks from "./src/utils/rehype/rehypeUmamiOutboundLinks";

import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import umami from "@yeskunall/astro-umami";
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel({
    webAnalytics: {
      enabled: false
    }
  }),
  prefetch: true,
  site: SITE.website,
  integrations: [sitemap({
    filter: page => SITE.showArchives || !page.endsWith("/archives"),
  }), mermaid({
    theme: 'forest',
    autoTheme: true,
    iconPacks: [
      {
        name: 'logos',
        loader: () => fetch('https://unpkg.com/@iconify-json/logos@1/icons.json').then(res => res.json())
      },
      {
        name: 'iconoir',
        loader: () => fetch('https://unpkg.com/@iconify-json/iconoir@1/icons.json').then(res => res.json())
      }
    ]
  }), react(), umami({
    id: "31c63cca-7a36-4dbe-a22b-9ed3377539b7",
    endpointUrl: "https://analytics.lystran.com",
    withPartytown: true
  }), partytown()],
  markdown: {
    remarkPlugins: [
      remarkMath,
      convertHtmlImgToMarkdownImage,
      [remarkToc, { heading: TOC_INFO.heading }], [remarkCollapse, { test: TOC_INFO.heading, summary: TOC_INFO.summary }]
    ],
    rehypePlugins: [
      rehypeKatex,
      ensureAccessibleName,
      [rehypeUmamiOutboundLinks, { site: SITE.website }],
    ],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
    // 允许优化 Markdown 中引用的远程图片（仅白名单域名）
    // 参考：https://docs.astro.build/en/guides/images/#authorizing-remote-images
    domains: [
      "astro.build",
      "github.com",
      "img.lystran.com",
      "i.ibb.co",
      "res.cloudinary.com",
      "user-images.githubusercontent.com",
    ],
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
    fonts: [
      {
        name: "Google Sans Code",
        cssVariable: "--font-google-sans-code",
        provider: fontProviders.google(),
        fallbacks: ["monospace"],
        weights: [300, 400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
    ],
  },
});
