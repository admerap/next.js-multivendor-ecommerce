"use client";

import { Play } from "lucide-react";
import { useState } from "react";

/**
 * YouTube embed behind a click-to-play preview: the third-party player (and its scripts) only loads
 * when the vendor asks for it. `url` is a validated youtube.com/embed link (lib/validations/product).
 */
export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const id = /\/embed\/([\w-]{6,20})/.exec(url)?.[1];
  const src = `${url}${url.includes("?") ? "&" : "?"}autoplay=1`;

  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-sunken">
      {playing ? (
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 size-full"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${title}`} className="group absolute inset-0 grid place-items-center">
          {id && <span aria-hidden className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url("https://i.ytimg.com/vi/${id}/hqdefault.jpg")` }} />}
          <span className="relative grid size-16 place-items-center rounded-full bg-primary text-on-primary shadow-primary transition-transform duration-(--dur-fast) group-hover:scale-105">
            <Play aria-hidden className="ml-1 size-7" strokeWidth={2.2} />
          </span>
        </button>
      )}
    </div>
  );
}
