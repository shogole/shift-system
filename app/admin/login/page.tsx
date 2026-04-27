import { loginAdmin } from '../actions'

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-80 shadow-2xl">
        <h1 className="text-xl font-bold text-brand-dark text-center mb-2">
          Kitchen Lab
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6">管理者ログイン</p>
        {searchParams.error && (
          <p className="text-red-500 text-sm text-center mb-4 bg-red-50 rounded-lg py-2">
            パスワードが違います
          </p>
        )}
        <form action={loginAdmin}>
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:border-brand-dark"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-brand-dark text-brand-gold font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  )
}
