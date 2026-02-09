export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Sin acceso</h1>
        <p className="mt-2 text-sm text-zinc-500">
          No tenés módulos habilitados. Contactá a tu administrador.
        </p>
      </div>
    </div>
  );
}
