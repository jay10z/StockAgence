export function StockStatus({ quantity, minStock }: { quantity: number; minStock: number }) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
        Rupture
      </span>
    );
  }
  if (quantity <= minStock) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800">
        Stock bas
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
      Disponible
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
        Acceptée
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
        Refusée
      </span>
    );
  }
  return (
    <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800">
      En attente
    </span>
  );
}
