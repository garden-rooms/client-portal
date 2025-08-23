import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import  Dashboard  from "./components/Dashboard";
import { ProfileSetup } from "./components/ProfileSetup";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      <Content />
    </div>
  );
}

function Content() {
  const currentUser = useQuery(api.users.getCurrentUser);

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0D333F]"></div>
      </div>
    );
  }

  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-[#0D333F] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Client Portal
              </h1>
              <p className="text-gray-600">Sign in to access your projects</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

   <Authenticated>
  {!currentUser?.profile ? (
    <ProfileSetup />
  ) : (
    <Dashboard />                      // ✅ no props
  )}
</Authenticated>
    </>
  );
}
