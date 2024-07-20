"use client";
import { ActionButtons } from "@/widgets/action-buttons/ui";
import Image from "next/image";
import { useEffect, useState } from "react";

import useWebSocket, { ReadyState } from "react-use-websocket";

export default function Home() {
	const [theme, setTheme] = useState<string>();

	const { sendMessage, lastMessage, readyState, ...gg } = useWebSocket(
		"wss://localhost:8000",
	);

	console.log({ sendMessage, lastMessage, readyState, gg });

	useEffect(() => {
		const a = new URLSearchParams(Telegram.WebApp.initData);

		a.forEach((value, key) => {
			console.log({ value, key });
			if (key === "user") {
				console.log({ user: JSON.parse(value) });
			}
		});

		
	}, []);

	useEffect(() => {
		Telegram.WebApp.onEvent("themeChanged", () => {
			setTheme(Telegram.WebApp.colorScheme);
		});
	}, []);

	return (
		<main
			data-theme={theme ?? "dark"}
			className="flex min-h-screen flex-col items-center justify-between p-24 bg-background"
		>
			<div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
				<ActionButtons />
			</div>
		</main>
	);
}
