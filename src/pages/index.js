import Head from "next/head";
import { ChatLayout } from "@/components/chat/chat-layout";

export default function ChatHomePage() {
  return (
    <>
      <Head>
        <title>دستیار هوشمند لیارا</title>
        <meta
          name="description"
          content="دستیار هوشمند فارسی لیارا"
        />
      </Head>
      <ChatLayout />
    </>
  );
}




