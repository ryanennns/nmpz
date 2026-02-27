export const StandardCompass = (props: { heading: number }) => {
    return (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-black/60 backdrop-blur-sm">
                <div className="absolute inset-2 rounded-full border border-white/15" />
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-semibold text-white">
                    N
                </div>
                <div className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-white/50">
                    E
                </div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/50">
                    S
                </div>
                <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[10px] text-white/50">
                    W
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="relative h-14 w-2.5"
                        style={{
                            transform: `rotate(${-props.heading}deg)`,
                            transformOrigin: '50% 50%',
                        }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 border-r-[4px] border-b-[22px] border-l-[4px] border-r-transparent border-b-red-500/90 border-l-transparent" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-t-[22px] border-r-[4px] border-l-[4px] border-t-slate-300/80 border-r-transparent border-l-transparent" />
                    </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-white/60" />
            </div>
        </div>
    );
};
