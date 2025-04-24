export default function VerifyPage() {
    return (
        <div className="container flex h-screen flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
                We have sent you a verification link. Please check your email and click the link to verify your account.
            </p>
        </div>
    );
}