export default function TaskProgressPanel({ task, autoProgress }) {
  const manual = Math.max(0, Math.min(100, Number(task?.progress ?? 0)));
  const estimate = Number(task?.estimatedHours ?? 0);
  const logged = Number(task?.loggedHours ?? 0);
  const remaining = estimate > 0 ? Math.max(0, estimate - logged) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">Progress</span>
        <span className="text-sm font-medium">{manual}%</span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded">
        <div className="h-2 bg-blue-600 rounded" style={{ width: `${manual}%` }} />
      </div>
      {typeof autoProgress === 'number' && (
        <div className="text-xs text-gray-600">Auto suggestion: {Math.round(autoProgress)}%</div>
      )}
      <div className="text-xs text-gray-700">
        {estimate > 0 ? (
          <span>Time: {logged}h logged / {estimate}h estimate{remaining !== null ? ` • ${remaining}h remaining` : ''}</span>
        ) : (
          <span>Time: {logged}h logged</span>
        )}
      </div>
    </div>
  );
}
