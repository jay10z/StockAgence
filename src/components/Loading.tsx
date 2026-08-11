export default function Loading({
  fullScreen = false,
  message = 'Chargement...',
}: {
  fullScreen?: boolean;
  message?: string;
}) {
  return (
    <div
      className={
        fullScreen
          ? 'min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4'
          : 'flex flex-col items-center justify-center py-16 gap-4'
      }
    >
      <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-lg text-slate-600 font-medium">{message}</p>
    </div>
  );
}
