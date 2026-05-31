declare global {
  namespace App {
    interface Locals {
      admin: { identifier: string } | null;
    }
  }
}

export {};
