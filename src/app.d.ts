declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        email: string;
        role: 'owner' | 'tenant';
        displayName: string | null;
        contactUrl: string | null;
      } | null;
    }
  }
}

export {};
