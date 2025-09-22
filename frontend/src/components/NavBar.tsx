import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/AuthProvider';
import UserIcon from '@/components/icons/UserIcon'; // Import the UserIcon
import HamburgerMenuIcon from '@/components/icons/HamburgerMenu'; // Import the HamburgerMenuIcon

const NavBar: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false); // State to manage menu open/close

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <nav className="w-full bg-white shadow-sm fixed top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" legacyBehavior>
              <a className="font-bold text-xl text-blue-600 hover:text-blue-700">
                <img src="/icons/Echo Logo.png" alt="Echo Therapy Logo" className="h-16 w-auto" />
              </a>
            </Link>
          </div>
          <div className="flex items-center space-x-3"> {/* Right-side navigation: Login/Signup and Hamburger */}
            {!user && !loading && (
              <>
                <Link href="/login" legacyBehavior>
                  <a className={`text-sm font-medium px-3 py-2 rounded-md
                    ${router.pathname === '/login' ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'}
                    hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  `}>
                    Login
                  </a>
                </Link>
                <Link href="/signup" legacyBehavior>
                  <a className={`text-sm font-medium px-3 py-2 rounded-md
                    ${router.pathname === '/signup' ? 'border border-blue-700 text-blue-700 bg-blue-50' : 'border border-blue-600 text-blue-600'}
                    hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  `}>
                    Sign Up
                  </a>
                </Link>
              </>
            )}

            {/* Hamburger menu button - always visible */}
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <span className="sr-only">Open main menu</span>
              <HamburgerMenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state. */}
      {isOpen && (
        <div id="mobile-menu" className="absolute top-16 left-0 w-full bg-white shadow-lg z-10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {user && !loading ? (
              <>
                <Link href="/profile" legacyBehavior>
                  <a onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${
                    router.pathname === '/profile' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                    Profile
                  </a>
                </Link>
                <Link href="/about-us" legacyBehavior>
                  <a onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${
                    router.pathname === '/about-us' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                    About Us
                  </a>
                </Link>
                <Link href="/faq" legacyBehavior>
                  <a onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${
                    router.pathname === '/faq' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                    FAQ
                  </a>
                </Link>
                <Link href="/contact" legacyBehavior>
                  <a onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${
                    router.pathname === '/contact' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                    Contact Us
                  </a>
                </Link>
                <button
                  onClick={() => { handleSignOut(); setIsOpen(false); }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50 hover:text-red-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              !loading && (
                <>
                  <Link href="/about-us" legacyBehavior>
                    <a onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${
                      router.pathname === '/about-us' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                    }`}>
                      About Us
                    </a>
                  </Link>
                  <Link href="/faq" legacyBehavior>
                    <a onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${
                      router.pathname === '/faq' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                    }`}>
                      FAQ
                    </a>
                  </Link>
                  <Link href="/contact" legacyBehavior>
                    <a onClick={() => setIsOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${
                      router.pathname === '/contact' ? 'text-blue-700 bg-blue-50' : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
                    }`}>
                      Contact Us
                    </a>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar; 