export default function EmailVerifiedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                            className="w-8 h-8 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">Email verified</h1>
                    <p className="text-gray-500 text-base leading-relaxed">
                        Your email address has been confirmed. You can now return to the app.
                    </p>
                </div>
            </div>
        </div>
    )
}
