import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useNear } from '@/hooks/useNear';

export const Navigation = () => {
  const { signedAccountId, signIn, signOut } = useNear();
  const [action, setAction] = useState<(() => void | Promise<void>) | null>(null);
  const [label, setLabel] = useState<string>('Loading...');

  useEffect(() => {
    if (!signedAccountId) {
      setAction(() => signIn);
      setLabel('Login');
      return;
    }

    setAction(() => signOut);
    setLabel(`Logout ${signedAccountId}`);
  }, [signedAccountId, signIn, signOut]);

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid">
        <Link href="/" passHref legacyBehavior>
          <a>
            <Image
              priority
              src="/near-logo.svg" 
              alt="NEAR"
              width={30}
              height={24}
              className="d-inline-block align-text-top"
            />
          </a>
        </Link>

        <div className="navbar-nav pt-1">
          <button
            className="btn btn-secondary"
            onClick={() => action && action()}
            disabled={!action}
          >
            {label}
          </button>
        </div>
      </div>
    </nav>
  );
};
