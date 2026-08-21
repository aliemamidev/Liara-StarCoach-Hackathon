import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
	return (
		<Html lang="fa" dir="rtl" suppressHydrationWarning>
			<Head>
				<meta
					property="og:image"
					content="https://media.liara.ir/liara-features/liara-opengraph.jpg"
				/>
			</Head>
			<body>

				{/* Google Tag Manager (noscript) */}
				<noscript>
				<iframe
					src="https://www.googletagmanager.com/ns.html?id=GTM-5C8DVF39"
					height="0"
					width="0"
					style={{ display: "none", visibility: "hidden" }}
				></iframe>
				</noscript>
				{/* End Google Tag Manager (noscript) */}

				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
