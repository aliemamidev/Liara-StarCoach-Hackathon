import AdminShell from "@/components/admin";
import { getSession } from "@/lib/auth";

export default function AdminPage({ session }) {
  return session ? <AdminShell session={session} /> : <AdminShell />;
}

export async function getServerSideProps({ req, res }) {
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
            name: session.user.name,
            role: session.user.role,
          },
        },
      },
    };
  } catch (error) {
    console.error("Admin session check failed", error);
    return { props: { session: null } };
  }
}
