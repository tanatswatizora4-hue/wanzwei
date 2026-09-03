import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wanzwei",
    short_name: "Wanzwei",
    description:
      "Wanzwei connects healthcare professionals with verified facilities for locum, contract, and permanent opportunities.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1B1463",
    theme_color: "#1B1463",
    id: "https://wanzwei.vercel.app/",
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
