import { useState } from 'react';

const VIDEO_SOURCE = '/tissue_rbc_loop.mp4';
const POSTER_SOURCE = '/tissue_rbc_loop_poster.png';
const FLOW_DESCRIPTION = 'Animação em loop da microcirculação do tecido, renderizada pela câmera do Blender, com hemácias saindo da artéria e fluindo entre as células.';

export function TissueFlowAnimation() {
    const [videoFailed, setVideoFailed] = useState(false);
    const [posterFailed, setPosterFailed] = useState(false);

    return (
        <figure
            className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black"
            aria-labelledby="tissue-flow-animation-caption"
        >
            {videoFailed ? (
                <div
                    className="relative flex h-full w-full items-center justify-center bg-app-bg"
                    role="img"
                    aria-label={FLOW_DESCRIPTION}
                >
                    {!posterFailed && (
                        <img
                            src={POSTER_SOURCE}
                            alt=""
                            aria-hidden="true"
                            className="block h-full w-full object-contain"
                            onError={() => setPosterFailed(true)}
                        />
                    )}
                    {posterFailed && (
                        <p className="max-w-sm border border-app-border bg-app-surface p-4 text-center text-xs leading-relaxed text-text-secondary">
                            A visualização da microcirculação está temporariamente indisponível.
                        </p>
                    )}
                </div>
            ) : (
                <video
                    className="block h-full w-full object-contain"
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                    preload="auto"
                    poster={POSTER_SOURCE}
                    aria-label={FLOW_DESCRIPTION}
                    onError={() => setVideoFailed(true)}
                >
                    <source src={VIDEO_SOURCE} type="video/mp4" />
                    Seu navegador não oferece suporte à reprodução desta animação.
                </video>
            )}

            <figcaption id="tissue-flow-animation-caption" className="sr-only">
                {FLOW_DESCRIPTION}
            </figcaption>
        </figure>
    );
}
