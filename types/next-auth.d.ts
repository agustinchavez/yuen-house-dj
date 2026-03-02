import "next-auth";

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
  }

  interface Session {
    user: User & {
      email: string;
      name?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}
