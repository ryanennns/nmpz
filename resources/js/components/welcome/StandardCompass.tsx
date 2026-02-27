const DIRECTIONS = [
    { label: 'N', deg: 0, cardinal: true },
    { label: 'NE', deg: 45, cardinal: false },
    { label: 'E', deg: 90, cardinal: true },
    { label: 'SE', deg: 135, cardinal: false },
    { label: 'S', deg: 180, cardinal: true },
    { label: 'SW', deg: 225, cardinal: false },
    { label: 'W', deg: 270, cardinal: true },
    { label: 'NW', deg: 315, cardinal: false },
] as const;

const TICK_INTERVAL = 15;
const TICKS_COUNT = 360 / TICK_INTERVAL; // 24
const PX_PER_DEG = 2.4;
const STRIP_WIDTH = 360 * PX_PER_DEG; // 864px

export const StandardCompass = ({ heading }: { heading: number }) => {
    const offset = -(((heading % 360) + 360) % 360) * PX_PER_DEG;

    return (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
            {/* Compass bar */}
            <div
                className="relative overflow-hidden rounded bg-black/50 backdrop-blur-sm"
                style={{
                    width: 360,
                    height: 32,
                    maskImage:
                        'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
                    WebkitMaskImage:
                        'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
                }}
            >
                <div
                    className="absolute top-0 h-full"
                    style={{
                        width: STRIP_WIDTH * 3,
                        transform: `translateX(${offset + 180 * PX_PER_DEG - STRIP_WIDTH}px)`,
                        willChange: 'transform',
                    }}
                >
                    {[0, 1, 2].map((copy) =>
                        DIRECTIONS.map((dir) => (
                            <span
                                key={`d-${copy}-${dir.deg}`}
                                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono leading-none ${
                                    dir.cardinal
                                        ? 'text-xs font-bold text-white'
                                        : 'text-[10px] font-medium text-white/50'
                                }`}
                                style={{
                                    left:
                                        copy * STRIP_WIDTH +
                                        dir.deg * PX_PER_DEG,
                                }}
                            >
                                {dir.label}
                            </span>
                        )),
                    )}
                    {[0, 1, 2].map((copy) =>
                        Array.from({ length: TICKS_COUNT }, (_, i) => {
                            const deg = i * TICK_INTERVAL;
                            const isCardinal = deg % 90 === 0;
                            const isIntercardinal =
                                deg % 45 === 0 && !isCardinal;
                            if (isCardinal || isIntercardinal) return null;
                            return (
                                <span
                                    key={`t-${copy}-${deg}`}
                                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20"
                                    style={{
                                        left:
                                            copy * STRIP_WIDTH +
                                            deg * PX_PER_DEG,
                                        height: deg % 30 === 0 ? 10 : 6,
                                        width: 1,
                                        backgroundColor: 'currentColor',
                                    }}
                                />
                            );
                        }),
                    )}
                </div>
            </div>

            {/* Center indicator */}
            <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-full">
                <div className="h-0 w-0 border-b-[6px] border-r-[5px] border-l-[5px] border-b-white border-r-transparent border-l-transparent" />
            </div>
        </div>
    );
};
