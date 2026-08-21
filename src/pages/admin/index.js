import AdminShell from "@/components/admin";
import { getSession } from "@/lib/auth";

export default function AdminPage({ session }) {
  return session ? <AdminShell session={session} /> : <AdminShell />;
}

export async function getServerSideProps({ req, res }) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  try {
    const session = await getSession(req);
    if (!session) {
      res.setHeader("Cache-Control", "no-store");
      return { props: { session: null } };
    }
    return {
      props: {
        session: {
          user: {
            id: session.user.id,
            email: session.user.email,
            phone: session.user.phone,
            name: session.user.name,
            role: session.user.role,
            lastLoginAt: session.user.lastLoginAt ? session.user.lastLoginAt.toISOString() : null,
          },
        },
      },
    };
  } catch (error) {
    console.error("Admin session check failed", error);
    return { props: { session: null } };
  }
}
