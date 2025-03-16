
import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const from = state?.from?.pathname || '/';

  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full mb-4">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Welcome to TheSet</h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to vote on setlists for your favorite artists' shows
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <Button 
              onClick={handleLogin}
              className="w-full bg-[#1DB954] hover:bg-[#1DB954]/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10 5.523 0 10-4.477 10-10 0-5.523-4.477-10-10-10zm4.586 14.424a.622.622 0 01-.858.205c-2.346-1.435-5.304-1.76-8.786-.964a.622.622 0 01-.277-1.215c3.809-.87 7.077-.496 9.713 1.116a.623.623 0 01.208.858zm1.223-2.722a.78.78 0 01-1.072.257c-2.687-1.652-6.786-2.13-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.519-.972c3.642-1.106 8.146-.569 11.234 1.327a.78.78 0 01.257 1.073zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.608z" />
                  </svg>
                  Continue with Spotify
                </span>
              )}
            </Button>
            
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don't want to log in yet?{' '}
              <Link to="/" className="text-primary hover:underline">
                Browse as guest
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
