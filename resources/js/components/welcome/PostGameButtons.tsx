const btn =
    'w-44 rounded bg-p1/10 px-4 py-2 text-sm text-p1/80 transition-colors hover:bg-p1/20 hover:text-p1';

type Props = {
    visible: boolean;
    onHome: () => void;
    onRequeue: () => void;
    onSummary: () => void;
};

export function PostGameButtons({
    visible,
    onHome,
    onRequeue,
    onSummary,
}: Props) {
    return (
        <div
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black transition-opacity duration-500 ${
                visible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
        >
            <button className={btn} onClick={onHome}>
                home
            </button>
            <button className={btn} onClick={onRequeue}>
                requeue
            </button>
            <button className={btn} onClick={onSummary}>
                summary
            </button>
        </div>
    );
}
